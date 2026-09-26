import { conceptById, concepts, gradeSkillAnswer } from "./curriculum";
import {
  AssessmentType,
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
  StudentStrength,
  Subject,
  TeachingEvidence,
  strategyNames,
} from "./types";
import {
  assessmentOutcome,
  decisionMove,
  difficultyFor,
  masteryDeltaFor,
  strategyReason,
  teachingPolicy,
} from "./teaching/policy";
import { strategyLibrary } from "./teaching/strategies";
export const emptyLearner = (): Learner => ({
  states: {},
  strategies: [],
  misconceptions: [],
  strengths: [],
  recentLearning: [],
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
    lastDemonstratedAt: null,
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
  context: {
    confidence?: "unknown" | "low" | "medium" | "high";
    reasoningQuality?: number;
  } = {},
): LearnerConceptState {
  const s = structuredClone(state),
    outcome = assessmentOutcome({
      correct,
      assistance,
      transfer,
      confidence: context.confidence,
    }),
    delta =
      outcome === "assisted_success" && assistance >= 2
        ? teachingPolicy.evidence.heavySupportCorrect
        : masteryDeltaFor(outcome);
  s.masteryScore = Math.max(0, Math.min(1, s.masteryScore + delta));
  s.masteryConfidence = Math.min(0.95, s.masteryConfidence + 0.07);
  s.lastPracticedAt = now.toISOString();
  if (correct) s.lastDemonstratedAt = now.toISOString();
  if (correct && assistance === 0) s.successfulIndependentAttempts++;
  else if (correct) s.assistedAttempts++;
  else s.incorrectAttempts++;
  s.scaffoldingLevel =
    s.masteryScore < teachingPolicy.mastery.veryLow
      ? 2
      : s.masteryScore < teachingPolicy.mastery.strong
        ? 1
        : 0;
  if (
    s.masteryScore >= teachingPolicy.mastery.secure &&
    s.successfulIndependentAttempts >= 3
  )
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
      outcome,
      reason:
        outcome === "transfer_success"
          ? "Correct on a transfer problem without assistance."
          : outcome === "independent_success"
            ? "Correct without assistance."
            : outcome === "assisted_success"
              ? `Correct with assistance level ${assistance}.`
              : outcome === "guessing"
                ? "Correct while reporting low confidence; verify independently."
                : "Incorrect response; mastery estimate reduced.",
      reasoningQuality: context.reasoningQuality,
      confidence: context.confidence,
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
  subject: Subject | "" = "",
  skillId?: string,
): TeachingEvidence {
  const e = previous
    ? {
        ...previous,
        subject: subject || previous.subject,
        skillOutcomes: { ...(previous.skillOutcomes ?? {}) },
        evidence: [...(previous.evidence ?? [])],
      }
    : {
        childId,
        strategyId,
        subject,
        conceptDomain,
        attempts: 0,
        successfulOutcomes: 0,
        unsuccessfulOutcomes: 0,
        averageImprovement: 0,
        confidence: 0,
        lastUsedAt: "",
        skillOutcomes: {},
        evidence: [],
      };
  e.averageImprovement =
    (e.averageImprovement * e.attempts + delta) / (e.attempts + 1);
  e.attempts++;
  if (correct) e.successfulOutcomes++;
  else e.unsuccessfulOutcomes++;
  e.confidence = Math.min(0.95, e.attempts / 10);
  e.lastUsedAt = now.toISOString();
  if (skillId) {
    const skill = e.skillOutcomes[skillId] ?? {
      attempts: 0,
      successes: 0,
      failures: 0,
      averageImprovement: 0,
    };
    skill.averageImprovement =
      (skill.averageImprovement * skill.attempts + delta) /
      (skill.attempts + 1);
    skill.attempts++;
    if (correct) skill.successes++;
    else skill.failures++;
    e.skillOutcomes[skillId] = skill;
  }
  e.evidence = [
    ...e.evidence,
    { at: now.toISOString(), skillId, correct, improvement: delta },
  ].slice(-60);
  return e;
}
export function updateMisconception(
  previous: MisconceptionState | undefined,
  childId: string,
  q: Question,
  answer: string,
): MisconceptionState | null {
  if (!q.misconception) return null;
  const timestamp = new Date().toISOString();
  const m = previous
    ? {
        ...structuredClone(previous),
        status:
          previous.status ?? (previous.confirmed ? "confirmed" : "suspected"),
        lastObservedAt: previous.lastObservedAt ?? null,
        resolvedAt: previous.resolvedAt ?? null,
        evidence: [...(previous.evidence ?? [])],
      }
    : {
        childId,
        id: q.misconception.id,
        conceptId: q.conceptId,
        matches: 0,
        checks: 0,
        confidence: 0,
        confirmed: false,
        questionIds: [],
        status: "suspected" as const,
        lastObservedAt: null,
        resolvedAt: null,
        evidence: [],
      };
  if (m.questionIds.includes(q.assessmentKey ?? q.id)) return m;
  m.checks++;
  m.questionIds.push(q.assessmentKey ?? q.id);
  const observed = gradeSkillAnswer(
    answer,
    q.misconception.answer,
    false,
    q.subject,
  );
  if (observed && m.status === "resolved") {
    m.matches = 0;
    m.checks = 1;
  }
  if (observed) m.matches++;
  if (observed) {
    m.lastObservedAt = timestamp;
    m.resolvedAt = null;
    m.confidence =
      m.matches === 1
        ? teachingPolicy.misconception.firstSignalConfidence
        : Math.min(0.92, 0.65 + 0.17 * (m.matches - 1));
    m.status =
      m.matches >= teachingPolicy.misconception.confirmationSignals &&
      m.confidence >= teachingPolicy.misconception.confirmationConfidence
        ? "confirmed"
        : "suspected";
  } else if (gradeSkillAnswer(answer, q.answer, q.exact, q.subject)) {
    m.confidence = Math.max(0, m.confidence * 0.55);
    const recentCounterexamples = [
      ...m.evidence,
      { observed: false, counterEvidence: true },
    ]
      .slice(-teachingPolicy.misconception.resolutionCounterexamples)
      .every((entry) => entry.counterEvidence === true);
    if (m.status === "confirmed" && recentCounterexamples) {
      m.status = "resolved";
      m.confidence = teachingPolicy.misconception.resolvedConfidence;
      m.resolvedAt = timestamp;
    }
  }
  m.confirmed = m.status === "confirmed";
  m.evidence = [
    ...m.evidence,
    {
      at: timestamp,
      questionId: q.assessmentKey ?? q.id,
      observed,
      counterEvidence:
        !observed && gradeSkillAnswer(answer, q.answer, q.exact, q.subject),
      confidence: m.confidence,
    },
  ].slice(-30);
  return m;
}
// Per-subject overview for home screens: how much is practiced and where the
// child left off. Never a score to optimize; just orientation.
export function subjectOverview(learner: Learner): {
  subject: Subject;
  practiced: number;
  lastSkillId: string | null;
}[] {
  const order: Subject[] = ["Math", "English", "Science", "Social Studies"];
  return order.map((subject) => {
    const states = Object.values(learner.states).filter(
      (s) => conceptById[s.conceptId]?.subject === subject,
    );
    const last = states
      .filter((s) => s.lastPracticedAt)
      .sort((a, b) => b.lastPracticedAt!.localeCompare(a.lastPracticedAt!))[0];
    return {
      subject,
      practiced: states.filter((s) => s.evidence.length > 0).length,
      lastSkillId: last?.conceptId ?? null,
    };
  });
}
// Weaknesses stay granular: specific struggling skills, never a whole subject.
export function weaknessesFor(
  learner: Learner,
  subject?: Subject,
): { skillId: string; mastery: number }[] {
  return Object.values(learner.states)
    .filter(
      (s) =>
        s.evidence.length > 0 &&
        s.masteryScore < 0.4 &&
        (!subject || conceptById[s.conceptId]?.subject === subject),
    )
    .map((s) => ({ skillId: s.conceptId, mastery: s.masteryScore }))
    .sort((a, b) => a.mastery - b.mastery);
}
// Ranked strategy options behind a decision, for the debugger and the
// parent views. Score matches the policy's own ordering.
export interface StrategyOption {
  strategyId: Strategy;
  score: number;
  attempts: number;
  rate: number;
  basis: "positive evidence" | "early evidence";
}
export function alternativesFor(
  learner: Learner,
  target: string,
  limit = 3,
): StrategyOption[] {
  const concept = conceptById[target];
  if (!concept) return [];
  return learner.strategies
    .filter(
      (e) =>
        e.conceptDomain === concept.domain &&
        (!e.subject || e.subject === concept.subject),
    )
    .map((e) => {
      const scoped = e.skillOutcomes?.[target];
      const attempts = scoped?.attempts ?? e.attempts;
      const successes = scoped?.successes ?? e.successfulOutcomes;
      const improvement = scoped?.averageImprovement ?? e.averageImprovement;
      return {
        strategyId: e.strategyId,
        score: improvement + 0.02 * e.confidence,
        attempts,
        rate: attempts ? successes / attempts : 0,
        basis:
          attempts >= teachingPolicy.strategy.evidenceThreshold &&
          successes / attempts >= teachingPolicy.strategy.preferredSuccessRate
            ? ("positive evidence" as const)
            : ("early evidence" as const),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
// Strengths are mastered skills reused as teaching anchors. Same-subject
// strengths apply directly; cross-subject transfer needs more evidence (P2).
export function strengthsFor(
  learner: Learner,
  subject?: Subject,
): StudentStrength[] {
  const derived = Object.values(learner.states)
    .filter(
      (s) =>
        s.masteryScore >= 0.75 &&
        (!subject || conceptById[s.conceptId]?.subject === subject),
    )
    .map((s) => ({
      childId: s.childId,
      skillId: s.conceptId,
      subject: conceptById[s.conceptId]?.subject ?? "Math",
      strengthConfidence: Math.min(0.95, s.masteryScore),
      independentCorrect: s.successfulIndependentAttempts,
      lastDemonstratedAt: s.lastDemonstratedAt ?? s.lastMasteredAt,
      evidenceReason: `${s.successfulIndependentAttempts} independent correct attempts at mastery ${s.masteryScore.toFixed(2)}.`,
    }))
    .sort((a, b) => b.strengthConfidence - a.strengthConfidence);
  return derived;
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
    (m) =>
      concept.misconceptionIds.includes(m.id) &&
      (m.status ?? (m.confirmed ? "confirmed" : "suspected")) !== "resolved" &&
      m.confidence >= 0.4,
  );
  const positive = learner.strategies
    .filter(
      (e) =>
        e.conceptDomain === concept.domain &&
        (!e.subject || e.subject === concept.subject) &&
        (e.skillOutcomes?.[target]?.attempts ?? e.attempts) >=
          teachingPolicy.strategy.evidenceThreshold &&
        (e.skillOutcomes?.[target]
          ? e.skillOutcomes[target].successes / e.skillOutcomes[target].attempts
          : e.successfulOutcomes / e.attempts) >=
          teachingPolicy.strategy.preferredSuccessRate,
    )
    .sort(
      (a, b) =>
        b.averageImprovement +
        0.02 * b.confidence -
        (a.averageImprovement + 0.02 * a.confidence),
    )[0];
  const independent = state?.successfulIndependentAttempts ?? 0;
  let strategy: Strategy =
    mastery < teachingPolicy.mastery.veryLow
      ? concept.subject === "Math"
        ? "visual_fraction_model"
        : concept.subject === "Science"
          ? "diagram_first"
          : "evidence_first"
      : mastery < teachingPolicy.mastery.strong
        ? "guided_questioning"
        : independent >= 2
          ? "teach_back"
          : "transfer_problem";
  let reason = `Current estimate suggests ${mastery < teachingPolicy.mastery.veryLow ? "introducing the idea with concrete support" : mastery < teachingPolicy.mastery.strong ? "guided practice" : "independent transfer"}.`;
  let personalization = "Let’s find a way that makes sense to you.";
  let strengthToLeverage: string | undefined;
  if (positive) {
    strategy = positive.strategyId;
    const scoped = positive.skillOutcomes?.[target];
    reason = scoped
      ? `${strategyNames[strategy]} supported ${scoped.successes} of ${scoped.attempts} attempts on this skill.`
      : `${strategyNames[strategy]} supported ${positive.successfulOutcomes} of ${positive.attempts} recent ${concept.domain.toLowerCase()} attempts.`;
    personalization =
      strategy === "visual_fraction_model"
        ? "The visual approach helped last time, so let’s start there."
        : `The ${strategyNames[strategy].toLowerCase()} approach helped last time. Let’s use it again.`;
  } else {
    const relevant = new Set(concept.prerequisites);
    for (const id of concept.prerequisites)
      for (const p of conceptById[id]?.prerequisites ?? []) relevant.add(p);
    if (concept.domain === "Fractions")
      for (const c of concepts)
        if (["Multiplication", "Division"].includes(c.domain))
          relevant.add(c.id);
    const anchor = strengthsFor(learner, concept.subject).find((s) =>
      relevant.has(s.skillId),
    );
    if (anchor) {
      const anchorName = conceptById[anchor.skillId]?.name ?? anchor.skillId;
      strengthToLeverage = anchor.skillId;
      strategy =
        concept.subject === "Math" ? "symbolic_first" : "evidence_first";
      reason = `${anchorName} is a relative strength; connect the new relationship to it.`;
      personalization = `${anchorName} is one of your strengths. Let’s use it here.`;
    } else if (!anchor) {
      // Cross-subject transfer needs more evidence before it applies.
      const cross = learner.strategies
        .filter(
          (e) =>
            e.subject &&
            e.subject !== concept.subject &&
            e.attempts >= teachingPolicy.strategy.crossSubjectAttempts &&
            e.successfulOutcomes / e.attempts >=
              teachingPolicy.strategy.crossSubjectSuccessRate,
        )
        .sort(
          (a, b) =>
            b.averageImprovement +
            0.02 * b.confidence -
            (a.averageImprovement + 0.02 * a.confidence),
        )[0];
      if (cross) {
        strategy = cross.strategyId;
        reason = `${strategyNames[strategy]} also helped in ${cross.subject} across ${cross.attempts} attempts.`;
        personalization =
          "This approach worked well in another subject. Let’s try it here.";
      }
    }
  }
  if (hypothesis) {
    strategy = "guided_questioning";
    reason = `Check the ${hypothesis.id} hypothesis with a fresh example before assigning a label.`;
    personalization =
      "Let’s check what happens when the size of the pieces changes.";
  }
  if (failures >= teachingPolicy.remediationFailureCount) {
    strategy = "prerequisite_review";
    reason =
      "Two consecutive difficulties: check a prerequisite before continuing.";
    personalization = "Let’s take one small step back, then try again.";
  }
  const recent = state?.evidence.slice(-2) ?? [];
  let scaffold =
    failures >= teachingPolicy.remediationFailureCount
      ? 5
      : mastery < teachingPolicy.mastery.veryLow
        ? 2
        : mastery < teachingPolicy.mastery.strong
          ? 1
          : 0;
  let reasoningProbe: string | undefined;
  if (failures === 1) reasoningProbe = "What part feels confusing right now?";
  if (
    recent.length === teachingPolicy.fadeAfterSupportedSuccesses &&
    recent.every((e) => e.correct && e.assistance > 0)
  ) {
    scaffold = 0;
    reason += " Two supported successes: check without support.";
    personalization =
      "You’re getting comfortable with the pictures. Let’s try one without them.";
    reasoningProbe =
      "You needed fewer hints this time — how did you figure that out?";
  }
  if (remainingMinutes <= 2)
    reason += " Keep the final check short, then reflect.";
  const weakestPrereq = concept.prerequisites
    .map((p) => ({ id: p, mastery: learner.states[p]?.masteryScore ?? 0 }))
    .sort((a, b) => a.mastery - b.mastery)[0];
  const evidenceCount = state?.evidence.length ?? 0;
  const nextAssessmentType: AssessmentType =
    failures >= teachingPolicy.remediationFailureCount
      ? "remediation"
      : mastery > teachingPolicy.mastery.strong && independent >= 2
        ? "teachback"
        : mastery > teachingPolicy.mastery.strong
          ? "transfer"
          : mastery < teachingPolicy.mastery.veryLow
            ? "probe"
            : "practice";
  const fadeSupport =
    recent.length === teachingPolicy.fadeAfterSupportedSuccesses &&
    recent.every((e) => e.correct && e.assistance > 0);
  const difficulty = difficultyFor(mastery);
  const alternativesConsidered = strategyLibrary
    .filter((candidate) => candidate.subjects.includes(concept.subject))
    .filter((candidate) => candidate.id !== strategy)
    .slice(0, 3)
    .map((candidate) => {
      const evidence = learner.strategies.find(
        (entry) =>
          entry.strategyId === candidate.id &&
          entry.conceptDomain === concept.domain &&
          (!entry.subject || entry.subject === concept.subject),
      );
      const scoped = evidence?.skillOutcomes?.[target];
      return {
        strategyId: candidate.id,
        reason: strategyReason(
          candidate.id,
          scoped?.attempts ?? evidence?.attempts ?? 0,
          scoped?.successes ?? evidence?.successfulOutcomes ?? 0,
          scoped ? "this skill" : concept.domain,
        ),
      };
    });
  return {
    targetSkillId: target,
    targetConceptId: target,
    objective: concept.description,
    strategyId: strategy,
    strategy,
    scaffoldingLevel: scaffold,
    pedagogicalMove: decisionMove({
      mastery,
      failures,
      hasMisconceptionHypothesis: Boolean(hypothesis),
      fadeSupport,
      strategy,
      assessment: nextAssessmentType,
    }),
    strengthToLeverage,
    prerequisiteToProbe:
      weakestPrereq && weakestPrereq.mastery < 0.7
        ? weakestPrereq.id
        : undefined,
    misconceptionToTest: hypothesis?.id,
    misconceptionToProbe: hypothesis?.id,
    nextAssessmentType,
    reasoningProbe,
    confidenceCheck:
      evidenceCount > 0 &&
      evidenceCount % 3 === 0 &&
      (state?.evidence[evidenceCount - 1]?.correct ?? false),
    difficulty: difficulty.level,
    difficultyBand: difficulty.band,
    shouldProbePrerequisite: failures >= teachingPolicy.remediationFailureCount,
    reason,
    personalization,
    alternativesConsidered,
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
  subjectParam?: Subject,
): LessonPlan {
  // Plan within one subject at a time. Without an explicit subject, continue
  // the stalest practiced subject; new subjects enter through explicit choice
  // or diagnosis, never by hijacking an in-progress subject.
  const practicedAt = (subject: Subject) =>
    Math.max(
      0,
      ...Object.values(learner.states)
        .filter((s) => conceptById[s.conceptId]?.subject === subject)
        .map((s) => Date.parse(s.lastPracticedAt ?? "") || 0),
    );
  const activeSubjects = [
    ...new Set(
      Object.values(learner.states).map(
        (s) => conceptById[s.conceptId]?.subject,
      ),
    ),
  ].filter((s): s is Subject => !!s);
  const subject =
    subjectParam ??
    activeSubjects.sort((a, b) => practicedAt(b) - practicedAt(a)).pop() ??
    "Math";
  const inGrade = (id: string) => {
    const c = conceptById[id];
    return (
      c?.subject === subject &&
      c.gradeBand[0] <= child.grade &&
      c.gradeBand[1] >= child.grade
    );
  };
  const eligible = concepts.filter((c) => inGrade(c.id));
  const due = Object.values(learner.states)
    .filter(
      (s) =>
        inGrade(s.conceptId) &&
        s.nextReviewAt &&
        new Date(s.nextReviewAt) <= now,
    )
    .sort((a, b) => a.nextReviewAt!.localeCompare(b.nextReviewAt!))[0];
  const current = Object.values(learner.states)
    .filter(
      (s) => inGrade(s.conceptId) && s.evidence.length && s.masteryScore < 0.75,
    )
    .sort((a, b) =>
      (b.lastPracticedAt ?? "").localeCompare(a.lastPracticedAt ?? ""),
    )[0];
  const target =
    due?.conceptId ??
    current?.conceptId ??
    eligible.find(
      (c) =>
        masteryLabel(learner.states[c.id]) !== "Secure" &&
        c.prerequisites.every(
          (p) => (learner.states[p]?.masteryScore ?? 0) >= 0.5,
        ),
    )?.id ??
    eligible.find((c) => masteryLabel(learner.states[c.id]) !== "Secure")?.id ??
    eligible[0]?.id;
  if (!target)
    throw Error(`No Grade ${child.grade} ${subject} curriculum is available.`);
  const gap = conceptById[target].prerequisites.find(
    (p) => learner.states[p] && learner.states[p].masteryScore < 0.35,
  );
  return {
    targetConcept: target,
    warmupConcept: gap ?? target,
    reviewConcept: due?.conceptId ?? null,
    estimatedMinutes: 10,
    reason: gap
      ? `Grade ${child.grade} ${subject}: briefly repair a prerequisite, then return to the grade-level target.`
      : due
        ? `Review this Grade ${child.grade} ${subject} idea to keep it secure.`
        : `Continue your Grade ${child.grade} ${subject} learning.`,
  };
}
export function diagnosticStart(grade: number, subject: Subject = "Math") {
  return (
    concepts.find((c) => c.subject === subject && c.gradeBand[0] === grade)
      ?.id ??
    concepts.find(
      (c) =>
        c.subject === subject &&
        c.gradeBand[0] <= grade &&
        c.gradeBand[1] >= grade,
    )!.id
  );
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
  return (
    concepts.find(
      (x) =>
        x.subject === c.subject &&
        x.gradeBand[0] <= grade &&
        x.gradeBand[1] >= grade &&
        !visited.includes(x.id),
    )?.id ?? current
  );
}

export function deriveInsight(child: Child, learner: Learner): Insight {
  const winner = learner.strategies
    .filter((e) => e.attempts >= 3 && e.successfulOutcomes / e.attempts >= 0.65)
    .sort((a, b) => b.averageImprovement - a.averageImprovement)[0];
  if (!winner)
    return {
      title: "Still learning, together",
      observation: `Da Vinci is still learning which teaching approaches work best for ${child.nickname}.`,
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
      : `Da Vinci will use ${strategyNames[winner.strategyId].toLowerCase()} for similar ideas and keep checking what works.`,
    confidence: winner.attempts >= 8 ? "A growing pattern" : "An early pattern",
    strategy: winner.strategyId,
    attempts: winner.attempts,
  };
}
