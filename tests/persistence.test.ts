import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "primer-test-")),
  "test.sqlite",
);
const { register, authenticate } = await import("../src/server/auth");
const { createChild, ownedChild, learnerFor, saveLearner, sessionsFor } =
  await import("../src/server/repository");
const { startSession, advanceSession } =
  await import("../src/server/orchestrator");
const { emptyLearner, initialState, chooseDecision, deriveInsight } =
  await import("../src/lib/learning");
const { one } = await import("../src/server/db");
test("accounts authenticate, ownership is isolated, session actions persist and reject replays", () => {
  const user = register("Alex", "alex@test.local", "long-password-123"),
    other = register("Other", "other@test.local", "long-password-123");
  assert.equal(authenticate(user.email, "long-password-123").id, user.id);
  assert.throws(() => authenticate(user.email, "wrong"));
  const child = createChild(user.id, {
    nickname: "Maya",
    age: 9,
    grade: 4,
    goal: "Build confidence",
  });
  assert.throws(() => ownedChild(other.id, child.id));
  let s = startSession(child, "diagnostic");
  const previous = s.version;
  s = advanceSession(child, s.id, {
    action: "answer",
    version: s.version,
    answer: s.question.answer,
  });
  assert.throws(() =>
    advanceSession(child, s.id, {
      action: "answer",
      version: previous,
      answer: "1",
    }),
  );
  assert.equal(
    learnerFor(child.id).states[s.question.conceptId]
      .successfulIndependentAttempts,
    1,
  );
  const persisted = learnerFor(child.id);
  assert.equal(
    persisted.states[s.question.conceptId].evidence.at(-1)?.outcome,
    "independent_success",
  );
  assert.ok(
    persisted.recentLearning.some(
      (memory) => memory.kind === "assessment" && memory.sessionId === s.id,
    ),
  );
  const sibling = createChild(user.id, {
    nickname: "Leo",
    age: 9,
    grade: 4,
    goal: "Build confidence",
  });
  assert.deepEqual(learnerFor(sibling.id).states, {});
  assert.deepEqual(learnerFor(sibling.id).recentLearning, []);
  assert.equal(sessionsFor(child.id).length, 1);
  assert.equal(startSession(child, "lesson").id, s.id);
  assert.ok(one("SELECT id FROM practice_attempts WHERE child_id=?", child.id));
});
test("key scenario: symbolic struggle → alternate visual success → persistent future preference", () => {
  const user = register("Scenario", "scenario@test.local", "long-password-123"),
    child = createChild(user.id, {
      nickname: "Maya",
      age: 9,
      grade: 4,
      goal: "Build confidence",
    }),
    l = emptyLearner();
  for (const id of [
    "multiplication_by_4",
    "fraction_meaning",
    "multiplication_by_2",
  ])
    l.states[id] = { ...initialState(child.id, id), masteryScore: 0.85 };
  l.states.equivalent_fractions = {
    ...initialState(child.id, "equivalent_fractions"),
    masteryScore: 0.45,
    lastPracticedAt: new Date().toISOString(),
    evidence: [
      {
        at: new Date().toISOString(),
        questionId: "initial",
        correct: true,
        assistance: 1,
        delta: 0.04,
        strategy: "symbolic_first",
        sessionId: "initial",
      },
    ],
  };
  saveLearner(child.id, l);
  let s = startSession(child, "lesson");
  assert.equal(s.plan.targetConcept, "equivalent_fractions");
  assert.equal(s.decision.strategy, "symbolic_first");
  // Explicit support change is assessed, then retained across fresh independent checks.
  s = advanceSession(child, s.id, { action: "another", version: s.version });
  assert.equal(s.decision.strategy, "visual_fraction_model");
  for (let turn = 0; turn < 40 && s.state !== "SESSION_REVIEW"; turn++) {
    s = advanceSession(child, s.id, {
      action: "answer",
      version: s.version,
      answer: s.question.answer,
    });
    s = advanceSession(child, s.id, { action: "continue", version: s.version });
  }
  assert.equal(
    s.state,
    "SESSION_REVIEW",
    "lesson must terminate without a support loop",
  );
  s = advanceSession(child, s.id, {
    action: "reflect",
    version: s.version,
    reflection: "A little clearer",
  });
  assert.equal(s.state, "COMPLETE");
  const stored = learnerFor(child.id);
  assert.ok(
    stored.strategies.find((e) => e.strategyId === "symbolic_first")!
      .unsuccessfulOutcomes >= 1,
  );
  assert.ok(
    stored.strategies.find((e) => e.strategyId === "visual_fraction_model")!
      .successfulOutcomes >= 3,
  );
  assert.equal(
    chooseDecision(stored, "generate_equivalent").strategy,
    "visual_fraction_model",
  );
  assert.equal(deriveInsight(child, stored).strategy, "visual_fraction_model");
  assert.match(
    startSession(child, "lesson", "generate_equivalent").decision
      .personalization,
    /helped last time/,
  );
});
