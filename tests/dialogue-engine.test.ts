import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { UnderstoodTurn } from "../src/lib/conversation/intent";
import type { DialogueMemory } from "../src/lib/conversation/student-dialogue";
import type {
  ConversationInterpreter,
  ConversationSpeaker,
} from "../src/server/understanding";

process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-dialogue-")),
  "test.sqlite",
);
process.env.OPENAI_API_KEY = "";
const { register } = await import("../src/server/auth");
const { createChild, saveSession, sessionById, learnerFor } =
  await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { converse, greeting, deliveredSpeech } =
  await import("../src/server/conversation");
const { conversationTurn } = await import("../src/server/understanding");
const { interpretStudentTurn, validateDialogue } =
  await import("../src/lib/conversation/student-dialogue");
const { responsePlan, responseQuality } =
  await import("../src/lib/conversation/grounding");
const { buildTeachingState } = await import("../src/server/provider");
const { getQuestion } = await import("../src/lib/curriculum");
const { chooseDecision } = await import("../src/lib/learning");
const { saveControls } = await import("../src/server/learning-controls");
const { explanationStructure } =
  await import("../src/lib/teaching/explanation-structure");
const parent = register(
  "Test",
  `${randomUUID()}@test.local`,
  "testing-password",
);
function setup(skill = "equivalent_fractions") {
  const grade = Number(/^g(\d+)_/.exec(skill)?.[1] ?? 4);
  const child = createChild(parent.id, {
    nickname: "Test",
    age: grade + 5,
    grade,
    goal: "Learn",
    subjects: ["Math", "Science", "English", "Social Studies"],
  });
  let s = startSession(child, "lesson", skill);
  s.question = getQuestion(skill, 0);
  s.state = "TEACH";
  s.assistance = 0;
  s.decision = chooseDecision(learnerFor(child.id), skill);
  saveSession(s);
  s = greeting(child, s.id);
  const input = (transcript: string) => ({
    requestId: randomUUID(),
    version: sessionById(s.id).version,
    transcript,
    source: "text" as const,
  });
  return {
    child,
    id: s.id,
    input,
    get session() {
      return sessionById(s.id);
    },
    say: (text: string, understood?: UnderstoodTurn) =>
      converse(child, s.id, input(text), understood),
    turn: (
      text: string,
      interpreter?: ConversationInterpreter,
      speaker?: ConversationSpeaker,
    ) => conversationTurn(child, s.id, input(text), interpreter, speaker),
  };
}
const why = "Why do we multiply both counts by the same number?";

test("atomic-number help teaches particle roles without copying the problem or changing the task", () => {
  const f = setup("g10_science_atoms");
  const original = f.session.question;
  const first = f.say("give me a hint");
  assert.match(first.conversation!.spokenText!, /protons|Atomic number/i);
  assert.doesNotMatch(
    first.conversation!.spokenText!,
    /what.*changed|what do you notice/i,
  );
  assert.equal(first.question.prompt, original.prompt);
  const shown = f.say("Can you show me?");
  const atom = shown.conversation!.canvasActions!.find(
    (a) => a.type === "showAtomModel",
  );
  assert.ok(
    atom &&
      atom.protons === 8 &&
      atom.electrons === null &&
      atom.neutrons === null,
  );
  assert.ok(
    !shown.conversation!.canvasActions!.some(
      (a) => a.type === "drawDiagramNode",
    ),
  );
  assert.equal(shown.attempts, 0);
  const worked = f.say("Please use a separate worked example");
  const example = worked.teaching!.dialogue!.plan!.example!;
  assert.match(example.prompt, /atomic number/);
  assert.notEqual(example.answer, original.answer);
  assert.doesNotMatch(example.prompt, /isotopes|reactivity/);
  assert.equal(worked.question.prompt, original.prompt);
});

test("a conversational tangent is answered without grading, forcing a quiz or changing the pending task", async () => {
  const f = setup();
  f.say("Show me another way");
  const before = f.session.question;
  const speech =
    "Blue light scatters more strongly than red light in Earth's atmosphere. That scattered light reaches your eyes from many directions, making the daytime sky look blue.";
  const next = await f.turn("Why is the sky blue?", undefined, {
    render: async (input) => {
      assert.equal(input.responsePlan!.dialogue!.mode, "tangent");
      assert.equal(input.responsePlan!.requiredQuestion, undefined);
      return speech;
    },
  });
  assert.equal(next.conversation!.spokenText, speech);
  assert.equal(next.question.id, before.id);
  assert.equal(next.attempts, 0);
  assert.equal(next.conversation!.canvasActions!.length, 0);
});

