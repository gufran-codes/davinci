import { conceptById, getQuestion } from "../curriculum";
import type { Learner, LearningSession, Question, Strategy } from "../types";
import type { ReviewFrame } from "./types";

export type LearningEvidenceKind =
  | "understood"
  | "assisted_success"
  | "unsupported_answer"
  | "misconception"
  | "prerequisite_gap"
  | "uncertain";
export interface DiagnosticHypothesis {
  id: string;
  kind: "misconception" | "prerequisite_gap";
  skillId: string;
  confidence: number;
  evidence: { questionId: string; observation: string }[];
}
export interface SessionIntelligence {
  plan: {
    targetSkillId: string;
    currentSkillId: string;
    stage:
      | "diagnose"
      | "teach"
      | "guided"
      | "fade"
      | "independent"
      | "transfer_review"
      | "remediate"
      | "complete";
    objective: string;
    next: string;
    revisions: { stage: string; reason: string; questionId: string }[];
  };
  hypotheses: DiagnosticHypothesis[];
  diagnostic?: {
    hypothesisId: string;
    questionId: string;
    original: ReviewFrame;
  };
  observations: {
    questionId: string;
    skillId: string;
    kind: LearningEvidenceKind;
    reason: string;
    strategy: Strategy;
    assistance: number;
  }[];
  explanations: { questionId: string; strategy: Strategy; text: string }[];
  canvas: { labels: string[]; actions: string[] };
}

export function sessionIntelligence(
  s: LearningSession,
): SessionIntelligence | undefined {
  if (!s.teaching) return;
  return (s.teaching.intelligence ??= {
    plan: {
      targetSkillId: s.plan.targetConcept,
      currentSkillId: s.question.conceptId,
      stage: "diagnose",
      objective: s.decision.objective,
      next: "Check the learner’s starting point.",
      revisions: [],
    },
    hypotheses: [],
    observations: [],
    explanations: [],
    canvas: { labels: [], actions: [] },
  });
}

export function syncSessionPlan(s: LearningSession) {
  const brain = sessionIntelligence(s);
  if (!brain) return;
  const m = s.teaching!;
  const stage: SessionIntelligence["plan"]["stage"] =
    s.state === "COMPLETE"
      ? "complete"
      : brain.diagnostic
        ? "diagnose"
        : m.returnStack.length || s.state === "REMEDIATION"
          ? "remediate"
          : s.state === "SESSION_REVIEW"
            ? "transfer_review"
            : s.assistance === 0 &&
                (s.state === "MASTERY_CHECK" || s.question.transfer)
              ? "transfer_review"
              : s.assistance === 0 &&
                  (s.state === "INDEPENDENT_PRACTICE" ||
                    m.activeIndependentCheck)
                ? "independent"
                : m.pendingIndependentCheck
                  ? "fade"
                  : s.assistance > 0 &&
                      (s.state === "GUIDED_PRACTICE" || m.hintLevel > 0)
                    ? "guided"
                    : s.state === "TEACH" || s.assistance > 0
                      ? "teach"
                      : "diagnose";
  const next = {
    diagnose:
      "Distinguish what is known from a misconception or missing foundation.",
    teach: "Try one relevant representation, then ask the learner to use it.",
    guided: "Offer the smallest useful step and observe the response.",
    fade: "Remove help and verify the same skill with a fresh question.",
    independent:
      "Observe without coaching; any help makes this an assisted attempt.",
    transfer_review:
      "Check the idea in a new setting and schedule later retrieval.",
    remediate: `Rebuild ${conceptById[s.question.conceptId].name}, then return to ${conceptById[s.plan.targetConcept].name}.`,
    complete: "Save evidence for the next lesson and later review.",
  }[stage];
  if (
    brain.plan.stage !== stage ||
    brain.plan.currentSkillId !== s.question.conceptId ||
    !brain.plan.revisions.length
  ) {
    brain.plan.revisions = [
      ...brain.plan.revisions,
      { stage, reason: next, questionId: s.question.id },
    ].slice(-20);
  }
  Object.assign(brain.plan, {
    stage,
    currentSkillId: s.question.conceptId,
    objective: s.decision.objective,
    next,
  });
}

