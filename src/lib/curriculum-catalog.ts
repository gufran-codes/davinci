import { concepts, getQuestion, gradeQuestion } from "./curriculum";
import { contentById } from "./teaching/content";
import type { Subject, Question } from "./types";
export const curriculumSubjects: Subject[] = [
  "Math",
  "English",
  "Science",
  "Social Studies",
];
export function gradeSkills(grade: number, subject: Subject) {
  return concepts.filter(
    (c) =>
      c.subject === subject &&
      c.gradeBand[0] <= grade &&
      c.gradeBand[1] >= grade,
  );
}
export function questionQuality(q: Question) {
  const issues: string[] = [];
  if (!q.prompt.trim() || !q.answer.trim())
    issues.push("Missing prompt or answer");
  if (!gradeQuestion(q, q.answer) && q.responseType !== "writing")
    issues.push("Answer key does not self-grade");
  if (q.choices) {
    if (
      new Set(q.choices.map((c) => c.toLowerCase().trim())).size !==
      q.choices.length
    )
      issues.push("Duplicate options");
    if (q.choices.filter((c) => gradeQuestion(q, c)).length !== 1)
      issues.push("Choices must have exactly one correct answer");
    if (q.options?.some((o) => !o.correct && !o.diagnosticMeaning))
      issues.push("Distractor needs diagnostic review");
  }
  if (!q.explanation.trim()) issues.push("Missing solution reasoning");
  if (
    /\b(above|below|shown|diagram|picture)\b/i.test(q.prompt) &&
    !q.visuals.length
  )
    issues.push("Check required visual context");
  return issues;
}
export function curriculumCoverage() {
  return [1, 2, 3, 4, 5].flatMap((grade) =>
    curriculumSubjects.map((subject) => {
      const skills = gradeSkills(grade, subject),
        approved = skills.filter(
          (c) => contentById[c.id]?.status === "approved",
        ).length;
      return {
        grade,
        subject,
        expected: skills.length,
        approved,
        approvedPercent: skills.length
          ? Math.round((100 * approved) / skills.length)
          : 0,
        authored: skills.filter((c) => !contentById[c.id]).length,
        draft: skills.filter((c) => contentById[c.id]?.status === "draft")
          .length,
        flaggedQuestions: skills
          .flatMap((c) => [0, 1, 2].map((seed) => getQuestion(c.id, seed)))
          .filter((q) => questionQuality(q).length).length,
      };
    }),
  );
}

export function structuredSkill(id: string) {
  const concept = concepts.find((c) => c.id === id);
  if (!concept) throw Error("Unknown skill");
  const content = contentById[id],
    questions = [0, 1, 2].map((seed) => getQuestion(id, seed));
  return {
    id,
    gradeRange: concept.gradeRange,
    subject: concept.subject,
    domain: concept.domain,
    unit: concept.domain,
    topic: concept.topic,
    name: concept.name,
    description: concept.description,
    learningObjectives: concept.learningObjectives,
    essentialKnowledge: [
      concept.description,
      ...new Set(questions.map((q) => q.explanation)),
    ],
    subskills: concept.learningObjectives.map((objective, index) => ({
      id: `${id}:objective${index + 1}`,
      objective,
    })),
    prerequisiteSkillIds: concept.prerequisites,
    misconceptionIds: concept.misconceptionIds,
    teachingStrategyIds: concept.teachingStrategyIds,
    vocabulary: content?.glossary ?? {},
    standardsMappings:
      content?.standards ??
      (id === "equivalent_fractions"
        ? [
            {
              framework: "CCSS",
              reference: "4.NF.A.1",
              source: "https://www.thecorestandards.org/Math/Content/4/NF/",
              alignment: "authored-alignment-pending-review",
            },
          ]
        : []),
    workedExampleTemplates: questions.map((q) => q.explanation),
    practiceTemplates: questions.map((q) => q.prompt),
    masteryCheckTemplates: [getQuestion(id, 3, true).prompt],
    difficultyProgression: [
      "diagnostic",
      "guided practice",
      "independent practice",
      "transfer",
    ],
    responseModes: questions[0].responseModes,
    contentStatus: content?.status ?? "authored-awaiting-review",
  };
}
