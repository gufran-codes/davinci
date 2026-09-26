import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "primer-conversation-")),
  "test.sqlite",
);
const { register } = await import("../src/server/auth");
const { createChild, saveSession, learnerFor, sessionById } =
  await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { converse, greeting, deliveredSpeech, conversationHistory } =
  await import("../src/server/conversation");
const { conversationTurn } = await import("../src/server/understanding");
const { seedChildren } = await import("../src/server/demo");
const { getQuestion, gradeQuestion } = await import("../src/lib/curriculum");
const { chooseDecision } = await import("../src/lib/learning");
const { understandLocally, spokenMath } =
  await import("../src/lib/conversation/intent");
const { all, one } = await import("../src/server/db");
const user = register(
  "Test Parent",
  `conversation-${randomUUID()}@test.local`,
  "safe-password-123",
);
function setup(target = "equivalent_fractions") {
  const child = createChild(user.id, {
    nickname: "Test",
    age: 9,
    grade: target === "adding_unlike" ? 5 : 4,
    goal: "Build confidence",
    subjects: ["Math", "English", "Science", "Social Studies"],
  });
  let s = startSession(child, "lesson", target);
  s.state = "TEACH";
  s.step = 3;
  s.question = getQuestion(target, 0);
  s.assistance = 1;
  s.decision = chooseDecision(learnerFor(child.id), target);
  s.decision.strategy = "symbolic_first";
  saveSession(s);
  s = greeting(child, s.id);
  function say(transcript: string) {
    s = converse(child, s.id, {
      requestId: randomUUID(),
      version: s.version,
      transcript,
      source: "text",
    });
    return s;
  }
  return {
    child,
    say,
    get session() {
      return sessionById(s.id);
    },
  };
}

test("children’s normal requests and spoken quantities are understood locally", () => {
  const q = getQuestion("generate_equivalent", 0);
  for (const [text, intent] of [
    ["Wait.", "wait"],
    ["Wait, why do we need one?", "why"],
    ["What does denominator mean?", "define"],
    ["I still don’t understand.", "confused"],
    ["Can you show me?", "show"],
    ["Can we try an easier one?", "easier"],
    ["I think I know.", "confidence"],
    ["Hey, can you hear me?", "rapport"],
    ["How are you?", "rapport"],
    ["What is your name?", "rapport"],
    ["Where do I start?", "hint"],
    ["Can you explain this?", "why"],
    ["You are stuck in the same loop.", "feedback"],
  ])
    assert.equal(understandLocally(text, q).intent, intent, text);
  assert.equal(spokenMath("I think it’s eight."), "8");
  assert.equal(spokenMath("two hundred and forty six"), "246");
  assert.equal(spokenMath("three quarters"), "3/4");
  assert.equal(
    understandLocally("I think it is 8 because I multiplied by two", q).answer,
    "8",
  );
});

test("review can return to teaching with a different visible approach", () => {
  const f = setup();
  let s = f.say("Finish for today");
  assert.equal(s.state, "SESSION_REVIEW");
  assert.ok(s.conversation?.cues.some((cue) => cue.visuals.length));
  s = f.say("Show me another way");
  assert.equal(s.state, "TEACH");
  assert.doesNotMatch(s.conversation!.text, /How did that feel/);
  assert.ok(s.conversation?.cues.some((cue) => cue.visuals.length));
  assert.match(s.conversation!.text, /change the approach|canvas/i);
});

test("natural rapport and learner feedback receive contextual educator responses", () => {
  const f = setup();
  let s = f.say("Hey, can you hear me?");
  assert.match(s.conversation!.text, /Yes, I can hear you/);
  assert.match(s.conversation!.text, new RegExp(s.question.prompt));
  const previous = s.decision.strategy;
  s = f.say("You are stuck in the same loop.");
  assert.notEqual(s.decision.strategy, previous);
  assert.match(s.conversation!.text, /repeating myself/);
});

test("social turns feel conversational without being graded as attempts", () => {
  const f = setup();
  let s = f.say("How are you?");
  assert.match(s.conversation!.spokenText!, /ready to learn with you/i);
  assert.equal(s.attempts, 0);
  s = f.say("What is your name?");
  assert.match(s.conversation!.spokenText!, /Da Vinci/i);
  assert.equal(s.attempts, 0);
  assert.equal(s.teaching?.reasoningPath.at(-1)?.signal, "social");
  assert.ok((s.teaching?.wordShare.student ?? 0) > 0);
  assert.ok((s.teaching?.wordShare.tutor ?? 0) > 0);
});

