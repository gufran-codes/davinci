import { test } from "node:test";
import assert from "node:assert/strict";
import { concepts, conceptById, getQuestion } from "../src/lib/curriculum";
import {
  chooseDecision,
  diagnosticNext,
  emptyLearner,
  initialState,
  planLesson,
  updateMastery,
  updateMisconception,
  updateStrategy,
  deriveInsight,
} from "../src/lib/learning";
import { gradeAnswer, parseMath } from "../src/lib/math";
import { authoredContent } from "../src/lib/tutor";
import { Child, LearningSession } from "../src/lib/types";
const child: Child = {
  id: "test-child",
  parentId: "parent",
  nickname: "Maya",
  age: 9,
  grade: 4,
  goal: "Build confidence",
  diagnosticComplete: true,
  createdAt: new Date().toISOString(),
};
test("all 26 concepts have valid prerequisites and authored items with correct bounded math", () => {
  assert.equal(concepts.length, 26);
  for (const c of concepts) {
    for (const p of c.prerequisites) assert.ok(conceptById[p]);
    for (let i = 0; i < 7; i++) {
      const q = getQuestion(c.id, i, i > 4);
      assert.ok(q.prompt && q.hint && q.explanation && q.concrete);
      assert.ok(gradeAnswer(q.answer, q.answer, q.exact));
    }
  }
  const visit = (id: string, seen: string[]) => {
    assert.ok(!seen.includes(id), "graph must be acyclic");
    for (const p of conceptById[id].prerequisites) visit(p, [...seen, id]);
  };
  for (const c of concepts) visit(c.id, []);
});
test("math normalizes fractions and evaluates bounded expressions without eval", () => {
  assert.ok(gradeAnswer("2/4", "1/2"));
  assert.ok(gradeAnswer("1/3 + 1/6", "1/2"));
  assert.ok(gradeAnswer("(2+1)/6", "1/2"));
  assert.ok(!gradeAnswer("2/4", "1/2", true));
  assert.equal(parseMath("1/0"), null);
  assert.equal(parseMath("process.exit()"), null);
  assert.equal(parseMath("1e2"), null);
  assert.ok(!gradeAnswer("3/8", "2/3"));
});
test("independent transfer success outweighs hints, scores are bounded, evidence retained", () => {
  const s = initialState(child.id, "equivalent_fractions");
  const independent = updateMastery(
      s,
      true,
      0,
      true,
      "symbolic_first",
      "q1",
      "session",
    ),
    hinted = updateMastery(
      s,
      true,
      1,
      true,
      "guided_questioning",
      "q1",
      "session",
    ),
    worked = updateMastery(s, true, 2, true, "worked_example", "q1", "session");
  assert.ok(
    independent.masteryScore > hinted.masteryScore &&
      hinted.masteryScore > worked.masteryScore,
  );
  assert.equal(independent.evidence[0].delta, 0.12);
  assert.equal(
    updateMastery(
      { ...s, masteryScore: 0.99 },
      true,
      0,
      true,
      "symbolic_first",
      "q",
      "s",
    ).masteryScore,
    1,
  );
});
test("misconceptions require distinct confirming questions and contrary evidence lowers confidence", () => {
  const q = getQuestion("compare_same_numerator", 0),
    q2 = getQuestion("compare_same_numerator", 1),
    q3 = getQuestion("compare_same_numerator", 2);
  const first = updateMisconception(
    undefined,
    child.id,
    q,
    q.misconception!.answer,
  )!;
  assert.equal(first.confirmed, false);
  assert.equal(first.confidence, 0.45);
  const duplicate = updateMisconception(
    first,
    child.id,
    q,
    q.misconception!.answer,
  )!;
  assert.equal(duplicate.matches, 1);
  const second = updateMisconception(
    first,
    child.id,
    q2,
    q2.misconception!.answer,
  )!;
  assert.ok(second.confirmed);
  const third = updateMisconception(second, child.id, q3, q3.answer)!;
  assert.ok(third.confidence < second.confidence);
});
test("the same concept produces different strategy and representation for different evidence", () => {
  const maya = emptyLearner();
  maya.strategies.push({
    ...updateStrategy(
      undefined,
      child.id,
      "visual_fraction_model",
      "Fractions",
      true,
      0.04,
    ),
    attempts: 5,
    successfulOutcomes: 5,
  });
  const adam = emptyLearner();
  adam.states.multiplication_by_4 = {
    ...initialState("adam", "multiplication_by_4"),
    masteryScore: 0.85,
  };
  const sofia = emptyLearner();
  sofia.misconceptions.push({
    childId: "sofia",
    id: "different_means_unequal",
    conceptId: "equivalent_fractions",
    matches: 1,
    checks: 1,
    confidence: 0.45,
    confirmed: false,
    questionIds: ["a"],
  });
  assert.equal(
    chooseDecision(maya, "equivalent_fractions").strategy,
    "visual_fraction_model",
  );
  assert.equal(
    chooseDecision(adam, "equivalent_fractions").strategy,
    "symbolic_first",
  );
  assert.equal(
    chooseDecision(sofia, "equivalent_fractions").strategy,
    "guided_questioning",
  );
  const base = {
    question: getQuestion("equivalent_fractions"),
    state: "TEACH",
    assistance: 1,
  } as LearningSession;
  assert.ok(
    authoredContent({
      ...base,
      decision: chooseDecision(maya, "equivalent_fractions"),
    }).ui.length,
  );
  assert.equal(
    authoredContent({
      ...base,
      decision: chooseDecision(adam, "equivalent_fractions"),
    }).ui.length,
    0,
  );
});
test("a successful alternate changes future preference and creates a grounded parent insight", () => {
  const l = emptyLearner();
  l.states.multiplication_by_4 = {
    ...initialState(child.id, "multiplication_by_4"),
    masteryScore: 0.85,
  };
  assert.equal(
    chooseDecision(l, "equivalent_fractions").strategy,
    "symbolic_first",
  );
  l.strategies.push(
    updateStrategy(
      undefined,
      child.id,
      "symbolic_first",
      "Fractions",
      false,
      -0.04,
    ),
  );
  let e = updateStrategy(
    undefined,
    child.id,
    "visual_fraction_model",
    "Fractions",
    true,
    0.04,
  );
  for (let i = 0; i < 3; i++)
    e = updateStrategy(e, child.id, e.strategyId, e.conceptDomain, true, 0.04);
  l.strategies.push(e);
  assert.equal(
    chooseDecision(l, "generate_equivalent").strategy,
    "visual_fraction_model",
  );
  assert.match(
    chooseDecision(l, "generate_equivalent").personalization,
    /helped last time/,
  );
  assert.equal(deriveInsight(child, l).strategy, "visual_fraction_model");
  assert.equal(deriveInsight(child, emptyLearner()).attempts, 0);
});
test("planner prioritizes overdue retention, and failed recall shortens interval", () => {
  const l = emptyLearner(),
    s = initialState(child.id, "multiplication_by_4");
  s.nextReviewAt = "2020-01-01T00:00:00Z";
  s.masteryScore = 0.8;
  s.reviewStage = 3;
  l.states[s.conceptId] = s;
  assert.equal(planLesson(child, l).targetConcept, s.conceptId);
  const now = new Date("2026-09-16T12:00:00Z");
  const failed = updateMastery(
    s,
    false,
    0,
    false,
    "symbolic_first",
    "q",
    "s",
    now,
  );
  assert.equal(failed.reviewStage, 0);
  assert.equal(failed.nextReviewAt, "2026-09-17T12:00:00.000Z");
  const success = updateMastery(
    s,
    true,
    0,
    false,
    "symbolic_first",
    "q",
    "s",
    now,
  );
  assert.equal(success.reviewStage, 4);
  assert.equal(success.nextReviewAt, "2026-10-16T12:00:00.000Z");
});
test("diagnostic branches down prerequisites and up to related concepts", () => {
  assert.equal(
    diagnosticNext("adding_unlike", false, [], 5),
    "common_denominators",
  );
  assert.equal(
    diagnosticNext("common_denominators", false, [], 4),
    "generate_equivalent",
  );
  assert.equal(diagnosticNext("fraction_meaning", true, [], 4), "numerator");
});
test("two consecutive failures probe foundations; two assisted successes fade help", () => {
  const l = emptyLearner();
  assert.ok(
    chooseDecision(l, "equivalent_fractions", 2).shouldProbePrerequisite,
  );
  let s = initialState(child.id, "equivalent_fractions");
  s = updateMastery(s, true, 1, false, "visual_fraction_model", "q1", "s");
  s = updateMastery(s, true, 1, false, "visual_fraction_model", "q2", "s");
  l.states[s.conceptId] = s;
  assert.equal(chooseDecision(l, s.conceptId).scaffoldingLevel, 0);
});
