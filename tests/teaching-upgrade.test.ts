import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-upgrade-")),
  "test.sqlite",
);
const { register } = await import("../src/server/auth");
const { createChild, learnerFor, sessionById, saveSession } =
  await import("../src/server/repository");
const { startSession, advanceSession } =
  await import("../src/server/orchestrator");
const { converse, greeting } = await import("../src/server/conversation");
const { saveControls, answerAccess } =
  await import("../src/server/learning-controls");
const { getQuestion, conceptById } = await import("../src/lib/curriculum");
const { understandLocally } = await import("../src/lib/conversation/intent");
const { saveBoard, boardFor } = await import("../src/server/whiteboard");
const {
  boardAnswer,
  canvasActionSchema,
  fractionSequence,
  multiplicationSequence,
  numberLineSequence,
  whiteboardActionSchema,
} = await import("../src/lib/teaching/whiteboard");
const { buildTeachingState } = await import("../src/server/provider");
const { planLesson, emptyLearner, updateMisconception } =
  await import("../src/lib/learning");
const { questionQuality } = await import("../src/lib/curriculum-catalog");
const user = register("Parent", "upgrade@test.local", "test-password-123");
function setup() {
  const child = createChild(user.id, {
    nickname: "Maya",
    age: 9,
    grade: 4,
    goal: "Fill learning gaps",
  });
  let s = startSession(child, "lesson", "equivalent_fractions");
  s.question = getQuestion("equivalent_fractions", 0);
  s.state = "TEACH";
  s.assistance = 0;
  saveSession(s);
  s = greeting(child, s.id);
  return {
    child,
    get s() {
      return sessionById(s.id);
    },
    say(text: string) {
      const current = sessionById(s.id);
      return converse(child, s.id, {
        requestId: randomUUID(),
        version: current.version,
        transcript: text,
        source: "text",
      });
    },
  };
}
test("parent policies enforce genuine per-question attempts, reveal gives no mastery and schedules fresh check", () => {
  const f = setup();
  assert.equal(answerAccess(f.s).allowed, false);
  f.say("give me a hint");
  assert.equal(answerAccess(f.s).attempts, 0);
  f.say("show me the answer");
  assert.equal(f.s.teaching?.revealedQuestions.length, 0);
  for (let i = 0; i < 3; i++) {
    f.say("999/1000");
    assert.equal(answerAccess(f.s).attempts, i + 1);
  }
  assert.equal(answerAccess(f.s).allowed, true);
  const before = learnerFor(f.child.id).states.equivalent_fractions
    .masteryScore;
  const shown = f.say("show me the answer");
  assert.match(shown.conversation!.text, /2\/4/);
  assert.equal(
    learnerFor(f.child.id).states.equivalent_fractions.masteryScore,
    before,
  );
  assert.throws(() =>
    advanceSession(f.child, shown.id, {
      action: "answer",
      version: shown.version,
      answer: "2/4",
    }),
  );
  const next = f.say("continue");
  assert.notEqual(next.question.prompt, shown.question.prompt);
  assert.equal(next.assistance, 0);
  assert.ok(next.teaching?.activeIndependentCheck);
});
test("disabled and immediate controls persist separately per child", () => {
  const a = setup(),
    b = setup();
  saveControls(a.child.id, { policy: "disabled", minimumAttempts: 3 });
  saveControls(b.child.id, { policy: "immediate", minimumAttempts: 3 });
  assert.equal(answerAccess(a.s).allowed, false);
  a.say("tell me the answer");
  assert.equal(a.s.teaching?.revealedQuestions.length, 0);
  b.say("tell me the answer");
  assert.equal(b.s.teaching?.revealedQuestions.length, 1);
});
test("voice choices resolve letters, ordinals and quantities; distractors diagnose without confirmation", () => {
  const q = getQuestion("equivalent_fractions", 0);
  assert.deepEqual(q.choices, ["1/4", "2/4", "2/3", "3/4"]);
  assert.equal(understandLocally("B", q).answer, "2/4");
  assert.equal(understandLocally("the second one", q).answer, "2/4");
  assert.equal(understandLocally("three quarters", q).answer, "3/4");
  assert.equal(questionQuality(q).length, 0);
  const m = updateMisconception(undefined, "child", q, "1/4")!;
  assert.equal(m.status, "suspected");
});
test("all grades and subjects remain grade-scoped, including strong learner states", () => {
  for (let grade = 1; grade <= 5; grade++)
    for (const subject of [
      "Math",
      "English",
      "Science",
      "Social Studies",
    ] as const) {
      const f = setup();
      const plan = planLesson(
        { ...f.child, grade },
        emptyLearner(),
        new Date(),
        subject,
      );
      const skill = conceptById[plan.targetConcept];
      assert.equal(skill.subject, subject);
      assert.ok(skill.gradeBand[0] <= grade && skill.gradeBand[1] >= grade);
    }
});
test("board work persists, rejects stale revisions and tutor ownership, and evaluates selected text/counters", () => {
  const f = setup();
  const object = {
    id: "equation",
    owner: "student" as const,
    kind: "text" as const,
    x: 20,
    y: 40,
    text: "1/2 = 2/4",
  };
  const saved = saveBoard(f.s.id, { revision: 0, objects: [object] });
  assert.equal(saved.revision, 1);
  assert.deepEqual(boardFor(f.s.id), saved);
  assert.throws(() => saveBoard(f.s.id, { revision: 0, objects: [] }));
  assert.throws(() =>
    saveBoard(f.s.id, {
      revision: 1,
      objects: [{ ...object, owner: "tutor" }],
    }),
  );
  assert.equal(boardAnswer([object], ["equation"]), "2/4");
  assert.equal(
    boardAnswer(
      [{ id: "dot", owner: "student", kind: "counter", x: 1, y: 2 }],
      ["dot"],
    ),
    "1",
  );
  const context = buildTeachingState(f.s, learnerFor(f.child.id), {
    age: 9,
    grade: 4,
  });
  assert.equal(context.academicContext?.expectedAnswer, "2/4");
  assert.match(
    JSON.stringify(context.academicContext?.studentBoard),
    /1\/2 = 2\/4/,
  );
});
test("fraction animation is a validated sequence preserving quantity", () => {
  const actions = fractionSequence(1, 3);
  assert.equal(actions.length, 3);
  assert.deepEqual(whiteboardActionSchema.array().parse(actions), actions);
  assert.equal(actions[0].atWord, 0);
  assert.ok(actions[1].atWord > actions[0].atWord);
});

