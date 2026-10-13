import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  ConversationInterpreter,
  ConversationSpeaker,
} from "../src/server/understanding";
import { speechWords } from "../src/lib/teaching/response-budget";

process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-brevity-")),
  "test.sqlite",
);
process.env.OPENAI_API_KEY = "";
const { register } = await import("../src/server/auth");
const { createChild, saveSession, sessionById, learnerFor } =
  await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { greeting, converse, conversationHistory } =
  await import("../src/server/conversation");
const { conversationTurn } = await import("../src/server/understanding");
const { getQuestion } = await import("../src/lib/curriculum");
const { chooseDecision } = await import("../src/lib/learning");
const { interpretStudentTurn } =
  await import("../src/lib/conversation/student-dialogue");
const { responsePlan, responseQuality } =
  await import("../src/lib/conversation/grounding");
const parent = register("QA", `${randomUUID()}@test.local`, "testing-password");

function setup() {
  const child = createChild(parent.id, {
    nickname: "Test",
    age: 9,
    grade: 4,
    goal: "Learn",
    subjects: ["Math"],
  });
  let s = startSession(child, "lesson", "equivalent_fractions");
  s.question = getQuestion("equivalent_fractions", 0);
  s.state = "TEACH";
  s.assistance = 0;
  s.decision = chooseDecision(learnerFor(child.id), s.question.conceptId);
  saveSession(s);
  s = greeting(child, s.id);
  const calls = { interpreter: 0, speaker: 0 };
  const interpreter: ConversationInterpreter = {
    async understand(input) {
      calls.interpreter++;
      return interpretStudentTurn(input.transcript, sessionById(s.id), "text");
    },
  };
  const speaker: ConversationSpeaker = {
    async render(input) {
      calls.speaker++;
      return input.draft;
    },
  };
  const input = (transcript: string) => ({
    requestId: randomUUID(),
    version: sessionById(s.id).version,
    transcript,
    source: "text" as const,
  });
  return {
    child,
    id: s.id,
    calls,
    interpreter,
    speaker,
    input,
    get session() {
      return sessionById(s.id);
    },
    turn: (text: string, renderer = speaker) =>
      conversationTurn(child, s.id, input(text), interpreter, renderer),
  };
}

test("routine replies and pause/resume use zero model calls without grading or losing delivery receipts", async () => {
  const f = setup();
  const question = f.session.question.id;
  const prior = f.session.conversation!;
  const prefix = prior.spokenText!.split(" ").slice(0, 4).join(" ");
  const next = await conversationTurn(
    f.child,
    f.id,
    {
      ...f.input("Thanks!"),
      heard: { turnId: prior.turnId, spokenText: prefix, interrupted: true },
    },
    f.interpreter,
    f.speaker,
  );
  assert.equal(next.conversation!.spokenText, "You’re welcome.");
  assert.equal(
    conversationHistory(f.child.id, f.id)[0].spoken_tutor_text,
    prefix,
  );
  for (const text of [
    "Thanks!",
    "Hello!",
    "Are you there?",
    "wait",
    "continue",
  ]) {
    const s = await f.turn(text);
    assert.equal(s.question.id, question);
    assert.equal(s.attempts, 0);
    assert.ok(
      speechWords(s.conversation!.spokenText!) <=
        responsePlan(s).speechBudget.maxWords,
    );
    if (text === "Thanks!")
      assert.equal(s.conversation!.spokenText, "You’re welcome.");
  }
  assert.deepEqual(f.calls, { interpreter: 0, speaker: 0 });
});

test("a standalone definition needs one teaching call; the short budget reaches the model and guard", async () => {
  const f = setup();
  const s = await f.turn("What is a numerator?", {
    async render(input) {
      f.calls.speaker++;
      assert.equal(input.wordLimit, 35);
      assert.equal(input.responsePlan!.speechBudget.maxWords, input.wordLimit);
      assert.equal(input.responsePlan!.requiredQuestion, undefined);
      return "A numerator counts the equal parts being considered.";
    },
  });
  assert.deepEqual(f.calls, { interpreter: 0, speaker: 1 });
  assert.equal(s.attempts, 0);
  assert.equal(s.teaching!.lastTurnTrace!.quality!.usedFallback, false);
  assert.equal(
    s.conversation!.spokenText,
    "A numerator counts the equal parts being considered.",
  );
});

