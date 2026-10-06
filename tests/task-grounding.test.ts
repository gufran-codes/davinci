import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-grounding-")),
  "test.sqlite",
);
process.env.OPENAI_API_KEY = "";
const { register } = await import("../src/server/auth");
const { createChild, saveSession, learnerFor, saveLearner, sessionById } =
  await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { greeting, converse } = await import("../src/server/conversation");
const { conversationTurn } = await import("../src/server/understanding");
const { buildTeachingState } = await import("../src/server/provider");
const { getQuestion } = await import("../src/lib/curriculum");
const { chooseDecision, updateStrategy, initialState } =
  await import("../src/lib/learning");
const { applySupport } = await import("../src/lib/teaching/adaptive");
const { interpretTaskUtterance } =
  await import("../src/lib/conversation/interpretation");
const { responseQuality } = await import("../src/lib/conversation/grounding");
const { contentById } = await import("../src/lib/teaching/content");
const { skillContentSchema } = await import("../content/curriculum/schema");
const parent = register("QA", `${randomUUID()}@test.local`, "testing-password");
function fixture(target = "equivalent_fractions") {
  const child = createChild(parent.id, {
    nickname: "Test",
    age: 9,
    grade: 4,
    goal: "Build confidence",
    subjects: ["Math", "Science", "Social Studies", "English"],
  });
  let s = startSession(child, "lesson", target);
  s.question = getQuestion(target, 0);
  s.state = "TEACH";
  s.assistance = 1;
  s.decision = chooseDecision(learnerFor(child.id), target);
  saveSession(s);
  s = greeting(child, s.id);
  const say = (transcript: string) =>
    (s = converse(child, s.id, {
      requestId: randomUUID(),
      version: s.version,
      transcript,
      source: "voice",
    }));
  return {
    child,
    say,
    get session() {
      return sessionById(s.id);
    },
  };
}

test("interpretation uses the active step; ambiguous answers never alter mastery", () => {
  const f = fixture();
  assert.equal(
    interpretTaskUtterance("B because the same amount is shaded", f.session)
      .answer,
    f.session.question.choices![1],
  );
  const before = JSON.stringify(learnerFor(f.child.id));
  const unclear = f.say("A or B");
  assert.equal(unclear.attempts, 0);
  assert.equal(JSON.stringify(learnerFor(f.child.id)), before);
  assert.equal(
    unclear.teaching!.lastTurnTrace!.interpretation.needsClarification,
    true,
  );
  f.say("Walk me through this step by step");
  const s = f.session;
  assert.equal(interpretTaskUtterance("B", s).needsClarification, true);
  assert.equal(interpretTaskUtterance("two", s).answer, "2");
  const context = buildTeachingState(s, learnerFor(f.child.id), {
    grade: 4,
    age: 9,
  });
  assert.equal(
    (context.academicContext!.activeTask as { questionId: string }).questionId,
    s.question.id,
  );
  assert.ok(context.academicContext!.rubric);
  assert.ok(context.academicContext!.canvasActions);
});

test("a checked answer retains the input task when the next question is shown", () => {
  const f = fixture();
  const input = f.session.question;
  const next = f.say(input.answer);
  const trace = next.teaching!.lastTurnTrace!;
  assert.equal(trace.inputTask.questionId, input.id);
  assert.equal(trace.responsePlan!.task.questionId, next.question.id);
  assert.notEqual(
    trace.inputTask.questionId,
    trace.responsePlan!.task.questionId,
  );
  const context = buildTeachingState(next, learnerFor(f.child.id), {
    grade: 4,
    age: 9,
  });
  assert.equal(
    (context.academicContext!.studentInputTask as { questionId: string })
      .questionId,
    input.id,
  );
});

