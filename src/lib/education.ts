import { conceptById, gradeQuestion } from "./curriculum";
import type { Question } from "./types";

// Educational truth is learner-independent. Personalization may select a
// representation or scaffold, but it cannot alter these requirements.
export function educationalTruthFor(skillId: string) {
  const concept = conceptById[skillId];
  if (!concept) throw Error(`Unknown curriculum skill: ${skillId}`);
  return Object.freeze({
    skillId: concept.id,
    subject: concept.subject,
    domain: concept.domain,
    gradeBand: concept.gradeBand,
    learningObjectives: [...concept.learningObjectives],
    prerequisites: [...concept.prerequisites],
    misconceptionIds: [...concept.misconceptionIds],
    approvedStrategies: [...concept.teachingStrategyIds],
  });
}

export function assessStudentResponse(question: Question, answer: string) {
  return gradeQuestion(question, answer);
}
