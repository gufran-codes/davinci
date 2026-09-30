import { test } from "node:test";
import assert from "node:assert/strict";
import { Child } from "../src/lib/types";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "primer-policy-")),
  "test.sqlite",
);
const { conceptById, getQuestion } = await import("../src/lib/curriculum");
const { educationalTruthFor, assessStudentResponse } =
  await import("../src/lib/education");
const {
  chooseDecision,
  diagnosticNext,
  diagnosticStart,
  emptyLearner,
  initialState,
  planLesson,
  updateStrategy,
} = await import("../src/lib/learning");
const { register } = await import("../src/server/auth");
const { createChild, eventsFor, learnerFor, saveLearner } =
  await import("../src/server/repository");
const { startSession, advanceSession } =
  await import("../src/server/orchestrator");
const child: Child = {
  id: "policy-child",
  parentId: "parent",
  nickname: "Maya",
  age: 9,
  grade: 4,
  goal: "Build confidence",
  subjects: ["Math"],
  diagnosticComplete: true,
  createdAt: new Date().toISOString(),
};

test("low mastery routes to a probe of the weakest prerequisite", () => {
  const d = chooseDecision(emptyLearner(), "equivalent_fractions");
  assert.equal(d.targetSkillId, "equivalent_fractions");
  assert.equal(d.strategyId, d.strategy);
  assert.equal(d.pedagogicalMove, "show_visual");
  assert.equal(d.nextAssessmentType, "probe");
  assert.equal(d.prerequisiteToProbe, "fraction_meaning");
});

test("educational truth and correctness stay independent of personalization", () => {
  const truth = educationalTruthFor("equivalent_fractions");
  const question = getQuestion(truth.skillId, 0);
  const low = chooseDecision(emptyLearner(), truth.skillId);
  const strong = emptyLearner();
  strong.states.equivalent_fractions = {
    ...initialState(child.id, truth.skillId),
    masteryScore: 0.82,
    successfulIndependentAttempts: 1,
  };
  const high = chooseDecision(strong, truth.skillId);
  assert.notEqual(low.strategyId, high.strategyId);
  assert.deepEqual(
    truth.learningObjectives,
    conceptById[truth.skillId].learningObjectives,
  );
  assert.equal(assessStudentResponse(question, question.answer), true);
  assert.equal(assessStudentResponse(question, "definitely wrong"), false);
});

test("four Grade 4 learner states produce explainably different TeachingDecisions", () => {
  const target = "equivalent_fractions";
  const visual = emptyLearner();
  let visualEvidence = updateStrategy(
    undefined,
    "visual-child",
    "visual_fraction_model",
    "Fractions",
    true,
    0.04,
    new Date(),
    "Math",
    target,
  );
  visualEvidence = updateStrategy(
    visualEvidence,
    "visual-child",
    "visual_fraction_model",
    "Fractions",
    true,
    0.04,
    new Date(),
    "Math",
    target,
  );
  visual.strategies.push(visualEvidence);

  const symbolic = emptyLearner();
  symbolic.states.multiplication_by_4 = {
    ...initialState("symbolic-child", "multiplication_by_4"),
    masteryScore: 0.9,
    successfulIndependentAttempts: 4,
  };

  const misconception = emptyLearner();
  misconception.misconceptions.push({
    childId: "misconception-child",
    id: "different_means_unequal",
    conceptId: target,
    matches: 1,
    checks: 1,
    confidence: 0.45,
    confirmed: false,
    questionIds: ["probe-a"],
    status: "suspected",
    lastObservedAt: new Date().toISOString(),
    resolvedAt: null,
    evidence: [],
  });

  const transfer = emptyLearner();
  transfer.states[target] = {
    ...initialState("transfer-child", target),
    masteryScore: 0.82,
    successfulIndependentAttempts: 1,
  };

  const decisions = [visual, symbolic, misconception, transfer].map((learner) =>
    chooseDecision(learner, target),
  );
  assert.deepEqual(
    decisions.map((decision) => decision.strategyId),
    [
      "visual_fraction_model",
      "symbolic_first",
      "guided_questioning",
      "transfer_problem",
    ],
  );
  assert.deepEqual(
    decisions.map((decision) => decision.pedagogicalMove),
    ["show_visual", "explain", "probe", "check_understanding"],
  );
  assert.ok(decisions.every((decision) => decision.reason.length > 20));
  assert.ok(
    decisions.every((decision) => decision.alternativesConsidered.length > 0),
  );
});

