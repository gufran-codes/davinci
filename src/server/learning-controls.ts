import { z } from "zod";
import { one, run } from "./db";
import type { LearningSession } from "../lib/types";
import { memoryFor } from "../lib/teaching/adaptive";
export const learningControlsSchema = z.object({
  policy: z.enum(["immediate", "after_attempts", "disabled"]),
  minimumAttempts: z.number().int().min(1).max(5),
});
export type LearningControls = z.infer<typeof learningControlsSchema>;
export function controlsFor(childId: string): LearningControls {
  return (
    one<LearningControls>(
      "SELECT policy,minimum_attempts AS minimumAttempts FROM learning_controls WHERE child_id=?",
      childId,
    ) ?? { policy: "after_attempts", minimumAttempts: 3 }
  );
}
export function saveControls(childId: string, input: LearningControls) {
  const data = learningControlsSchema.parse(input);
  run(
    "INSERT INTO learning_controls VALUES(?,?,?) ON CONFLICT(child_id) DO UPDATE SET policy=excluded.policy,minimum_attempts=excluded.minimum_attempts",
    childId,
    data.policy,
    data.minimumAttempts,
  );
  return data;
}
export function questionKey(s: LearningSession) {
  return s.question.assessmentKey ?? s.question.id.split(":retry")[0];
}
export function answerAccess(s: LearningSession) {
  const controls = controlsFor(s.childId),
    memory = memoryFor(s),
    key = questionKey(s);
  const attempts = memory.genuineAttempts[key] ?? 0;
  const masteryCheck =
    s.state === "MASTERY_CHECK" || Boolean(memory.activeIndependentCheck);
  return {
    masteryCheck,
    policy: controls.policy,
    attempts,
    remaining:
      controls.policy === "after_attempts"
        ? Math.max(0, controls.minimumAttempts - attempts)
        : 0,
    allowed:
      !masteryCheck &&
      (controls.policy === "immediate" ||
        (controls.policy === "after_attempts" &&
          attempts >= controls.minimumAttempts)),
    revealed: memory.revealedQuestions.includes(key),
  };
}
