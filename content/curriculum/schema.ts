import { z } from "zod";
export const rubricSchema = z.object({
  criteria: z
    .array(
      z.object({
        id: z.string(),
        description: z.string(),
        terms: z.array(z.string()).min(1),
        weight: z.number().positive(),
      }),
    )
    .min(1),
  minScore: z.number().min(0).max(1),
  counterEvidence: z.array(z.string()),
  sampleExplanation: z.string(),
});
export const skillContentSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade: z.number().int().min(1).max(10),
  courseId: z.string().nullable().optional(),
  recommendedGradeMin: z.number().int().min(1).max(10).optional(),
  recommendedGradeMax: z.number().int().min(1).max(10).optional(),
  sourceId: z.string().optional(),
  curriculumVersion: z.string().optional(),
  subject: z.enum(["Math", "English", "Science", "Social Studies"]),
  domain: z.string(),
  topic: z.string(),
  objective: z.string(),
  prerequisites: z.array(z.string()),
  misconceptions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      wrongAnswer: z.string(),
      verification: z.string(),
      remediation: z.array(z.string()),
    }),
  ),
  strategies: z.array(z.string()).min(3),
  standards: z.array(
    z.object({
      framework: z.string(),
      reference: z.string(),
      source: z.url(),
      alignment: z.literal("scope-reference"),
    }),
  ),
  status: z.enum(["draft", "reviewed", "approved"]),
  provenance: z.string(),
  reviewer: z.string().nullable(),
  questions: z
    .array(
      z
        .object({
          role: z.enum(["diagnostic", "practice", "mastery"]),
          responseType: z.enum(["short", "writing"]).optional(),
          misconception: z
            .object({ id: z.string(), answer: z.string() })
            .optional(),
          prompt: z.string().min(8),

          answer: z.string().min(1),
          choiceLabels: z
            .record(z.string(), z.string().trim().min(8))
            .optional(),
          choiceMode: z.enum(["answer", "writing_support"]).optional(),
          choices: z.array(z.string().trim().min(1)).min(2).max(6).optional(),
          explanation: z.string(),
          context: z.string(),
          hint: z.string(),
          visuals: z.array(z.record(z.string(), z.unknown())).default([]),
        })
        .superRefine((question, context) => {
          if (!question.choices) return;
          if (
            question.choiceLabels &&
            (Object.keys(question.choiceLabels).length !==
              question.choices.length ||
              question.choices.some((c) => !question.choiceLabels?.[c]))
          )
            context.addIssue({
              code: "custom",
              path: ["choiceLabels"],
              message: "Every choice must have exactly one display label.",
            });
          if (
            question.choiceLabels &&
            new Set(Object.values(question.choiceLabels)).size !==
              question.choices.length
          )
            context.addIssue({
              code: "custom",
              path: ["choiceLabels"],
              message: "Display labels must be distinct.",
            });
          const choices = question.choices.map((choice) =>
            choice.toLowerCase(),
          );
          if (new Set(choices).size !== choices.length)
            context.addIssue({
              code: "custom",
              path: ["choices"],
              message: "Choices must be distinct.",
            });
          if (!question.choices.includes(question.answer))
            context.addIssue({
              code: "custom",
              path: ["answer"],
              message: "The answer must match exactly one available choice.",
            });
        }),
    )
    .min(3),
  rubric: rubricSchema,
  glossary: z.record(z.string(), z.string()),
});
export type SkillContent = z.infer<typeof skillContentSchema>;
