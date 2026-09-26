import { test } from "node:test";
import assert from "node:assert/strict";
import { getQuestion } from "../src/lib/curriculum";
import {
  chooseDecision,
  emptyLearner,
  initialState,
  weaknessesFor,
} from "../src/lib/learning";
import { authoredContent } from "../src/lib/tutor";
import { buildTeachingState, provider } from "../src/server/provider";
import { LearningSession } from "../src/lib/types";

const sessionFor = (conceptId: string, state = "TEACH"): LearningSession =>
  ({
    id: "s",
    childId: "c",
    kind: "lesson",
    state,
    step: 0,
    version: 0,
    plan: {
      warmupConcept: conceptId,
      reviewConcept: null,
      targetConcept: conceptId,
      estimatedMinutes: 10,
      reason: "test",
    },
    decision: chooseDecision(emptyLearner(), conceptId),
    question: getQuestion(conceptId, 0),
    assistance: 0,
    failures: 0,
    successes: 0,
    answeredConcepts: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    correct: 0,
    attempts: 0,
    feedback: null,
  }) as LearningSession;

test("weaknesses stay granular and need real evidence", () => {
  const l = emptyLearner();
  l.states.science_energy_forms = {
    ...initialState("c", "science_energy_forms"),
    masteryScore: 0.3,
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
  l.states.social_map_skills = {
    ...initialState("c", "social_map_skills"),
    masteryScore: 0.2,
  };
  assert.deepEqual(
    weaknessesFor(l).map((w) => w.skillId),
    ["science_energy_forms"],
  );
});

test("teaching state carries policy evidence but no identity or transcripts", () => {
  const l = emptyLearner();
  l.states.multiplication_by_4 = {
    ...initialState("c", "multiplication_by_4"),
    masteryScore: 0.85,
  };
  l.recentLearning.push({
    id: "memory-1",
    childId: "c",
    sessionId: "previous",
    skillId: "multiplication_by_4",
    kind: "assessment",
    summary: "Solved multiplication independently.",
    evidence: { correct: true, assistance: 0 },
    createdAt: new Date().toISOString(),
  });
  const s = sessionFor("equivalent_fractions");
  const state = buildTeachingState(s, l, { grade: 4, age: 9 });
  assert.equal(state.subject, "Math");
  assert.equal(state.targetSkill, "equivalent_fractions");
  assert.equal(state.mastery, 0.25);
  assert.deepEqual(state.student, { grade: 4, age: 9 });
  assert.ok(state.strengths.some((x) => x.skill === "multiplication_by_4"));
  assert.equal(state.interactionRule, "ask_before_telling");
  assert.equal(state.selectedStrategy, s.decision.strategy);
  assert.ok(state.prerequisites?.some((x) => x.skill === "fraction_meaning"));
  assert.equal(state.decision?.reason, s.decision.reason);
  assert.equal(state.recentLearning?.length, 1);
  const raw = JSON.stringify(state);
  assert.ok(!raw.includes("Maya") && !raw.includes("Parent"));
});

test("local renderer works without a key and adapts by subject and assessment", async () => {
  const local = provider();
  assert.equal(local.constructor.name, "LocalTutorProvider");
  const math = await local.render(
    sessionFor("equivalent_fractions"),
    emptyLearner(),
    { grade: 4, age: 9 },
  );
  assert.ok(math.message.length > 0);

  const english = sessionFor("ela_reading_inference");
  english.decision.strategy = "symbolic_first";
  const rendered = await local.render(english, emptyLearner(), {
    grade: 4,
    age: 9,
  });
  assert.match(rendered.message, /words/);

  const vocab = await local.render(
    sessionFor("ela_vocabulary_context"),
    emptyLearner(),
    { grade: 4, age: 9 },
  );
  assert.equal(vocab.expectedResponseType, "text");

  const mastery = sessionFor("equivalent_fractions", "MASTERY_CHECK");
  mastery.decision = {
    ...mastery.decision,
    strategy: "guided_questioning",
    nextAssessmentType: "teachback",
  };
  const teachback = await local.render(mastery, emptyLearner(), {
    grade: 4,
    age: 9,
  });
  assert.match(teachback.message, /teach it back/);
  assert.equal(
    authoredContent(sessionFor("generate_equivalent")).expectedResponseType,
    "math",
  );
});