test("a generated teaching note is selected from final speech and stale turn writers cannot replace it", async () => {
  const f = setup();
  const note =
    "Both counts change because every piece is split, including the shaded pieces.";
  const next = await f.turn(why, undefined, {
    render: async () => ({
      speech: note,
      teachingNote: note,
      visualDirection: null,
    }),
  });
  const action = next.conversation!.canvasActions!.find(
    (a) => a.id === "teaching-note",
  );
  assert.ok(action?.type === "writeText" && action.text === note);
  const { replaceTutorSpeech } = await import("../src/server/conversation");
  const newer = f.say("Thanks");
  const stale = replaceTutorSpeech(f.child, f.id, {
    turnId: next.conversation!.turnId,
    version: next.version,
    spokenText: note,
    teachingNote: note,
  });
  assert.equal(stale.version, newer.version);
  assert.ok(
    !stale.conversation!.canvasActions!.some((a) => a.id === "teaching-note"),
  );
});

test("compound answer and question survive local extraction, one assessment and reload", () => {
  const f = setup();
  const q = f.session.question;
  const text = `${q.answer}, but ${why}`;
  const parsed = interpretStudentTurn(text, f.session);
  assert.equal(parsed.answer, q.answer);
  assert.equal(parsed.dialogue!.request!.text, why);
  const next = f.say(text);
  assert.equal(next.attempts, 1);
  assert.equal(next.correct, 1);
  assert.notEqual(next.question.id, q.id);
  assert.equal(next.conversation!.canAnswer, true);
  assert.equal(responsePlan(next).dialogue!.focusQuestion.id, q.id);
  assert.equal(responsePlan(next).dialogue!.mode, "direct_explanation");
  assert.equal(next.teaching!.dialogue!.gaps[0].status, "explained");
  assert.match(next.conversation!.spokenText!, /same|amount|multiply/i);
  assert.doesNotMatch(
    next.conversation!.spokenText!,
    /say.*continue|why.*choose/i,
  );
  assert.equal(f.session.teaching!.dialogue!.plan!.focusQuestion.id, q.id);
});

test("a semantic pass preserves a literal answer while adding a conceptual gap", async () => {
  const f = setup();
  const q = f.session.question;
  const transcript = `${q.answer}, but ${why}`;
  let called = false;
  const next = await f.turn(
    transcript,
    {
      async understand() {
        called = true;
        return {
          intent: "why",
          dialogue: {
            request: {
              kind: "question",
              text: why,
              evidence: why,
              reference: "current",
            },
            gap: {
              description: "Why both counts change together",
              evidence: why,
            },
          },
        };
      },
    },
    {
      async render(input) {
        assert.equal(input.responsePlan!.answeredTask!.answer, q.answer);
        assert.equal(input.responsePlan!.dialogue!.focusQuestion.id, q.id);
        assert.equal(
          input.responsePlan!.task.questionId,
          input.state.academicContext!.activeTask &&
            (input.state.academicContext!.activeTask as { questionId: string })
              .questionId,
        );
        return input.draft;
      },
    },
  );
  assert.ok(called);
  assert.equal(next.attempts, 1);
  assert.equal(next.correct, 1);
});

test("understanding one part and asking about another is not an answer attempt", async () => {
  const f = setup();
  const transcript =
    "I understand equal pieces, but not why the whole stays the same.";
  const before = JSON.stringify(learnerFor(f.child.id));
  const next = await f.turn(transcript, {
    async understand() {
      return {
        intent: "why",
        dialogue: {
          understood: {
            description: "Equal-sized pieces",
            evidence: "I understand equal pieces",
          },
          gap: {
            description: "The unchanged whole",
            evidence: "not why the whole stays the same",
          },
          request: {
            kind: "explain",
            text: "Explain why the whole stays fixed",
            evidence: transcript,
            reference: "current",
          },
        },
      };
    },
  });
  assert.equal(next.attempts, 0);
  assert.equal(JSON.stringify(learnerFor(f.child.id)), before);
  assert.equal(
    next.teaching!.dialogue!.gaps[0].understood,
    "Equal-sized pieces",
  );
});

