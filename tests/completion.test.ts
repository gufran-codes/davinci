import { test } from "node:test";
import assert from "node:assert/strict";
import { Child } from "../src/lib/types";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "primer-completion-")),
  "test.sqlite",
);
const {
  chooseDecision,
  deriveInsight,
  emptyLearner,
  initialState,
  planLesson,
  strengthsFor,
  updateStrategy,
  weaknessesFor,
} = await import("../src/lib/learning");
const { register } = await import("../src/server/auth");
const { createChild, learnerFor, saveLearner } =
  await import("../src/server/repository");
const { conceptById } = await import("../src/lib/curriculum");
const child: Child = {
  id: "completion-child",
  parentId: "parent",
  nickname: "Maya",
  age: 9,
  grade: 4,
  goal: "Fill learning gaps",
  subjects: ["Math", "English", "Science", "Social Studies"],
  diagnosticComplete: true,
  createdAt: new Date().toISOString(),
};
const mayaLearner = () => {
  const l = emptyLearner();
  l.states.multiplication_by_4 = {
    ...initialState(child.id, "multiplication_by_4"),
    masteryScore: 0.85,
  };
  l.states.equivalent_fractions = {
    ...initialState(child.id, "equivalent_fractions"),
    masteryScore: 0.5,
  };
  let e = updateStrategy(
    undefined,
    child.id,
    "visual_fraction_model",
    "Fractions",
    true,
    0.04,
    new Date(),
    "Math",
  );
  for (let i = 0; i < 3; i++)
    e = updateStrategy(e, child.id, e.strategyId, e.conceptDomain, true, 0.04);
  l.strategies.push(e);
  return l;
};

test("T7: parent insight narrates what was learned and how teaching adapts", () => {
  const l = mayaLearner();
  const insight = deriveInsight(child, l);
  assert.equal(insight.strategy, "visual_fraction_model");
  assert.match(insight.observation, /visual/);
  assert.match(insight.adaptation, /visual/);
  assert.ok(insight.attempts >= 3);
  const strengths = strengthsFor(l);
  assert.ok(
    strengths.some((s) => s.skillId === "multiplication_by_4"),
    "dashboard strengths feed from the same evidence",
  );
  assert.deepEqual(weaknessesFor(l), []);
});

test("T8: personalization survives a fresh load as if on another device", () => {
  const user = register("Devices", "devices@test.local", "long-password-123");
  const c = createChild(user.id, {
    nickname: "Maya",
    age: 9,
    grade: 4,
    goal: "Fill learning gaps",
    subjects: ["Math", "Science"],
  });
  const built = mayaLearner();
  const remapped = {
    ...built,
    states: Object.fromEntries(
      Object.values(built.states).map((s) => [
        s.conceptId,
        { ...s, childId: c.id },
      ]),
    ),
    strategies: built.strategies.map((e) => ({ ...e, childId: c.id })),
  };
  saveLearner(c.id, remapped);
  const first = chooseDecision(learnerFor(c.id), "equivalent_fractions");
  const second = chooseDecision(learnerFor(c.id), "equivalent_fractions");
  assert.equal(first.strategy, "visual_fraction_model");
  assert.deepEqual(second, first);
});

test("T9: one child gets different strategies in different subjects", () => {
  const l = mayaLearner();
  l.states.science_energy_forms = {
    ...initialState(child.id, "science_energy_forms"),
    masteryScore: 0.37,
  };
  let e = updateStrategy(
    undefined,
    child.id,
    "guided_questioning",
    "Energy",
    true,
    0.04,
    new Date(),
    "Science",
  );
  for (let i = 0; i < 3; i++)
    e = updateStrategy(e, child.id, e.strategyId, e.conceptDomain, true, 0.04);
  l.strategies.push(e);
  const math = chooseDecision(l, "equivalent_fractions");
  const science = chooseDecision(l, "science_energy_forms");
  assert.equal(math.strategy, "visual_fraction_model");
  assert.equal(science.strategy, "guided_questioning");
  assert.notEqual(math.strategy, science.strategy);
});

test("T10: grade remains the target while foundations can be reviewed", () => {
  const l = emptyLearner();
  const now = new Date().toISOString();
  l.states.adding_like = {
    ...initialState(child.id, "adding_like"),
    masteryScore: 0.5,
    lastPracticedAt: now,
    evidence: [
      {
        at: now,
        questionId: "q",
        correct: true,
        assistance: 1,
        delta: 0.04,
        strategy: "visual_fraction_model",
        sessionId: "s",
      },
    ],
  };
  l.states.fraction_meaning = {
    ...initialState(child.id, "fraction_meaning"),
    masteryScore: 0.2,
    lastPracticedAt: now,
    evidence: [
      {
        at: now,
        questionId: "q",
        correct: false,
        assistance: 0,
        delta: -0.04,
        strategy: "symbolic_first",
        sessionId: "s",
      },
    ],
  };
  const target = planLesson(child, l).targetConcept;
  assert.notEqual(target, "fraction_meaning");
  assert.ok(
    conceptById[target].gradeBand[0] <= child.grade &&
      conceptById[target].gradeBand[1] >= child.grade,
  );
});
