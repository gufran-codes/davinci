import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-brain-")),
  "test.sqlite",
);
const { register } = await import("../src/server/auth");
const {
  createChild,
  updateChildPreferences,
  learnerFor,
  saveLearner,
  sessionById,
  saveSession,
  ownedChild,
} = await import("../src/server/repository");
const { startSession, advanceSession } =
  await import("../src/server/orchestrator");
const { greeting, converse } = await import("../src/server/conversation");
const { memoryFor, applySupport } =
  await import("../src/lib/teaching/adaptive");
const { initialState, updateMastery, availableLesson, planLesson } =
  await import("../src/lib/learning");
const { parentSkillLevel, parentObservations, progressDays } =
  await import("../src/lib/parent-learning");
const { buildTeachingState } = await import("../src/server/provider");
const { answerAccess, saveControls } =
  await import("../src/server/learning-controls");
const { conceptById } = await import("../src/lib/curriculum");
const parent = register(
  "Parent",
  "brain-parent@test.local",
  "safe-password-123",
);
function setup() {
  const child = createChild(parent.id, {
    nickname: "Maya",
    age: 9,
    grade: 4,
    goal: "Fill learning gaps",
    subjects: ["Math", "Science"],
  });
  const started = startSession(child, "lesson", "equivalent_fractions");
  started.state = "TEACH";
  started.step = 3;
  started.assistance = 1;
  saveSession(started);
  greeting(child, started.id);
  const say = (transcript: string) => {
    const s = sessionById(started.id);
    return converse(child, s.id, {
      requestId: randomUUID(),
      version: s.version,
      transcript,
      source: "text",
    });
  };
  return { child, id: started.id, say };
}

test("competing hypotheses choose a foundation probe, update from evidence, then return", () => {
  const f = setup();
  const original = sessionById(f.id).question;
  assert.ok(original.misconception);
  f.say(original.misconception.answer);
  let s = f.say(original.misconception.answer);
  assert.equal(s.state, "PROBE");
  assert.equal(s.assistance, 0);
  const brain = memoryFor(s).intelligence!;
  assert.ok(brain.hypotheses.some((h) => h.kind === "misconception"));
  assert.ok(brain.hypotheses.some((h) => h.kind === "prerequisite_gap"));
  assert.equal(brain.plan.stage, "diagnose");
  const id = brain.diagnostic!.hypothesisId;
  const before = brain.hypotheses.find((h) => h.id === id)!.confidence;
  s = f.say(s.question.answer);
  assert.equal(s.question.conceptId, original.conceptId);
  assert.equal(memoryFor(s).returnStack.length, 0);
  assert.ok(
    memoryFor(s).intelligence!.hypotheses.find((h) => h.id === id)!.confidence <
      before,
  );
  const state = buildTeachingState(s, learnerFor(f.child.id), {
    grade: 4,
    age: 9,
  });
  assert.ok(state.academicContext?.workingMemory);
  assert.ok(memoryFor(sessionById(f.id)).intelligence!.explanations.length);
});

test("failed diagnostic remediates its foundation before returning to the target", () => {
  const f = setup();
  let s = sessionById(f.id);
  f.say(s.question.misconception!.answer);
  s = f.say(s.question.misconception!.answer);
  const foundation = s.question.conceptId;
  s = f.say("9999");
  assert.equal(s.state, "REMEDIATION");
  assert.equal(memoryFor(s).intelligence!.plan.stage, "remediate");
  assert.equal(s.question.conceptId, foundation);
  s = f.say(s.question.answer);
  assert.equal(s.question.conceptId, "equivalent_fractions");
});

test("help during an independent check cannot verify supported learning or reveal an answer", () => {
  const f = setup();
  f.say("Give me a hint");
  let s = f.say(sessionById(f.id).question.answer);
  assert.ok(s.teaching?.activeIndependentCheck);
  saveControls(f.child.id, { policy: "immediate", minimumAttempts: 1 });
  assert.equal(answerAccess(s).allowed, false);
  s = f.say("Give me a hint");
  const state = memoryFor(s),
    check = state.activeIndependentCheck!;
  assert.ok(check);
  s = advanceSession(f.child, s.id, {
    action: "answer",
    version: s.version,
    answer: s.question.answer,
  });
  assert.ok(memoryFor(s).pendingIndependentCheck);
  assert.ok(
    !memoryFor(s).assistanceLedger.some(
      (e) => e.questionId === check.sourceQuestionId && e.independentlyVerified,
    ),
  );
  assert.equal(
    memoryFor(s).intelligence!.observations.at(-1)?.kind,
    "assisted_success",
  );
});

test("working memory is bounded and strategy failure is recorded separately from mastery", () => {
  const f = setup(),
    s = sessionById(f.id),
    learner = learnerFor(f.child.id);
  const before = learner.states[s.question.conceptId]?.masteryScore;
  const strategy = s.decision.strategy;
  applySupport(s, learner, f.child, "another");
  assert.equal(learner.states[s.question.conceptId]?.masteryScore, before);
  assert.ok(
    learner.strategies.some(
      (e) => e.strategyId === strategy && e.unsuccessfulOutcomes > 0,
    ),
  );
  for (let i = 0; i < 16; i++) f.say(i % 2 ? "How are you?" : "Give me a hint");
  const saved = sessionById(f.id);
  assert.ok(memoryFor(saved).intelligence!.explanations.length <= 12);
  assert.ok(memoryFor(saved).recentTutorQuestions.length <= 12);
});