test("direct teaching persists across reloads, refuses extra quizzes, and remains assisted", async () => {
  const f = setup();
  let next = f.say(
    "I don't know. Please explain directly instead of asking another question.",
  );
  assert.equal(next.teaching!.dialogue!.preference, "explain");
  assert.equal(next.teaching!.checkpoint, undefined);
  assert.ok(next.assistance > 0);
  assert.doesNotMatch(next.conversation!.spokenText!, /\?/);
  next = await f.turn("I still don't understand", undefined, {
    async render(input) {
      return `${input.draft} What do you notice?`;
    },
  });
  assert.equal(next.teaching!.lastTurnTrace!.quality!.usedFallback, true);
  assert.ok(
    next.teaching!.lastTurnTrace!.quality!.checks.includes("unrequested_quiz"),
  );
  assert.doesNotMatch(next.conversation!.spokenText!, /\?/);
  const original = next.question.id;
  next = f.say(next.question.answer);
  assert.notEqual(next.question.id, original);
  assert.equal(
    learnerFor(f.child.id).states.equivalent_fractions
      .successfulIndependentAttempts,
    0,
  );
});

test("two unsuccessful explanations change to a separate worked example", () => {
  const f = setup();
  f.say("I don't know. Explain directly without asking questions.");
  f.say("I still don't understand");
  const next = f.say("I still don't understand");
  const memory = next.teaching!.dialogue!;
  assert.equal(memory.gaps.length, 1);
  assert.equal(
    memory.explanations.filter((entry) => entry.outcome === "not_helpful")
      .length,
    2,
  );
  assert.equal(memory.plan!.mode, "worked_example");
  assert.notEqual(memory.plan!.example!.prompt, next.question.prompt);
  assert.notEqual(memory.plan!.example!.answer, next.question.answer);
  assert.ok(
    next.conversation!.canvasActions!.some(
      (a) =>
        a.type === "writeText" &&
        a.id === "dialogue-example" &&
        `${memory.plan!.example!.prompt} ${memory.plan!.example!.explanation}`.includes(
          a.text,
        ),
    ),
  );
  assert.equal(next.attempts, 0);
});

test("a correct answer alone does not resolve a reported conceptual gap", () => {
  const f = setup();
  f.say("Why does the whole stay the same?");
  let next = f.say(f.session.question.answer);
  assert.equal(next.teaching!.dialogue!.gaps[0].status, "explained");
  const before = JSON.stringify(learnerFor(f.child.id));
  next = f.say("Now I understand");
  assert.equal(next.teaching!.dialogue!.gaps[0].status, "resolved");
  assert.equal(next.teaching!.dialogue!.activeGapId, undefined);
  assert.equal(JSON.stringify(learnerFor(f.child.id)), before);
});

test("a tangent retains the active gap, task and teaching preference", () => {
  const f = setup();
  f.say("Explain directly why the whole stays the same.");
  const before = f.session;
  const next = f.say("Random question: why is the sky blue?");
  assert.equal(next.question.id, before.question.id);
  assert.equal(
    next.teaching!.dialogue!.activeGapId,
    before.teaching!.dialogue!.activeGapId,
  );
  assert.equal(next.teaching!.dialogue!.plan!.mode, "tangent");
  assert.equal(next.attempts, 0);
  const returned = f.say(
    "In that earlier example, what does the whole represent?",
  );
  assert.equal(returned.teaching!.dialogue!.plan!.mode, "analogy_repair");
  assert.equal(
    returned.teaching!.dialogue!.plan!.focusQuestion.id,
    before.question.id,
  );
});

test("an earlier gap can be selected by its persisted identity, never a fabricated identity", async () => {
  const f = setup();
  f.say("Why does the whole stay fixed?");
  const gap = f.session.teaching!.dialogue!.gaps[0];
  const transcript = "Back to that earlier example, why does it work?";
  const next = await f.turn(transcript, {
    async understand() {
      return {
        intent: "why",
        dialogue: {
          request: {
            kind: "analogy_repair",
            text: transcript,
            evidence: transcript,
            reference: "previous",
            gapId: gap.id,
          },
        },
      };
    },
  });
  assert.equal(next.teaching!.dialogue!.plan!.gapId, gap.id);
});

test("unsupported evidence cannot create a preference or a student fact", () => {
  const parsed = validateDialogue(
    {
      preference: { style: "explain", evidence: "Explain directly" },
      gap: { description: "Cannot subtract", evidence: "I cannot subtract" },
    },
    "hello",
  );
  assert.equal(parsed!.preference, undefined);
  assert.equal(parsed!.gap, undefined);
});