test("compound social questions, answers with doubts, and backward references retain interpretation", async () => {
  for (const makeText of [
    () => "Thanks, but why does the amount stay the same?",
    () => "What does that mean?",
    (answer: string) => `${answer}, but why do we split both counts?`,
    () => "What does denominator mean? Why is it useful?",
  ]) {
    const f = setup();
    const text = makeText(f.session.question.answer);
    const s = await f.turn(text);
    assert.equal(f.calls.interpreter, 1, text);
    assert.ok(f.calls.speaker >= 1, text);
    assert.equal(s.attempts, text.includes(", but why do we split") ? 1 : 0);
  }
});

test("plain correct answers retain the existing zero-call advancement path", async () => {
  const f = setup();
  const original = f.session.question;
  const s = await f.turn(original.answer);
  assert.equal(s.conversation!.assessment!.correct, true);
  assert.notEqual(s.question.id, original.id);
  assert.deepEqual(f.calls, { interpreter: 0, speaker: 0 });
  assert.ok(s.conversation!.spokenText!.includes(s.question.prompt));
});

test("persistent brevity survives reload; a detailed request overrides only its own turn", async () => {
  const f = setup();
  await f.turn("From now on, keep your answers short.");
  assert.equal(f.session.teaching!.dialogue!.responseDepth, "brief");
  const brief = await f.turn("Why do both counts change?");
  assert.equal(responsePlan(brief).speechBudget.maxWords, 35);
  const detailed = await f.turn("Explain in detail why both counts change.");
  assert.equal(responsePlan(detailed).speechBudget.maxWords, 180);
  assert.equal(f.session.teaching!.dialogue!.responseDepth, "brief");
  const again = await f.turn("Why does the amount stay fixed?");
  assert.equal(responsePlan(again).speechBudget.maxWords, 35);
});

test("a long visible task cannot inflate a simple definition's budget", () => {
  const f = setup();
  const s = f.session;
  s.question.prompt = "Read the following passage carefully. ".repeat(40);
  s.conversation!.intent = "define";
  s.teaching!.lastUtterance = "What is a numerator?";
  assert.equal(responsePlan(s).speechBudget.maxWords, 35);
  assert.ok(
    responseQuality(s, "This is extra explanatory text. ".repeat(10)).includes(
      "voice_length",
    ),
  );
});

test("overlong model output is repaired once, then falls back within the same budget", async () => {
  const f = setup();
  let calls = 0;
  const s = await f.turn("What is a numerator?", {
    async render(input) {
      calls++;
      assert.equal(input.wordLimit, 35);
      if (calls === 2) {
        assert.ok(input.correction!.checks.includes("voice_length"));
        assert.match(input.correction!.instruction, /35 explanation words/);
      }
      return "The numerator describes the selected pieces of a whole. ".repeat(
        12,
      );
    },
  });
  assert.equal(calls, 2);
  assert.equal(s.teaching!.lastTurnTrace!.quality!.usedFallback, true);
  assert.ok(speechWords(s.conversation!.spokenText!) <= 35);
  assert.equal(s.attempts, 0);
});

test("offline explanations obey the brief request and exact repeats retain a requested deep answer", () => {
  const f = setup();
  let s = converse(
    f.child,
    f.id,
    f.input("Why do both counts change? Do not explain in detail."),
  );
  assert.ok(speechWords(s.conversation!.spokenText!) <= 35);
  s = converse(
    f.child,
    f.id,
    f.input("Explain in detail why both counts change."),
  );
  const spoken = s.conversation!.spokenText;
  s = converse(f.child, f.id, f.input("repeat that"));
  assert.equal(s.conversation!.spokenText, spoken);
});