test("the screen keeps the problem while later speech only says the next move", () => {
  const f = setup();
  const prompt = f.session.question.prompt;
  assert.match(f.session.conversation!.spokenText!, new RegExp(prompt));
  const s = f.say("Give me a hint");
  assert.match(s.conversation!.text, new RegExp(prompt));
  assert.doesNotMatch(s.conversation!.spokenText!, new RegExp(prompt));
  assert.notEqual(s.conversation!.spokenText, s.conversation!.text);
});

test("supported success is followed by a fresh independent check", () => {
  const f = setup();
  let s = f.say("Give me a hint");
  const supportedQuestion = s.question.id;
  s = f.say(s.question.answer);
  assert.equal(s.state, "INDEPENDENT_PRACTICE");
  assert.equal(s.assistance, 0);
  assert.equal(s.decision.strategy, "retrieval_practice");
  assert.equal(
    s.teaching?.activeIndependentCheck?.sourceQuestionId,
    supportedQuestion,
  );
  assert.notEqual(s.question.id, supportedQuestion);
  assert.equal(
    s.teaching?.assistanceLedger.find(
      (entry) => entry.questionId === supportedQuestion,
    )?.supportedSuccess,
    true,
  );
  s = f.say(s.question.answer);
  assert.equal(
    s.teaching?.assistanceLedger.find(
      (entry) => entry.questionId === supportedQuestion,
    )?.independentlyVerified,
    true,
  );
});

test("a different explanation uses a low-stakes checkpoint before grading again", () => {
  const f = setup();
  const original = f.session.question.prompt;
  let s = f.say("Show me another way");
  assert.ok(s.teaching?.checkpoint);
  assert.equal(s.attempts, 0);
  assert.ok(!s.conversation!.text.includes(original));
  assert.ok(
    s.conversation?.cues.some(
      (cue) =>
        cue.action === "question" &&
        cue.label === s.teaching?.checkpoint?.prompt,
    ),
  );
  s = f.say("The shaded parts still look like the same amount");
  assert.equal(s.teaching?.checkpoint, undefined);
  assert.equal(s.attempts, 0);
  assert.match(s.conversation!.text, /original question/i);
  assert.match(s.conversation!.text, new RegExp(original));
});

test("a correct original answer during a teaching checkpoint still earns credit", () => {
  const f = setup();
  let s = f.say("Teach me another way");
  assert.ok(s.teaching?.checkpoint);
  const answer = s.question.answer;
  s = f.say(answer);
  assert.equal(s.teaching?.checkpoint, undefined);
  assert.equal(s.correct, 1);
  assert.equal(s.attempts, 1);
});

test("confusion changes representations, descends, then rebuilds upward", () => {
  const f = setup();
  let s = f.say("I don’t understand");
  assert.equal(s.decision.strategy, "visual_fraction_model");
  s = f.say("I still don’t understand");
  assert.equal(s.decision.strategy, "concrete_real_world_example");
  s = f.say("I still don’t get it");
  assert.equal(s.state, "REMEDIATION");
  assert.equal(s.teaching?.returnStack.length, 1);
  assert.notEqual(s.question.conceptId, "equivalent_fractions");
  const prerequisite = s.question.conceptId;
  s = f.say(s.question.answer);
  assert.equal(s.question.conceptId, "equivalent_fractions");
  assert.equal(s.teaching?.returnStack.length, 0);
  assert.equal(s.assistance, 1);
  assert.ok(learnerFor(f.child.id).states[prerequisite].assistedAttempts > 0);
});

test("several missing prerequisite levels are stored and recovered in order", () => {
  const f = setup("adding_unlike");
  let s = f.session;
  const skills = [s.question.conceptId];
  for (let depth = 0; depth < 3; depth++) {
    s = f.say("Can we try an easier one?");
    skills.push(s.question.conceptId);
  }
  assert.equal(new Set(skills).size, 4);
  assert.equal(s.teaching?.returnStack.length, 3);
  for (const id of skills.slice(0, -1).reverse()) {
    s = f.say(s.question.answer);
    assert.equal(s.question.conceptId, id);
  }
  assert.equal(s.teaching?.returnStack.length, 0);
});