test("one regeneration repairs unrelated speech; failed repair keeps the grounded draft", async () => {
  for (const repairs of [true, false]) {
    const f = fixture();
    let calls = 0;
    const s = f.session;
    const next = await conversationTurn(
      f.child,
      s.id,
      {
        requestId: randomUUID(),
        version: s.version,
        transcript: "How are you?",
        source: "text",
      },
      undefined,
      {
        async render(input) {
          calls++;
          assert.equal(input.responsePlan!.task.questionId, s.question.id);
          if (calls === 2)
            assert.ok(
              input.correction?.checks.includes("unsupported_subject_content"),
            );
          return repairs && calls === 2
            ? input.draft
            : "Photosynthesis happens in chloroplasts. What can you predict about a volcano?";
        },
      },
    );
    assert.equal(calls, 2);
    assert.doesNotMatch(
      next.conversation!.spokenText!,
      /photosynthesis|chloroplast|volcano/i,
    );
    assert.equal(next.teaching!.lastTurnTrace!.quality!.usedFallback, !repairs);
    assert.equal(
      next.teaching!.recentTutorTurns!.at(-1)!.text,
      next.conversation!.spokenText,
    );
    assert.equal(next.attempts, 0);
  }
});

test("whole explanations remain available to the repetition guard after reload", () => {
  const f = fixture();
  const before = f.say("How are you?").conversation!.spokenText!;
  const next = f.say("Give me a hint");
  assert.ok(responseQuality(next, before).includes("repeated_explanation"));
  assert.ok(next.teaching!.recentTutorTurns!.length >= 3);
});

test("a paraphrased full-choice disclosure is caught before speaking", () => {
  const f = fixture("g4_social_studies_sources");
  assert.ok(
    responseQuality(
      f.session,
      "A historian should compare when and why each source was created and look for other records.",
    ).includes("answer_overlap"),
  );
  assert.ok(
    responseQuality(
      f.session,
      "Hello, I am Da Vinci. A historian should think about when and why each source was made. What should a historian do next?",
    ).includes("active_focus_changed"),
  );
  assert.ok(
    !responseQuality(f.session, f.session.conversation!.spokenText!).includes(
      "answer_overlap",
    ),
  );
});

test("ambiguous speech keeps the specific clarification instead of generating an answer", async () => {
  const f = fixture();
  const before = JSON.stringify(learnerFor(f.child.id));
  const s = f.session;
  let rendered = false;
  const next = await conversationTurn(
    f.child,
    s.id,
    {
      requestId: randomUUID(),
      version: s.version,
      transcript: "A or B",
      source: "voice",
    },
    undefined,
    {
      async render() {
        rendered = true;
        return "An invented answer.";
      },
    },
  );
  assert.equal(rendered, false);
  assert.equal(next.attempts, 0);
  assert.equal(JSON.stringify(learnerFor(f.child.id)), before);
  assert.match(next.conversation!.spokenText!, /which choice/i);
});

test("same fraction task selects different grounded methods from strategy evidence", () => {
  const states = [fixture(), fixture()];
  const chosen = states.map((f, index) => {
    const learner = learnerFor(f.child.id);
    const preferred = index === 0 ? "visual_fraction_model" : "symbolic_first";
    let evidence;
    for (let i = 0; i < 12; i++)
      evidence = updateStrategy(
        evidence,
        f.child.id,
        preferred,
        "Fractions",
        true,
        0.05,
        new Date(),
        "Math",
        "equivalent_fractions",
      );
    learner.strategies = [evidence!];
    learner.states.equivalent_fractions = {
      ...initialState(f.child.id, "equivalent_fractions"),
      masteryScore: 0.65,
    };
    if (index === 1)
      learner.states.multiplication_by_4 = {
        ...initialState(f.child.id, "multiplication_by_4"),
        masteryScore: 0.95,
        successfulIndependentAttempts: 5,
      };
    saveLearner(f.child.id, learner);
    const s = f.session;
    s.decision.strategy = s.decision.strategyId = "guided_questioning";
    applySupport(s, learner, f.child, "another", false);
    assert.match(s.decision.reason, /successful recent outcomes/);
    assert.equal(s.decision.strategyId, s.teaching!.supportPlan!.strategy);
    return s.teaching!.supportPlan!;
  });
  assert.notEqual(chosen[0].id, chosen[1].id);
  assert.notEqual(chosen[0].message, chosen[1].message);
});