test("typed math actions stage number-line jumps and multiplication without leaking early answers", () => {
  const jumps = numberLineSequence(4, 3);
  assert.equal(jumps[0].type, "showNumberLine");
  assert.deepEqual(jumps[1], {
    type: "animateNumberLineJump",
    id: "number-line-jump",
    owner: "tutor",
    from: 4,
    to: 7,
    label: "+3",
    atWord: 7,
  });
  const askFirst = multiplicationSequence(3, 4);
  assert.equal(
    askFirst.some((action) => action.type === "animateEquationStep"),
    false,
  );
  const workedParallel = multiplicationSequence(3, 4, true);
  assert.equal(workedParallel.at(-1)?.type, "animateEquationStep");
  assert.deepEqual(
    canvasActionSchema.array().parse(workedParallel),
    workedParallel,
  );
  assert.equal(
    canvasActionSchema.safeParse({
      type: "showEquation",
      id: "unsafe",
      owner: "student",
      equation: "alert(1)",
      atWord: 0,
    }).success,
    false,
  );
});

test("grade-specific arithmetic variants have valid keys and diagnostic options at every grade", () => {
  for (let grade = 1; grade <= 5; grade++)
    for (const operation of [
      "addition",
      "subtraction",
      "multiplication",
      "division",
    ]) {
      const prompts = new Set<string>();
      for (let seed = 0; seed < 12; seed++) {
        const q = getQuestion(`g${grade}_math_${operation}`, seed);
        prompts.add(q.prompt);
        assert.deepEqual(questionQuality(q), []);
        assert.ok(q.options?.filter((o) => o.correct).length === 1);
        assert.ok(
          q.options
            ?.filter((o) => !o.correct)
            .every((o) => o.diagnosticMeaning),
        );
      }
      assert.ok(prompts.size >= 6, `${grade} ${operation} needs real variants`);
    }
});
test("unrelated wrong answers do not resolve a confirmed misconception", () => {
  const first = getQuestion("equivalent_fractions", 0),
    second = getQuestion("equivalent_fractions", 1);
  let m = updateMisconception(
    undefined,
    "child",
    first,
    first.misconception!.answer,
  )!;
  m = updateMisconception(m, "child", second, second.misconception!.answer)!;
  assert.equal(m.status, "confirmed");
  m = updateMisconception(
    m,
    "child",
    getQuestion("equivalent_fractions", 2),
    "99",
  )!;
  m = updateMisconception(
    m,
    "child",
    getQuestion("equivalent_fractions", 3),
    "99",
  )!;
  assert.equal(m.status, "confirmed");
});