test("a model cannot invent an answer or grade a conceptual question", async () => {
  const f = setup();
  const before = JSON.stringify(learnerFor(f.child.id));
  const next = await f.turn(why, {
    async understand() {
      return {
        intent: "answer",
        answer: f.session.question.answer,
        dialogue: { answerEvidence: "I choose the right answer" },
      };
    },
  });
  assert.equal(next.attempts, 0);
  assert.equal(JSON.stringify(learnerFor(f.child.id)), before);
});

test("clarification and no-question explanation modes stay distinct", () => {
  const f = setup();
  const next = f.say("A or B");
  assert.equal(next.teaching!.dialogue!.plan!.mode, "clarification");
  assert.equal(next.attempts, 0);
  assert.match(next.conversation!.spokenText!, /which choice/i);
});

test("guided substep plus why-question checks only that step and explains the original step", () => {
  const f = setup();
  f.say("Walk me through this step by step");
  const before = f.session;
  const next = f.say("2, but why do we split the pieces?");
  assert.equal(next.attempts, 0);
  assert.equal(
    next.teaching!.guidedPractice!.stepIndex,
    before.teaching!.guidedPractice!.stepIndex + 1,
  );
  assert.ok(next.teaching!.dialogue!.plan!.focusStep);
  assert.doesNotMatch(next.conversation!.spokenText!, /\?/);
});

test("persisted dialogue records only delivered speech, not an interrupted tail", () => {
  const f = setup();
  const input = { ...f.input(why), source: "voice" as const };
  const next = converse(f.child, f.id, input);
  const p = next.conversation!;
  assert.equal(next.teaching!.dialogue!.explanations.at(-1)!.deliveredText, "");
  const prefix = p.spokenText!.split(" ").slice(0, 5).join(" ");
  deliveredSpeech(f.child, f.id, {
    turnId: p.turnId,
    spokenText: prefix,
    interrupted: true,
  });
  assert.equal(
    f.session.teaching!.dialogue!.explanations.at(-1)!.deliveredText,
    prefix,
  );
  const state = buildTeachingState(f.session, learnerFor(f.child.id), f.child);
  assert.ok(state.academicContext!.dialogueMemory);
});

test("idempotent requests and stale writers cannot append or resolve gaps twice", () => {
  const f = setup();
  const input = f.input(why);
  const next = converse(f.child, f.id, input);
  const again = converse(f.child, f.id, input);
  assert.equal(
    JSON.stringify(again.teaching!.dialogue),
    JSON.stringify(next.teaching!.dialogue),
  );
  assert.throws(
    () =>
      converse(f.child, f.id, {
        ...input,
        requestId: randomUUID(),
        transcript: "Now I understand",
      }),
    /lesson changed/,
  );
  assert.equal(f.session.teaching!.dialogue!.gaps[0].status, "explained");
});

test("dialogue memory remains bounded and private to its session", () => {
  const f = setup();
  for (let i = 0; i < 14; i++) f.say(`Why does number ${i} matter?`);
  assert.ok(f.session.teaching!.dialogue!.gaps.length <= 8);
  assert.ok(f.session.teaching!.dialogue!.explanations.length <= 12);
  assert.equal(setup().session.teaching!.dialogue!.gaps.length, 0);
});

test("no-question preference can be explicitly changed back to guided help", () => {
  const f = setup();
  f.say("Just explain without asking questions.");
  f.say("Guide me with questions instead.");
  const next = f.say("Give me a hint");
  assert.equal(next.teaching!.dialogue!.preference, "guide");
  assert.equal(next.teaching!.dialogue!.plan!.mode, "hint");
  assert.notEqual(responsePlan(next).dialogue!.questionPolicy, "none");
});

test("answer access still blocks a reveal after a direct-teaching preference", () => {
  const f = setup();
  f.say("Just explain without asking questions.");
  saveControls(f.child.id, { policy: "disabled", minimumAttempts: 3 });
  const next = f.say("Show me the answer");
  assert.equal(next.teaching!.revealedAnswer, undefined);
  assert.equal(next.attempts, 0);
  assert.ok(
    !next.conversation!.spokenText!.includes(
      `The answer is ${next.question.answer}`,
    ),
  );
});

test("compound letter choices retain recognition-only credit", () => {
  const f = setup("g4_math_addition");
  const q = f.session.question;
  const letter = String.fromCharCode(65 + q.choices!.indexOf(q.answer));
  const next = f.say(`${letter}, but why do we add by place value?`);
  assert.equal(next.correct, 1);
  assert.equal(next.conversation!.assessment!.responseMode, "selected");
  assert.equal(
    learnerFor(f.child.id).states[q.conceptId].evidence.at(-1)!.outcome,
    "recognition_success",
  );
});

