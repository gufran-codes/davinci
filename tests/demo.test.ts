import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "primer-demo-")),
  "test.sqlite",
);
const { register } = await import("../src/server/auth");
const { learnerFor } = await import("../src/server/repository");
const { seedChildren } = await import("../src/server/demo");
const { alternativesFor, chooseDecision } = await import("../src/lib/learning");

let setupCount = 0;
const setup = () => {
  setupCount++;
  const user = register(
    "Demo",
    `demo-${setupCount}@test.local`,
    "long-password-123",
  );
  const seeded = seedChildren(user.id);
  const learners = Object.fromEntries(
    seeded.map((c) => [c.nickname, learnerFor(c.id)]),
  );
  return { seeded, learners };
};

test("demo family spans subjects with per-child evidence", () => {
  const { seeded, learners } = setup();
  assert.equal(seeded.length, 3);
  for (const c of seeded)
    assert.deepEqual(c.subjects, [
      "Math",
      "English",
      "Science",
      "Social Studies",
    ]);
  for (const name of ["Maya", "Adam", "Sofia"]) {
    assert.ok(
      learners[name].states.ela_reading_inference,
      `${name} needs an English foothold`,
    );
    assert.ok(
      learners[name].states.science_energy_forms,
      `${name} needs a Science foothold`,
    );
  }
  const maya = learners.Maya;
  const visual = maya.strategies.find(
    (e) => e.strategyId === "visual_fraction_model",
  )!;
  assert.ok(visual.successfulOutcomes >= 3);
  const science = maya.strategies.find(
    (e) => e.strategyId === "guided_questioning" && e.subject === "Science",
  )!;
  assert.ok(
    science.attempts >= 4,
    "Maya's Science evidence differs from her Math preference",
  );
  const sofia = learners.Sofia;
  assert.ok(
    sofia.misconceptions.some((m) => m.id === "energy_used_up"),
    "Sofia carries a Science misconception hypothesis too",
  );
});

test("demo Adam anchors symbolic teaching while Maya prefers visuals", () => {
  const { learners } = setup();
  assert.equal(
    chooseDecision(learners.Adam, "equivalent_fractions").strategy,
    "symbolic_first",
  );
  assert.ok(
    chooseDecision(learners.Adam, "equivalent_fractions").strengthToLeverage,
  );
  assert.equal(
    chooseDecision(learners.Maya, "equivalent_fractions").strategy,
    "visual_fraction_model",
  );
});

test("alternatives rank evidence-backed options first", () => {
  const { learners } = setup();
  const options = alternativesFor(learners.Maya, "equivalent_fractions");
  assert.equal(options[0].strategyId, "visual_fraction_model");
  assert.equal(options[0].basis, "positive evidence");
  assert.deepEqual(alternativesFor(learners.Maya, "no_such_skill"), []);
});
