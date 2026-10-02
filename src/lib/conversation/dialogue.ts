import type { LearningSession } from "../types";
import { guidedSteps } from "../teaching/guided-steps";

// The task on the board and the question the tutor just asked need not be the
// same. Keep this derived from persisted session state, not an LLM guess.
export function dialogueFocus(session: LearningSession) {
  const memory = session.teaching;
  if (memory?.paused)
    return { kind: "resume", prompt: "Say continue when you’re ready." };
  if (session.state === "COMPLETE")
    return { kind: "complete", prompt: "The lesson is saved." };
  if (session.state === "SESSION_REVIEW")
    return {
      kind: "reflection",
      prompt:
        "Did this feel a little clearer, ready for more, or still tricky?",
    };
  if (memory?.guidedPractice?.questionId === session.question.id) {
    const step = guidedSteps(session.question)[memory.guidedPractice.stepIndex];
    if (step) return { kind: "guided_step", prompt: step.prompt };
  }
  if (memory?.checkpoint?.questionId === session.question.id)
    return { kind: "observation", prompt: memory.checkpoint.prompt };
  if (memory?.awaitingReasoning)
    return { kind: "reasoning", prompt: "How did you figure it out?" };
  return { kind: "answer", prompt: session.question.prompt };
}
