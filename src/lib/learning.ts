import { conceptById, concepts } from "./curriculum";
import {
  Child,
  Decision,
  Domain,
  Insight,
  Learner,
  LearnerConceptState,
  LessonPlan,
  MisconceptionState,
  Question,
  Strategy,
  TeachingEvidence,
  strategyNames,
} from "./types";
import { gradeAnswer } from "./math";
export const emptyLearner = (): Learner => ({
  states: {},
  strategies: [],
  misconceptions: [],
});
export function initialState(
  childId: string,
  conceptId: string,
): LearnerConceptState {
  return {
    childId,
    conceptId,
    masteryScore: 0.25,
    masteryConfidence: 0,
    successfulIndependentAttempts: 0,
    assistedAttempts: 0,
    incorrectAttempts: 0,
    lastPracticedAt: null,
    lastMasteredAt: null,
    scaffoldingLevel: 2,
    nextReviewAt: null,
    reviewStage: 0,
    evidence: [],
  };
}
export function masteryLabel(s?: LearnerConceptState) {
  return !s || !s.evidence.length
    ? "Not started"
    : s.masteryScore >= 0.75 && s.successfulIndependentAttempts >= 3
      ? "Secure"
      : s.masteryScore >= 0.4
        ? "Developing"
        : "Emerging";
}
export function updateMastery(
  state: LearnerConceptState,
  correct: boolean,
  assistance: number,
  transfer: boolean,
  strategy: Strategy,
  questionId: string,
  sessionId: string,
  now = new Date(),
): LearnerConceptState {
  const s = structuredClone(state),
    delta = correct
      ? assistance >= 2
        ? 0.01
        : assistance === 1
          ? 0.04
          : transfer
            ? 0.12
            : 0.08
      : -0.04;
  s.masteryScore = Math.max(0, Math.min(1, s.masteryScore + delta));
  s.masteryConfidence = Math.min(0.95, s.masteryConfidence + 0.07);
  s.lastPracticedAt = now.toISOString();
  if (correct && assistance === 0) s.successfulIndependentAttempts++;
  else if (correct) s.assistedAttempts++;
  else s.incorrectAttempts++;
  s.scaffoldingLevel = s.masteryScore < 0.35 ? 2 : s.masteryScore < 0.7 ? 1 : 0;
  if (s.masteryScore >= 0.75 && s.successfulIndependentAttempts >= 3)
    s.lastMasteredAt = now.toISOString();
  const due = s.nextReviewAt && new Date(s.nextReviewAt) <= now;
  if (correct && assistance === 0 && s.masteryScore >= 0.65) {
    if (due) s.reviewStage = Math.min(4, s.reviewStage + 1);
    if (!s.nextReviewAt || due)
      s.nextReviewAt = new Date(
        +now + [1, 3, 7, 14, 30][s.reviewStage] * 86400000,
      ).toISOString();
  } else if (!correct && s.nextReviewAt) {
    s.reviewStage = 0;
    s.nextReviewAt = new Date(+now + 86400000).toISOString();
  }
  s.evidence = [
    ...s.evidence,
    {
      at: now.toISOString(),
      questionId,
      correct,
      assistance,
      delta,
      strategy,
      sessionId,
    },
  ].slice(-100);
  return s;
}
export function updateStrategy(
  previous: TeachingEvidence | undefined,
  childId: string,
  strategyId: Strategy,
  conceptDomain: Domain,
  correct: boolean,
  delta: number,
  now = new Date(),
): TeachingEvidence {
  const e = previous
    ? { ...previous }
    : {
        childId,
        strategyId,
        conceptDomain,
        attempts: 0,
        successfulOutcomes: 0,
        unsuccessfulOutcomes: 0,
        averageImprovement: 0,
        confidence: 0,
        lastUsedAt: "",
      };
  e.averageImprovement =
    (e.averageImprovement * e.attempts + delta) / (e.attempts + 1);
  e.attempts++;
  if (correct) e.successfulOutcomes++;
  else e.unsuccessfulOutcomes++;
  e.confidence = Math.min(0.95, e.attempts / 10);
  e.lastUsedAt = now.toISOString();
  return e;
}
export function updateMisconception(
  previous: MisconceptionState | undefined,
  childId: string,
  q: Question,
  answer: string,
): MisconceptionState | null {
  if (!q.misconception) return null;
  const m = previous
    ? structuredClone(previous)
    : {
        childId,
        id: q.misconception.id,
        conceptId: q.conceptId,
        matches: 0,
        checks: 0,
        confidence: 0,
        confirmed: false,
        questionIds: [],
      };
  if (m.questionIds.includes(q.id)) return m;
  m.checks++;
  m.questionIds.push(q.id);
  if (gradeAnswer(answer, q.misconception.answer)) m.matches++;
  m.confidence =
    m.matches === 0
      ? 0
      : m.matches === 1
        ? 0.45
        : Math.min(0.92, 0.65 + 0.17 * (m.matches - 1));
  m.confidence *= m.matches / m.checks;
  m.confirmed = m.matches >= 2 && m.confidence >= 0.7;
  return m;
}
export function chooseDecision(
  learner: Learner,
  target: string,
  failures = 0,
  remainingMinutes = 10,
): Decision {
  const concept = conceptById[target],
    state = learner.states[target],
    mastery = state?.masteryScore ?? 0.25;
  const hypothesis = learner.misconceptions.find(
    (m) => concept.misconceptionIds.includes(m.id) && m.confidence >= 0.4,
  );
  const positive = learner.strategies
    .filter(
      (e) =>
        e.conceptDomain === concept.domain &&
        e.attempts >= 2 &&
        e.successfulOutcomes / e.attempts >= 0.65,
    )
    .sort(
      (a, b) =>
        b.averageImprovement +
        0.02 * b.confidence -
        (a.averageImprovement + 0.02 * a.confidence),
    )[0];
  let strategy: Strategy =
    mastery < 0.35
      ? "visual_fraction_model"
      : mastery < 0.7
        ? "guided_questioning"
        : "symbolic_first";
  let reason = `Current estimate suggests ${mastery < 0.35 ? "introducing the idea with concrete support" : mastery < 0.7 ? "guided practice" : "independent transfer"}.`;
  let personalization = "Let’s find a way that makes sense to you.";
  if (positive) {
    strategy = positive.strategyId;
    reason = `${strategyNames[strategy]} supported ${positive.successfulOutcomes} of ${positive.attempts} recent ${concept.domain.toLowerCase()} attempts.`;
    personalization =
      strategy === "visual_fraction_model"
        ? "The visual approach helped last time, so let’s start there."
        : `The ${strategyNames[strategy].toLowerCase()} approach helped last time. Let’s use it again.`;
  } else if (
    concept.domain === "Fractions" &&
    (learner.states.multiplication_by_4?.masteryScore ?? 0) >= 0.75
  ) {
    strategy = "symbolic_first";
    reason =
      "Multiplication is a relative strength; connect the fraction relationship to multiplication.";
    personalization =
      "Multiplication is one of your strengths. Let’s use it here.";
  }
  if (hypothesis) {
    strategy = "guided_questioning";
    reason = `Check the ${hypothesis.id} hypothesis with a fresh example before assigning a label.`;
    personalization =
      "Let’s check what happens when the size of the pieces changes.";
  }
  if (failures >= 2) {
    strategy = "prerequisite_review";
    reason =
      "Two consecutive difficulties: check a prerequisite before continuing.";
    personalization = "Let’s take one small step back, then try again.";
  }
  const recent = state?.evidence.slice(-2) ?? [];
  let scaffold = mastery < 0.35 ? 2 : mastery < 0.7 ? 1 : 0;
  if (
    recent.length === 2 &&
    recent.every((e) => e.correct && e.assistance > 0)
  ) {
    scaffold = 0;
    reason += " Two supported successes: check without support.";
    personalization =
      "You’re getting comfortable with the pictures. Let’s try one without them.";
  }
  if (remainingMinutes <= 2)
    reason += " Keep the final check short, then reflect.";
  return {
    targetConceptId: target,
    objective: concept.description,
    strategy,
    scaffoldingLevel: scaffold,
    difficulty:
      mastery > 0.7 ? "transfer" : mastery < 0.35 ? "introduce" : "practice",
    shouldProbePrerequisite: failures >= 2,
    reason,
    personalization,
  };
}
export function alternateStrategy(current: Strategy): Strategy {
  return current === "visual_fraction_model"
    ? "concrete_real_world_example"
    : current === "concrete_real_world_example"
      ? "worked_example"
      : "visual_fraction_model";
}
export function planLesson(
  child: Child,
  learner: Learner,
  now = new Date(),
): LessonPlan {
  const due = Object.values(learner.states)
    .filter((s) => s.nextReviewAt && new Date(s.nextReviewAt) <= now)
    .sort((a, b) => a.nextReviewAt!.localeCompare(b.nextReviewAt!))[0];
  const current = Object.values(learner.states)
    .filter((s) => s.evidence.length && s.masteryScore < 0.75)
    .sort((a, b) =>
      (b.lastPracticedAt ?? "").localeCompare(a.lastPracticedAt ?? ""),
    )[0];
  const eligible = concepts.filter(
    (c) =>
      c.gradeBand[0] <= child.grade &&
      masteryLabel(learner.states[c.id]) !== "Secure",
  );
  const latest = Object.values(learner.states)
    .filter((s) => s.lastPracticedAt)
    .sort((a, b) => b.lastPracticedAt!.localeCompare(a.lastPracticedAt!))[0];
  const advancement = latest && eligible.find((c) =>
    c.prerequisites.includes(latest.conceptId) &&
    c.prerequisites.every((p) => (learner.states[p]?.masteryScore ?? 0) >= 0.5)
  );
  let target =
    due?.conceptId ??
    current?.conceptId ??
    advancement?.id ??
    eligible.find((c) =>
      c.prerequisites.every(
        (p) => (learner.states[p]?.masteryScore ?? 0) >= 0.5,
      ),
    )?.id ??
    "equal_groups";
  let reason = due
    ? "A short review will help this idea stick."
    : current
      ? "Build on what you practiced last time."
      : "A good next step for your current understanding.";
  if (!due) {
    const gap = conceptById[target].prerequisites.find(
      (p) => learner.states[p] && learner.states[p].masteryScore < 0.35,
    );
    if (gap) {
      target = gap;
      reason = "Strengthen a foundation before building on it.";
    }
  }
  return {
    warmupConcept: conceptById[target].prerequisites[0] ?? target,
    reviewConcept: due?.conceptId ?? null,
    targetConcept: target,
    estimatedMinutes: 10,
    reason,
  };
}
export function diagnosticStart(grade: number) {
  return grade >= 5
    ? "adding_unlike"
    : grade >= 4
      ? "equivalent_fractions"
      : grade >= 3
        ? "fraction_meaning"
        : "multiplication_basics";
}
export function diagnosticNext(
  current: string,
  correct: boolean,
  visited: string[],
  grade: number,
): string {
  const c = conceptById[current];
  if (!correct) {
    const gap = c.prerequisites.find((p) => !visited.includes(p));
    if (gap) return gap;
  }
  if (correct) {
    const next = concepts.find(
      (x) =>
        x.prerequisites.includes(current) &&
        x.gradeBand[0] <= grade + 1 &&
        !visited.includes(x.id),
    );
    if (next) return next.id;
  }
  return (
    concepts.find((x) => x.gradeBand[0] <= grade && !visited.includes(x.id))
      ?.id ?? current
  );
}
export function deriveInsight(child: Child, learner: Learner): Insight {
  const winner = learner.strategies
    .filter((e) => e.attempts >= 3 && e.successfulOutcomes / e.attempts >= 0.65)
    .sort((a, b) => b.averageImprovement - a.averageImprovement)[0];
  if (!winner)
    return {
      title: "Still learning, together",
      observation: `Primer is still learning which teaching approaches work best for ${child.nickname}.`,
      adaptation:
        "A few short sessions will give us more evidence to work with.",
      confidence: "Early observations",
      attempts: 0,
    };
  const visual = winner.strategyId === "visual_fraction_model";
  return {
    title: visual
      ? "Seeing the idea is helping it click."
      : `${strategyNames[winner.strategyId]} are helping.`,
    observation: visual
      ? `${child.nickname} has recently been more successful with visual representations in ${winner.conceptDomain.toLowerCase()}.`
      : `${child.nickname} has recently responded well to ${strategyNames[winner.strategyId].toLowerCase()} in ${winner.conceptDomain.toLowerCase()}.`,
    adaptation: visual
      ? "Lessons will start with a visual model, then gently remove that support to check independent understanding."
      : `Primer will use ${strategyNames[winner.strategyId].toLowerCase()} for similar ideas and keep checking what works.`,
    confidence: winner.attempts >= 8 ? "A growing pattern" : "An early pattern",
    strategy: winner.strategyId,
    attempts: winner.attempts,
  };
}