test("sustained independence earns a teach-back instead of another drill", () => {
  const l = emptyLearner();
  const now = new Date().toISOString();
  l.states.equivalent_fractions = {
    ...initialState(child.id, "equivalent_fractions"),
    masteryScore: 0.8,
    successfulIndependentAttempts: 2,
    evidence: [
      {
        at: now,
        questionId: "a",
        correct: true,
        assistance: 0,
        delta: 0.08,
        strategy: "symbolic_first",
        sessionId: "s",
      },
      {
        at: now,
        questionId: "b",
        correct: true,
        assistance: 0,
        delta: 0.08,
        strategy: "symbolic_first",
        sessionId: "s",
      },
      {
        at: now,
        questionId: "c",
        correct: true,
        assistance: 0,
        delta: 0.08,
        strategy: "symbolic_first",
        sessionId: "s",
      },
    ],
  };
  const d = chooseDecision(l, "equivalent_fractions");
  assert.equal(d.nextAssessmentType, "teachback");
  assert.equal(d.confidenceCheck, true);
});

test("failure count drives remediation, re-teach scaffolding, and reasoning probes", () => {
  const d2 = chooseDecision(emptyLearner(), "equivalent_fractions", 2);
  assert.equal(d2.nextAssessmentType, "remediation");
  assert.equal(d2.scaffoldingLevel, 5);
  assert.ok(d2.shouldProbePrerequisite);
  const d1 = chooseDecision(emptyLearner(), "equivalent_fractions", 1);
  assert.equal(d1.reasoningProbe, "What part feels confusing right now?");
});

test("a misconception hypothesis is carried as something to test", () => {
  const l = emptyLearner();
  l.misconceptions.push({
    childId: "c",
    id: "different_means_unequal",
    conceptId: "equivalent_fractions",
    matches: 1,
    checks: 1,
    confidence: 0.45,
    confirmed: false,
    questionIds: ["a"],
    status: "suspected",
    lastObservedAt: new Date().toISOString(),
    resolvedAt: null,
    evidence: [],
  });
  assert.equal(
    chooseDecision(l, "equivalent_fractions").misconceptionToTest,
    "different_means_unequal",
  );
});

test("strong cross-subject evidence transfers only after enough attempts", () => {
  const l = emptyLearner();
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
  for (let i = 0; i < 4; i++)
    e = updateStrategy(e, child.id, e.strategyId, e.conceptDomain, true, 0.04);
  l.strategies.push(e);
  const d = chooseDecision(l, "equivalent_fractions");
  assert.equal(d.strategy, "guided_questioning");
  assert.match(d.reason, /Science/);
});

test("diagnostics stay inside their subject", () => {
  assert.equal(diagnosticStart(4, "English"), "ela_reading_inference");
  assert.equal(diagnosticStart(4, "Science"), "science_energy_forms");
  assert.equal(
    diagnosticNext("ela_reading_inference", true, ["ela_reading_inference"], 4),
    "ela_vocabulary_context",
  );
  const next = diagnosticNext(
    "fraction_meaning",
    true,
    ["fraction_meaning"],
    4,
  );
  assert.equal(conceptById[next].subject, "Math");
});

test("grade-scoped plan does not advance a grade-4 child into grade 5", () => {
  const l = emptyLearner();
  const practiced = (id: string, mastery: number, daysAgo: number) => {
    l.states[id] = {
      ...initialState(child.id, id),
      masteryScore: mastery,
      lastPracticedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    };
  };
  practiced("common_denominators", 0.6, 2);
  practiced("adding_like", 0.6, 0);
  practiced("compare_same_denominator", 0.6, 3);
  const independentEvidence = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      at: new Date().toISOString(),
      questionId: `q${i}`,
      correct: true,
      assistance: 0,
      delta: 0.08,
      strategy: "symbolic_first" as const,
      sessionId: "s",
    }));
  l.states.subtracting_like = {
    ...initialState(child.id, "subtracting_like"),
    masteryScore: 0.8,
    successfulIndependentAttempts: 3,
    evidence: independentEvidence(3),
    lastPracticedAt: new Date(Date.now() - 86400000).toISOString(),
  };
  l.states.compare_unlike = {
    ...initialState(child.id, "compare_unlike"),
    masteryScore: 0.8,
    successfulIndependentAttempts: 3,
    evidence: independentEvidence(3),
    lastPracticedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  };
  const target = planLesson(child, l).targetConcept;
  assert.notEqual(target, "adding_unlike");
  assert.ok(
    conceptById[target].gradeBand[0] <= 4 &&
      conceptById[target].gradeBand[1] >= 4,
  );
});