test("a wrong answer plus question is assessed once and leaves no hidden support checkpoint", () => {
  const f = setup();
  const q = f.session.question;
  const wrong = q.choices!.find((choice) => choice !== q.answer)!;
  const next = f.say(`${wrong}, but ${why}`);
  assert.equal(next.attempts, 1);
  assert.equal(next.correct, 0);
  assert.equal(next.teaching!.checkpoint, undefined);
  assert.equal(next.teaching!.dialogue!.plan!.focusQuestion.id, q.id);
  const corrected = f.say(next.question.answer);
  assert.equal(corrected.attempts, 2);
  assert.equal(corrected.correct, 1);
});

test("provider failure preserves compound meaning and the safe explanation", async () => {
  const f = setup();
  const next = await f.turn(`${f.session.question.answer}, but ${why}`, {
    async understand() {
      throw new Error("Synthetic provider unavailable");
    },
  });
  assert.equal(next.correct, 1);
  assert.equal(next.teaching!.lastTurnTrace!.interpretationSource, "fallback");
  assert.equal(next.teaching!.dialogue!.plan!.request, why);
});

test("rejecting a direct explanation changes its mechanism, not just its wording", () => {
  const f = setup();
  const first = f.say(`Just explain directly. ${why}`);
  const next = f.say("I still don't understand");
  const before = first.teaching!.dialogue!.plan!.structure!;
  const after = next.teaching!.dialogue!.plan!.structure!;
  assert.notEqual(after.mechanism, before.mechanism);
  assert.ok(
    next.teaching!.dialogue!.plan!.failedMechanisms.includes(before.mechanism),
  );
  assert.ok(after.relationship && after.mappings.length && after.boundary);
  assert.notEqual(
    next.conversation!.spokenText,
    first.conversation!.spokenText,
  );
});

test("a new problem's difficulty does not mark an older explanation as failed", () => {
  const f = setup();
  f.say(why);
  const old = f.session.teaching!.dialogue!.gaps[0];
  f.say(f.session.question.answer);
  const next = f.say("I don't understand this new question");
  assert.equal(
    next.teaching!.dialogue!.gaps.find((gap) => gap.id === old.id)!.status,
    "explained",
  );
  assert.equal(next.teaching!.dialogue!.explanations[0].outcome, "unconfirmed");
  assert.equal(
    next.teaching!.dialogue!.gaps.at(-1)!.question.id,
    next.question.id,
  );
});

test("unheard speech is not marked as a failed explanation", () => {
  const f = setup();
  converse(f.child, f.id, { ...f.input(why), source: "voice" });
  const next = f.say("I still don't understand");
  assert.equal(next.teaching!.dialogue!.explanations[0].outcome, "unconfirmed");
});

test("the interpreter receives the newest delivery receipt rather than a stale snapshot", async () => {
  const f = setup();
  const first = converse(f.child, f.id, { ...f.input(why), source: "voice" });
  const prefix = first
    .conversation!.spokenText!.split(" ")
    .slice(0, 5)
    .join(" ");
  let observed = false;
  await conversationTurn(
    f.child,
    f.id,
    {
      ...f.input("I still don't understand"),
      heard: {
        turnId: first.conversation!.turnId,
        spokenText: prefix,
        interrupted: true,
      },
    },
    {
      async understand(input) {
        const memory = input.state.academicContext!
          .dialogueMemory as DialogueMemory;
        assert.equal(memory!.explanations[0].deliveredText, prefix);
        observed = true;
        return { intent: "confused" };
      },
    },
  );
  assert.ok(observed);
});

test("a why-question is still answered at the lesson review boundary", () => {
  const f = setup();
  const s = f.session;
  s.step = 20;
  saveSession(s);
  const next = f.say(`${s.question.answer}, but ${why}`);
  assert.equal(next.state, "SESSION_REVIEW");
  assert.equal(next.correct, 1);
  assert.match(next.conversation!.spokenText!, /counts must change together/);
  assert.equal(next.teaching!.dialogue!.plan!.focusQuestion.id, s.question.id);
});