test("seven hints track levels and move to a prerequisite without supplying target answer", () => {
  const f = setup("generate_equivalent");
  const q = f.session.question;
  for (let i = 1; i <= 6; i++) {
    const s = f.say("Give me a hint");
    assert.equal(s.teaching?.hintLevel, i);
    assert.equal(s.attempts, 0);
    assert.ok(!s.conversation?.text.includes(`answer is ${q.answer}`));
  }
  const s = f.say("Give me a hint");
  assert.equal(s.teaching?.signals.hintCount, 7);
  assert.equal(s.teaching?.returnStack.length, 1);
  assert.notEqual(s.question.conceptId, q.conceptId);
});

test("wait and clarification do not grade an answer or award mastery", () => {
  const f = setup();
  let s = f.say("Wait");
  assert.equal(s.conversation?.paused, true);
  assert.equal(s.attempts, 0);
  s = f.say("What does denominator mean?");
  assert.match(s.conversation!.text, /equal parts/);
  assert.equal(s.attempts, 0);
  s = f.say("Continue");
  assert.equal(s.conversation?.paused, false);
  assert.deepEqual(learnerFor(f.child.id).states, {});
});

test("interrupted receipts store only a delivered prefix, never the unheard tail", () => {
  const f = setup(),
    s = f.session,
    p = s.conversation!;
  const generated = p.spokenText ?? p.text;
  const prefix = generated.split(" ").slice(0, 6).join(" ");
  deliveredSpeech(f.child, s.id, {
    turnId: p.turnId,
    spokenText: prefix,
    interrupted: true,
  });
  const history = conversationHistory(f.child.id, s.id);
  assert.equal(history.at(-1)?.spoken_tutor_text, prefix);
  assert.equal(history.at(-1)?.interrupted, 1);
  assert.ok(!JSON.stringify(history).includes(generated));
  assert.throws(
    () =>
      deliveredSpeech(f.child, s.id, {
        turnId: p.turnId,
        spokenText: "invented speech",
        interrupted: true,
      }),
    /prefix/,
  );
  const other = setup();
  assert.throws(
    () =>
      deliveredSpeech(other.child, s.id, {
        turnId: p.turnId,
        spokenText: prefix,
        interrupted: true,
      }),
    /not found/,
  );
});

test("request replay is idempotent and stale competing turns cannot mutate evidence", () => {
  const f = setup(),
    s = f.session,
    input = {
      requestId: randomUUID(),
      version: s.version,
      transcript: s.question.answer,
      source: "text" as const,
    };
  const first = converse(f.child, s.id, input),
    again = converse(f.child, s.id, input);
  assert.equal(first.version, again.version);
  assert.equal(first.attempts, again.attempts);
  assert.throws(
    () => converse(f.child, s.id, { ...input, requestId: randomUUID() }),
    /lesson changed/,
  );
  assert.equal(
    all(
      "SELECT * FROM conversation_turns WHERE session_id=? AND request_id=?",
      s.id,
      input.requestId,
    ).length,
    1,
  );
});

test("reasoning raises confidence once while leaving mastery score untouched", () => {
  const f = setup(),
    before =
      learnerFor(f.child.id).states.equivalent_fractions?.masteryScore ?? 0.25;
  f.say("They cover the same amount because we multiply both counts by two");
  const first = learnerFor(f.child.id).states.equivalent_fractions;
  assert.equal(first.masteryScore, before);
  assert.equal(first.masteryConfidence, 0.06);
  f.say("They cover the same amount because we multiply both counts by two");
  assert.equal(
    learnerFor(f.child.id).states.equivalent_fractions.masteryConfidence,
    0.06,
  );
});

test("the three demo learners receive different policy, hint and canvas paths", () => {
  const children = seedChildren(user.id);
  const sessions = children.map((c) =>
    greeting(c, startSession(c, "lesson", "equivalent_fractions").id),
  );
  assert.equal(sessions[0].decision.strategy, "visual_fraction_model");
  assert.equal(sessions[1].decision.strategy, "symbolic_first");
  assert.ok(
    sessions[1].decision.strengthToLeverage?.includes("multiplication"),
  );
  assert.equal(sessions[2].question.conceptId, "compare_same_numerator");
  assert.equal(
    sessions[2].decision.misconceptionToTest,
    "denominator_magnitude",
  );
  const turns = sessions.map((s, i) =>
    converse(children[i], s.id, {
      requestId: randomUUID(),
      version: s.version,
      transcript: "Can you show me?",
      source: "text",
    }),
  );
  assert.notEqual(turns[0].conversation!.text, turns[2].conversation!.text);
  assert.notDeepEqual(turns[0].conversation!.cues, turns[2].conversation!.cues);
});