for (const target of ["g4_science_matter", "g4_social_studies_sources"]) {
  test(`${target}: evidence task has valid choices, distinct support and a checked answer`, () => {
    const f = fixture(target);
    const initial = f.session;
    assert.equal(initial.question.choices!.length, 3);
    assert.equal(
      initial.question.choices!.filter((c) => c === initial.question.answer)
        .length,
      1,
    );
    const first = f.say("Teach me another way");
    const a = first.teaching!.supportPlan!;
    const second = f.say("I still don't understand");
    assert.notEqual(second.teaching!.supportPlan!.id, a.id);
    assert.doesNotMatch(
      second.conversation!.spokenText!,
      /numerator|denominator/,
    );
    assert.equal(second.attempts, 0);
    const answered = f.say(`My answer is ${second.question.answer}`);
    assert.ok(answered.attempts > 0);
    assert.equal(answered.teaching!.lastTurnTrace!.inputTask.skillId, target);
  });
}

test("choice schema rejects duplicate choices and answer keys absent from the options", () => {
  const content = structuredClone(contentById.g4_science_matter);
  content.questions[0].choices = ["same", "same"];
  assert.equal(skillContentSchema.safeParse(content).success, false);
  content.questions[0].choices = ["other", "different"];
  assert.equal(skillContentSchema.safeParse(content).success, false);
});

test("long choice labels and letters preserve grading values; a selection asks for reasoning", async () => {
  const f = fixture("g4_math_addition");
  const s = f.session;
  assert.equal(
    interpretTaskUtterance(s.question.choiceLabels![s.question.answer], s)
      .answer,
    s.question.answer,
  );
  const explained = interpretTaskUtterance(
    `${s.question.choiceLabels![s.question.answer].toLowerCase()} because I combined the hundreds, tens and ones.`,
    s,
  );
  assert.equal(explained.answer, s.question.answer);
  assert.ok(explained.reasoning);
  const next = await conversationTurn(f.child, s.id, {
    requestId: randomUUID(),
    version: s.version,
    source: "canvas",
    transcript: s.question.answer,
  });
  assert.equal(next.teaching!.awaitingReasoning, true);
  assert.equal(next.conversation!.teachingMove, "ask_reasoning");
  assert.equal(
    learnerFor(f.child.id).states[s.question.conceptId]
      .successfulIndependentAttempts,
    0,
  );
  assert.equal(
    learnerFor(f.child.id).states[s.question.conceptId].evidence.at(-1)!
      .outcome,
    "recognition_success",
  );
});

test("spoken option aliases earn recognition credit rather than independent mastery", () => {
  const f = fixture("g4_math_addition");
  const index = f.session.question.choices!.indexOf(f.session.question.answer);
  const next = f.say(`Option ${String.fromCharCode(65 + index)}`);
  assert.equal(next.teaching!.awaitingReasoning, true);
  assert.equal(
    learnerFor(f.child.id).states[next.question.conceptId].evidence.at(-1)!
      .outcome,
    "recognition_success",
  );
});

test("writing options are scaffolds; choosing a model sentence never grades writing", async () => {
  const f = fixture("g4_english_composition");
  const s = f.session;
  const before = JSON.stringify(learnerFor(f.child.id));
  const next = await conversationTurn(f.child, s.id, {
    requestId: randomUUID(),
    version: s.version,
    source: "canvas",
    transcript: s.question.answer,
  });
  assert.equal(next.attempts, 0);
  assert.equal(JSON.stringify(learnerFor(f.child.id)), before);
  assert.ok(next.assistance >= 2);
  assert.match(next.conversation!.spokenText!, /own words/);
  assert.equal(
    interpretTaskUtterance(
      "The garden helps us learn because we can measure the plants each week.",
      next,
      "text",
    ).intent,
    "answer",
  );
});