test("profile editing is scoped, preserves mastery, validates subjects and keeps active lessons usable", () => {
  const f = setup(),
    sibling = setup();
  f.say(sessionById(f.id).question.answer);
  const history = learnerFor(f.child.id);
  const changed = updateChildPreferences(parent.id, f.child.id, {
    grade: 6,
    subjects: ["Science"],
  });
  assert.equal(changed.grade, 6);
  assert.equal(ownedChild(parent.id, sibling.child.id).grade, 4);
  assert.deepEqual(learnerFor(f.child.id), history);
  assert.match(
    availableLesson(changed, history)!.targetConcept,
    /^g6_science_/,
  );
  assert.ok(startSession(changed, "lesson").id === f.id);
  assert.throws(
    () =>
      updateChildPreferences("other-parent", f.child.id, {
        grade: 4,
        subjects: ["Math"],
      }),
    /not found/,
  );
  assert.throws(() =>
    updateChildPreferences(parent.id, f.child.id, {
      grade: 11,
      subjects: ["Math"],
    }),
  );
  assert.throws(() =>
    updateChildPreferences(parent.id, f.child.id, { grade: 4, subjects: [] }),
  );
  const science = updateChildPreferences(parent.id, sibling.child.id, {
    grade: 4,
    subjects: ["Science"],
  });
  assert.equal(
    conceptById[planLesson(science, learnerFor(science.id)).targetConcept]
      .subject,
    "Science",
  );
  const current = sessionById(f.id);
  current.completedAt = new Date().toISOString();
  current.state = "COMPLETE";
  saveSession(current);
  const secondaryLesson = startSession(changed, "lesson");
  assert.equal(secondaryLesson.question.subject, "Science");
  secondaryLesson.state = "COMPLETE";
  secondaryLesson.completedAt = new Date().toISOString();
  saveSession(secondaryLesson);
  const younger = updateChildPreferences(parent.id, f.child.id, {
    grade: 4,
    subjects: ["Science"],
  });
  assert.throws(
    () => startSession(younger, "lesson", "equivalent_fractions"),
    /Enable this subject/,
  );
  const lesson = startSession(
    younger,
    "lesson",
    undefined,
    undefined,
    "Science",
  );
  assert.equal(lesson.question.subject, "Science");
});

test("parent levels and observations reflect recorded evidence, including reduced help", () => {
  const f = setup(),
    learner = learnerFor(f.child.id);
  let state = initialState(f.child.id, "equivalent_fractions");
  assert.equal(parentSkillLevel(state), "Not started");
  state = updateMastery(
    state,
    true,
    2,
    false,
    "visual_fraction_model",
    "a",
    f.id,
  );
  assert.equal(parentSkillLevel(state), "Starting");
  for (let i = 0; i < 6; i++)
    state = updateMastery(
      state,
      true,
      0,
      true,
      "symbolic_first",
      `b${i}`,
      f.id,
      new Date(),
      { reasoningQuality: 0.8 },
    );
  learner.states[state.conceptId] = state;
  saveLearner(f.child.id, learner);
  assert.equal(parentSkillLevel(state), "Strong");
  assert.ok(
    parentObservations(f.child, learner).some(
      (o) => o.id.startsWith("fade:") && o.evidence.length >= 3,
    ),
  );
  assert.equal(progressDays(learner)[0].assisted, 1);
  assert.equal(progressDays(learner)[0].independent, 6);
  const plain = updateMastery(
    initialState("c", "equivalent_fractions"),
    true,
    0,
    false,
    "symbolic_first",
    "q",
    "s",
  );
  const reasoned = updateMastery(
    initialState("c", "equivalent_fractions"),
    true,
    0,
    false,
    "symbolic_first",
    "q",
    "s",
    new Date(),
    { reasoningQuality: 0.8 },
  );
  assert.ok(reasoned.masteryScore > plain.masteryScore);
});

test("independently explained success shortens guided practice and moves to transfer", () => {
  const f = setup();
  let s = sessionById(f.id);
  s.state = "TEACH";
  s.step = 3;
  s.assistance = 0;
  saveSession(s);
  for (let i = 0; i < 2; i++) {
    s = advanceSession(f.child, s.id, {
      action: "answer",
      version: s.version,
      answer: s.question.answer,
      reasoning:
        "We multiply both numerator and denominator by the same number so the fraction covers the same amount.",
    });
    if (i === 0) {
      s = advanceSession(f.child, s.id, {
        action: "continue",
        version: s.version,
      });
      s.assistance = 0;
      saveSession(s);
    }
  }
  assert.equal(
    memoryFor(s).intelligence!.observations.at(-1)?.kind,
    "understood",
  );
  s = advanceSession(f.child, s.id, { action: "continue", version: s.version });
  assert.equal(s.state, "MASTERY_CHECK");
  assert.equal(s.assistance, 0);
  assert.equal(s.question.transfer, true);
  assert.equal(memoryFor(s).intelligence!.plan.stage, "transfer_review");
});