test("planner rotates to the stalest practiced subject and honors explicit choice", () => {
  const l = emptyLearner();
  l.states.multiplication_by_4 = {
    ...initialState(child.id, "multiplication_by_4"),
    masteryScore: 0.8,
    lastPracticedAt: new Date().toISOString(),
  };
  l.states.science_energy_forms = {
    ...initialState(child.id, "science_energy_forms"),
    masteryScore: 0.4,
    lastPracticedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    evidence: [
      {
        at: new Date().toISOString(),
        questionId: "q",
        correct: false,
        assistance: 0,
        delta: -0.04,
        strategy: "guided_questioning",
        sessionId: "s",
      },
    ],
  };
  assert.equal(
    conceptById[
      planLesson({ ...child, subjects: ["Math", "Science"] }, l).targetConcept
    ].subject,
    "Science",
  );
  assert.equal(
    conceptById[planLesson(child, l, new Date(), "Math").targetConcept].subject,
    "Math",
  );
});

test("lesson inserts a PROBE step and keeps the grade-level target when prerequisites are secure", () => {
  const user = register("Probe", "probe@test.local", "long-password-123");
  const c = createChild(user.id, {
    nickname: "Maya",
    age: 9,
    grade: 4,
    goal: "Build confidence",
  });
  const l = emptyLearner();
  for (const id of [
    "multiplication_by_4",
    "fraction_meaning",
    "multiplication_by_2",
  ])
    l.states[id] = { ...initialState(c.id, id), masteryScore: 0.85 };
  l.states.equivalent_fractions = {
    ...initialState(c.id, "equivalent_fractions"),
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
  saveLearner(c.id, l);
  let s = startSession(c, "lesson");
  s = advanceSession(c, s.id, {
    action: "answer",
    version: s.version,
    answer: s.question.answer,
  });
  s = advanceSession(c, s.id, { action: "continue", version: s.version });
  s = advanceSession(c, s.id, {
    action: "answer",
    version: s.version,
    answer: s.question.answer,
  });
  s = advanceSession(c, s.id, { action: "continue", version: s.version });
  assert.equal(s.state, "PROBE");
  assert.equal(s.question.conceptId, "equivalent_fractions");
  assert.ok(
    eventsFor(c.id).some((e) => e.type === "probe_asked"),
    "probe is logged",
  );
});

test("reasoning and confidence notes are stored; teach-back never moves mastery", () => {
  const user = register("Notes", "notes@test.local", "long-password-123");
  const c = createChild(user.id, {
    nickname: "Leo",
    age: 10,
    grade: 4,
    goal: "Build confidence",
  });
  let s = startSession(c, "lesson");
  s = advanceSession(c, s.id, {
    action: "note",
    version: s.version,
    confidence: "pretty_sure",
    note: "I counted the equal parts first.",
  });
  assert.ok(eventsFor(c.id).some((e) => e.type === "confidence_reported"));
  assert.ok(eventsFor(c.id).some((e) => e.type === "student_reasoning"));
  assert.throws(() =>
    advanceSession(c, s.id, {
      action: "explain",
      version: s.version,
      note: "Both bars cover the same amount.",
    }),
  );

  const c2 = createChild(user.id, {
    nickname: "Maya",
    age: 9,
    grade: 4,
    goal: "Build confidence",
  });
  const l = emptyLearner();
  l.states.equivalent_fractions = {
    ...initialState(c2.id, "equivalent_fractions"),
    masteryScore: 0.8,
    successfulIndependentAttempts: 2,
  };
  saveLearner(c2.id, l);
  let t = startSession(c2, "lesson", "equivalent_fractions");
  assert.equal(t.decision.nextAssessmentType, "teachback");
  const before = learnerFor(c2.id).states.equivalent_fractions.masteryScore;
  t = advanceSession(c2, t.id, {
    action: "explain",
    version: t.version,
    note: "Two quarters cover the same as one half.",
  });
  assert.ok(eventsFor(c2.id).some((e) => e.type === "teachback_response"));
  assert.equal(
    learnerFor(c2.id).states.equivalent_fractions?.masteryScore,
    before,
  );
  assert.ok(getQuestion("equivalent_fractions", 0));
});