export function observeAssessment(
  s: LearningSession,
  learner: Learner,
  q: Question,
  answer: string,
  correct: boolean,
  reasoningQuality: number,
) {
  const brain = sessionIntelligence(s)!;
  if (brain.observations.some((o) => o.questionId === q.id)) return;
  const pattern =
    !correct &&
    q.misconception?.answer.toLowerCase() === answer.trim().toLowerCase();
  const kind: LearningEvidenceKind = correct
    ? s.assistance > 0
      ? "assisted_success"
      : reasoningQuality >= 0.65
        ? "understood"
        : "unsupported_answer"
    : pattern
      ? "misconception"
      : s.state === "REMEDIATION"
        ? "prerequisite_gap"
        : "uncertain";
  const reasons: Record<LearningEvidenceKind, string> = {
    understood:
      "Correct without help, with reasoning that meets the question rubric.",
    assisted_success: "Correct with support; needs a fresh independent check.",
    unsupported_answer:
      "Correct without a sufficient explanation; this alone does not establish understanding or guessing.",
    misconception:
      "Answer matches a known error pattern; a distinct probe is needed.",
    prerequisite_gap: "An earlier building block was answered incorrectly.",
    uncertain:
      "Incorrect response without enough evidence to identify the cause.",
  };
  brain.observations = [
    ...brain.observations,
    {
      questionId: q.id,
      skillId: q.conceptId,
      kind,
      reason: reasons[kind],
      strategy: s.decision.strategy,
      assistance: s.assistance,
    },
  ].slice(-40);
  if (!correct && !brain.diagnostic) {
    const concept = conceptById[q.conceptId];
    const ids = [
      ...concept.misconceptionIds,
      ...(q.misconception ? [q.misconception.id] : []),
    ];
    for (const id of [...new Set(ids)].slice(0, 3)) {
      let h = brain.hypotheses.find((h) => h.id === id);
      if (!h) {
        h = {
          id,
          kind: "misconception",
          skillId: q.conceptId,
          confidence: 0.25,
          evidence: [],
        };
        brain.hypotheses.push(h);
      }
      if (pattern && q.misconception?.id === id)
        h.confidence = Math.min(0.85, h.confidence + 0.2);
      h.evidence = [
        ...h.evidence,
        {
          questionId: q.id,
          observation:
            pattern && q.misconception?.id === id
              ? "Matched error pattern; not confirmation."
              : "Incorrect response; cause uncertain.",
        },
      ].slice(-8);
    }
    for (const id of concept.prerequisites.slice(0, 3)) {
      if (!brain.hypotheses.some((h) => h.id === `gap:${id}`))
        brain.hypotheses.push({
          id: `gap:${id}`,
          kind: "prerequisite_gap",
          skillId: id,
          confidence: learner.states[id]?.evidence.length
            ? Math.max(0.1, 1 - learner.states[id].masteryScore)
            : 0.35,
          evidence: [
            {
              questionId: q.id,
              observation: "Possible missing foundation; needs a direct check.",
            },
          ],
        });
    }
  }
  if (correct && s.assistance === 0 && q.misconception) {
    const h = brain.hypotheses.find((h) => h.id === q.misconception!.id);
    if (h) {
      h.confidence = Math.max(0.05, h.confidence - 0.2);
      h.evidence = [
        ...h.evidence,
        {
          questionId: q.id,
          observation: "Independent answer contradicts this error pattern.",
        },
      ].slice(-8);
    }
  }
  if (brain.diagnostic?.questionId === q.id && s.assistance === 0) {
    for (const h of brain.hypotheses) {
      if (h.id === brain.diagnostic.hypothesisId) {
        h.confidence = Math.max(
          0.05,
          Math.min(0.95, h.confidence + (correct ? -0.3 : 0.25)),
        );
        h.evidence = [
          ...h.evidence,
          {
            questionId: q.id,
            observation: correct
              ? "Independent diagnostic counterevidence."
              : "Independent diagnostic supports further investigation.",
          },
        ].slice(-8);
      }
    }
  }
  brain.hypotheses = brain.hypotheses.slice(-10);
}

// Probe a missing foundation without teaching it first. A successful probe
// returns to the original skill; a failed probe becomes targeted remediation.
export function startDiagnosticProbe(s: LearningSession) {
  const brain = sessionIntelligence(s);
  if (
    !brain ||
    brain.diagnostic ||
    s.failures < 2 ||
    s.teaching!.returnStack.length ||
    !brain.hypotheses.some(
      (h) => h.kind === "misconception" && h.confidence >= 0.45,
    )
  )
    return false;
  const hypothesis = brain.hypotheses
    .filter(
      (h) =>
        h.kind === "prerequisite_gap" &&
        !h.evidence.some((e) => e.observation.includes("diagnostic")),
    )
    .sort((a, b) => b.confidence - a.confidence)[0];
  if (!hypothesis) return false;
  const original = {
    skillId: s.question.conceptId,
    question: s.question,
    state: s.state,
    step: s.step,
    strategy: s.decision.strategy,
  };
  s.question = getQuestion(
    hypothesis.skillId,
    ++s.teaching!.responseOrdinal + 211,
  );
  brain.diagnostic = {
    hypothesisId: hypothesis.id,
    questionId: s.question.id,
    original,
  };
  s.state = "PROBE";
  s.assistance = 0;
  s.feedback = null;
  s.teaching!.hintLevel = 0;
  s.teaching!.checkpoint = undefined;
  Object.assign(s.decision, {
    targetSkillId: s.question.conceptId,
    targetConceptId: s.question.conceptId,
    objective: conceptById[s.question.conceptId].description,
    strategy: "retrieval_practice",
    strategyId: "retrieval_practice",
    scaffoldingLevel: 0,
    pedagogicalMove: "probe",
    reason:
      "A targeted foundation question will distinguish a prerequisite gap from difficulty with the original concept.",
  });
  syncSessionPlan(s);
  return true;
}

export function finishDiagnosticProbe(s: LearningSession, correct: boolean) {
  const brain = sessionIntelligence(s);
  if (!brain?.diagnostic || brain.diagnostic.questionId !== s.question.id)
    return false;
  const { original } = brain.diagnostic;
  s.teaching!.returnStack.push(original);
  brain.diagnostic = undefined;
  if (!correct || s.assistance > 0) {
    s.state = "REMEDIATION";
    s.assistance = 2;
    s.decision.pedagogicalMove = "review_prerequisite";
    s.decision.strategy = s.decision.strategyId = "prerequisite_review";
    s.decision.scaffoldingLevel = 2;
    s.decision.reason =
      "The foundation probe needs support; rebuild it before returning to the target.";
  }
  return true;
}

export function compactWorkingMemory(s: LearningSession) {
  const brain = sessionIntelligence(s);
  if (!brain) return null;
  return {
    plan: { ...brain.plan, revisions: brain.plan.revisions.slice(-3) },
    hypotheses: brain.hypotheses
      .slice(-4)
      .map((h) => ({ ...h, evidence: h.evidence.slice(-2) })),
    observations: brain.observations.slice(-6),
    explanations: brain.explanations.slice(-3),
    canvas: brain.canvas,
  };
}