test("independent assessment removes scaffolds but preserves task data", () => {
  const f = setup("g4_math_data");
  const s = f.session;
  s.state = "INDEPENDENT_PRACTICE";
  s.assistance = 0;
  saveSession(s);
  const next = converse(f.child, s.id, {
    requestId: randomUUID(),
    version: s.version,
    transcript: "Continue",
    source: "text",
  });
  assert.ok(
    next.conversation!.cues.some((c) =>
      c.visuals.some((v) => v.type === "table"),
    ),
  );
});

test("writing uses relevant rubric evidence and does not rewrite the student’s work", () => {
  const q = getQuestion("g4_english_composition", 0);
  assert.equal(
    gradeQuestion(
      q,
      "A class garden helps us learn because we observe how plants grow.",
    ),
    true,
  );
  assert.equal(
    gradeQuestion(q, "I like pizza because the story was funny."),
    false,
  );
  const f = setup(q.conceptId);
  const s = f.say(
    "A class garden helps us learn because we observe how plants grow.",
  );
  assert.equal(s.correct, 1);
});

test("semantic adapter receives only delivered tutor context and cannot bypass policy", async () => {
  const f = setup(),
    s = f.session,
    p = s.conversation!;
  let called = false;
  const result = await conversationTurn(
    f.child,
    s.id,
    {
      requestId: randomUUID(),
      version: s.version,
      transcript: "Could you unpack that a little more?",
      source: "voice",
      heard: {
        turnId: p.turnId,
        spokenText: (p.spokenText ?? p.text).slice(0, 12).trimEnd(),
        interrupted: true,
      },
    },
    {
      understand: async (input) => {
        called = true;
        assert.equal(
          input.history.at(-1)?.spoken_tutor_text,
          (p.spokenText ?? p.text).slice(0, 12).trimEnd(),
        );
        assert.equal(input.state.targetSkill, s.question.conceptId);
        return { intent: "confused" };
      },
    },
  );
  assert.equal(called, true);
  assert.equal(result.decision.strategy, "visual_fraction_model");
  assert.equal(result.attempts, 0);
});

test("optional natural speech rendering stays behind the teaching policy verifier", async () => {
  const f = setup(),
    s = f.session;
  let receivedDraft = "";
  const result = await conversationTurn(
    f.child,
    s.id,
    {
      requestId: randomUUID(),
      version: s.version,
      transcript: "How are you?",
      source: "voice",
    },
    undefined,
    {
      render: async (input) => {
        receivedDraft = input.draft;
        assert.equal("transcript" in input, false);
        assert.equal(input.state.targetSkill, s.question.conceptId);
        return `The answer is ${s.question.answer}.`;
      },
    },
  );
  assert.ok(receivedDraft.length > 0);
  assert.doesNotMatch(
    result.conversation!.spokenText!,
    new RegExp(`the answer is ${s.question.answer}`, "i"),
  );
  assert.equal(result.conversation!.verification?.passed, false);
  assert.ok(result.conversation!.verification?.checks.includes("answer_leak"));
  const generated = one<{ generated_tutor_text: string }>(
    "SELECT generated_tutor_text FROM conversation_turns WHERE id=?",
    result.conversation!.turnId,
  );
  assert.equal(
    generated?.generated_tutor_text,
    result.conversation!.spokenText,
  );
});

test("finishing and returning persist real teaching outcomes", () => {
  const f = setup();
  f.say("I need a hint");
  let s = f.say(f.session.question.answer);
  s = f.say("Finish for today");
  assert.equal(s.state, "SESSION_REVIEW");
  s = f.say("A little clearer");
  assert.equal(s.state, "COMPLETE");
  assert.ok(s.completedAt);
  assert.ok(s.summary);
  const l = learnerFor(f.child.id);
  assert.ok(l.strategies.some((e) => e.successfulOutcomes > 0));
  assert.ok(l.states.equivalent_fractions.assistedAttempts > 0);
});
