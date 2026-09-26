import type { AssessmentOutcome, PedagogicalMove, Strategy } from "../types";

// Configurable deterministic policy. Curriculum and grading remain in
// curriculum.ts; these values only control how Da Vinci responds to evidence.
export const teachingPolicy = {
  mastery: {
    veryLow: 0.35,
    strong: 0.7,
    secure: 0.75,
    max: 1,
  },
  evidence: {
    independentCorrect: 0.08,
    transferCorrect: 0.12,
    lightSupportCorrect: 0.04,
    heavySupportCorrect: 0.01,
    plausibleGuessCorrect: 0.05,
    incorrect: -0.04,
  },
  misconception: {
    firstSignalConfidence: 0.45,
    confirmationSignals: 2,
    confirmationConfidence: 0.7,
    resolutionCounterexamples: 2,
    resolvedConfidence: 0.15,
  },
  strategy: {
    evidenceThreshold: 2,
    preferredSuccessRate: 0.65,
    crossSubjectAttempts: 5,
    crossSubjectSuccessRate: 0.7,
  },
  remediationFailureCount: 2,
  fadeAfterSupportedSuccesses: 2,
} as const;

export function assessmentOutcome(input: {
  correct: boolean;
  assistance: number;
  transfer: boolean;
  confidence?: "unknown" | "low" | "medium" | "high";
}): AssessmentOutcome {
  if (!input.correct) return "incorrect";
  if (input.assistance > 0) return "assisted_success";
  if (input.confidence === "low") return "guessing";
  return input.transfer ? "transfer_success" : "independent_success";
}

export function masteryDeltaFor(outcome: AssessmentOutcome) {
  switch (outcome) {
    case "transfer_success":
      return teachingPolicy.evidence.transferCorrect;
    case "independent_success":
      return teachingPolicy.evidence.independentCorrect;
    case "guessing":
      return teachingPolicy.evidence.plausibleGuessCorrect;
    case "assisted_success":
      return teachingPolicy.evidence.lightSupportCorrect;
    case "incorrect":
      return teachingPolicy.evidence.incorrect;
  }
}

export function decisionMove(input: {
  mastery: number;
  failures: number;
  hasMisconceptionHypothesis: boolean;
  fadeSupport: boolean;
  strategy: Strategy;
  assessment: "probe" | "practice" | "transfer" | "teachback" | "remediation";
}): PedagogicalMove {
  if (input.failures >= teachingPolicy.remediationFailureCount)
    return "review_prerequisite";
  if (input.hasMisconceptionHypothesis) return "probe";
  if (input.fadeSupport) return "reduce_scaffolding";
  if (input.assessment === "teachback") return "ask_reasoning";
  if (input.assessment === "transfer") return "check_understanding";
  if (
    input.mastery < teachingPolicy.mastery.veryLow &&
    ["visual_fraction_model", "diagram_first", "manipulative"].includes(
      input.strategy,
    )
  )
    return "show_visual";
  return "explain";
}

export function difficultyFor(mastery: number): {
  level: 1 | 2 | 3;
  band: "introduce" | "practice" | "transfer";
} {
  if (mastery > teachingPolicy.mastery.strong)
    return { level: 3, band: "transfer" };
  if (mastery < teachingPolicy.mastery.veryLow)
    return { level: 1, band: "introduce" };
  return { level: 2, band: "practice" };
}

export function supportMove(
  kind: "hint" | "another" | "easier" | "show",
  hintLevel: number,
): PedagogicalMove {
  if (kind === "another") return "switch_strategy";
  if (kind === "show") return "show_visual";
  if (kind === "easier") return "worked_example";
  return hintLevel >= 4 ? "worked_example" : "hint";
}

export function strategyReason(
  strategy: Strategy,
  attempts: number,
  successes: number,
  scope: string,
) {
  return attempts
    ? `${strategy} has ${successes}/${attempts} successful outcomes for ${scope}.`
    : `${strategy} is eligible for this subject and teaching move.`;
}