test("algebra explanations map the unknown, known groups, operation and equality explicitly", () => {
  const q = getQuestion("g7_math_two_step_equations", 0);
  const balance = explanationStructure(q, "balance");
  const undo = explanationStructure(q, "undo");
  const substitution = explanationStructure(q, "substitution-check");
  assert.equal(
    new Set([balance.mechanism, undo.mechanism, substitution.mechanism]).size,
    3,
  );
  assert.match(
    balance.mappings.find((item) => item.representation === "x")!.meaning,
    /unknown.*one.*group/,
  );
  assert.equal(balance.mappings.length, 4);
  assert.match(balance.steps[0], /both equal totals/);
  assert.match(substitution.steps[0], /proposed value/);
  assert.match(balance.boundary, /Do not compute or disclose/);
});

test("fraction alternatives change the actual relationship used to explain invariance", () => {
  const q = getQuestion("equivalent_fractions", 0);
  const methods = ["split-whole", "scale-both", "regroup"].map((method) =>
    explanationStructure(q, method),
  );
  assert.equal(new Set(methods.map((method) => method.mechanism)).size, 3);
  assert.match(methods[1].steps.join(" "), /equals one/);
  assert.match(methods[2].steps.join(" "), /without eating or adding/);
  assert.ok(methods.every((method) => method.mappings.length === 4));
});

test("a tangent does not discard the pending observation checkpoint", () => {
  const f = setup();
  f.say("Teach me another way");
  const checkpoint = f.session.teaching!.checkpoint;
  assert.ok(checkpoint);
  const next = f.say("Random question: why is the sky blue?");
  assert.deepEqual(next.teaching!.checkpoint, checkpoint);
  assert.equal(next.question.id, checkpoint.questionId);
  assert.equal(next.attempts, 0);
});

test("exhausted explanations admit the limit instead of recycling a rejected method", () => {
  const f = setup();
  f.say(`Explain directly. ${why}`);
  for (let i = 0; i < 12; i++) f.say("I still don't understand");
  const plan = f.session.teaching!.dialogue!.plan!;
  assert.equal(plan.approach, "locate-gap");
  assert.match(
    f.session.conversation!.spokenText!,
    /missing connection|exact word or step/,
  );
  assert.equal(f.session.attempts, 0);
});

test("correct spoken option advances and acknowledges the selected option without a click", () => {
  const f = setup("g4_math_addition");
  const q = f.session.question;
  const letter = String.fromCharCode(65 + q.choices!.indexOf(q.answer));
  const next = converse(f.child, f.id, {
    ...f.input(`option ${letter}`),
    source: "voice",
  });
  assert.equal(next.correct, 1);
  assert.notEqual(next.question.prompt, q.prompt);
  assert.match(next.conversation!.spokenText!, /right|correct/i);
  assert.equal(next.conversation!.assessment!.optionLabel, letter);
  assert.ok(next.conversation!.spokenText!.includes(next.question.prompt));
  assert.ok(!next.conversation!.spokenText!.includes(q.prompt));
});

test("correct option keywords work even with a pending teaching checkpoint", () => {
  const f = setup("g4_science_matter");
  f.say("Teach me another way");
  const q = f.session.question;
  const next = converse(f.child, f.id, {
    ...f.input(q.choiceLabels![q.answer]),
    source: "voice",
  });
  assert.equal(next.correct, 1);
  assert.notEqual(next.question.prompt, q.prompt);
});

test("simple success keeps its acknowledgement without a paid rewrite; guard still rejects missing acknowledgement", async () => {
  const f = setup("g4_math_addition");
  let calls = 0;
  const next = await f.turn(f.session.question.answer, undefined, {
    async render(input) {
      calls++;
      return input.responsePlan!.requiredQuestion!;
    },
  });
  assert.ok(
    responseQuality(next, responsePlan(next).requiredQuestion!).includes(
      "missing_success_acknowledgement",
    ),
  );
  assert.equal(calls, 0);
  assert.match(next.conversation!.spokenText!, /right|correct|yes/i);
  assert.ok(next.conversation!.spokenText!.includes(next.question.prompt));
});

test("answered prompts are never recycled within a session even when the bank runs out", () => {
  const f = setup("g7_english_structure");
  const seen = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const current = f.session;
    if (current.state === "SESSION_REVIEW") break;
    assert.ok(!seen.has(current.question.prompt), current.question.prompt);
    seen.add(current.question.prompt);
    f.say(current.question.choiceLabels![current.question.answer]);
  }
  assert.ok(seen.size > 1);
  assert.equal(f.session.state, "SESSION_REVIEW");
  assert.doesNotMatch(f.session.conversation!.spokenText!, /which.*\?/i);
});
