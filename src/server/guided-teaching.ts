import type { LearningSession } from "../lib/types";
import { guidedSteps, guidedValue } from "../lib/teaching/guided-steps";
import { memoryFor } from "../lib/teaching/adaptive";
import { event } from "./repository";
import { teachingPolicy } from "../lib/teaching/policy";

export function beginGuidedPractice(s: LearningSession) {
  const steps = guidedSteps(s.question);
  if (
    !steps.length ||
    s.feedback ||
    ["COMPLETE", "SESSION_REVIEW"].includes(s.state)
  )
    return null;
  const m = memoryFor(s);
  m.checkpoint = undefined;
  m.guidedPractice = { questionId: s.question.id, stepIndex: 0, failures: 0 };
  s.assistance = Math.max(
    teachingPolicy.guidedPractice.minimumAssistance,
    s.assistance,
  );
  s.decision.scaffoldingLevel = Math.max(
    teachingPolicy.guidedPractice.minimumAssistance,
    s.decision.scaffoldingLevel,
  );
  s.decision.pedagogicalMove = "hint";
  s.decision.reason = `The learner requested one step at a time. Check curriculum-backed substeps for ${s.question.conceptId}; preserve the selected ${s.decision.strategy} strategy and verify the full task afterwards.`;
  m.assistanceLedger.push({
    questionId: s.question.id,
    conceptId: s.question.conceptId,
    strategy: s.decision.strategy,
    kind: "hint",
    level: s.assistance,
    turn: m.reasoningPath.length,
    supportedSuccess: false,
    independentlyVerified: false,
  });
  m.assistanceLedger = m.assistanceLedger.slice(-40);
  event(s, "guided_practice_started", {
    questionId: s.question.id,
    strategy: s.decision.strategy,
    steps: steps.map((step) => step.id),
    masteryCredit: 0,
  });
  return `Let’s work through one step at a time. ${steps[0].prompt}`;
}

export function respondToGuidedStep(s: LearningSession, text: string) {
  const m = memoryFor(s),
    active = m.guidedPractice;
  const step =
    active && active.questionId === s.question.id
      ? guidedSteps(s.question)[active.stepIndex]
      : undefined;
  if (!active || !step) {
    m.guidedPractice = undefined;
    return null;
  }
  const value = guidedValue(text);
  if (value === null)
    return {
      text: `I’m asking about just this step. ${step.prompt}`,
      changeStrategy: false,
    };
  const correct = value === step.expected;
  event(s, "guided_step_checked", {
    questionId: s.question.id,
    stepId: step.id,
    proposed: value,
    expected: step.expected,
    correct,
    assistance: s.assistance,
    masteryCredit: 0,
  });
  if (!correct) {
    active.failures++;
    if (active.failures >= teachingPolicy.guidedPractice.failuresBeforeSwitch) {
      m.guidedPractice = undefined;
      return {
        text: "Let’s use a different view of this idea.",
        changeStrategy: true,
      };
    }
    return {
      text: `${step.check(value)} ${step.prompt}`,
      changeStrategy: false,
    };
  }
  active.stepIndex++;
  active.failures = 0;
  const next = guidedSteps(s.question)[active.stepIndex];
  if (next)
    return {
      text: `That step checks out. ${next.prompt}`,
      changeStrategy: false,
    };
  m.guidedPractice = undefined;
  s.decision.pedagogicalMove = "check_understanding";
  s.decision.reason =
    "The learner completed the supported substeps. Assess the original task as assisted practice before a fresh independent check.";
  return {
    text: `You worked through the steps. Now put them together: ${s.question.prompt}`,
    changeStrategy: false,
  };
}
