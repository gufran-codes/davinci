import { z } from "zod";

export const curriculumSubjectSchema = z.enum([
  "Math",
  "English",
  "Science",
  "Social Studies",
]);

export const curriculumSourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(2).max(160),
  framework: z.string().max(100).nullable().default(null),
  url: z.url(),
  version: z.string().max(80).nullable().default(null),
  year: z.number().int().min(1900).max(2200).nullable().default(null),
  license: z.object({
    name: z.string().min(2).max(160),
    url: z.url().nullable().default(null),
    usageRights: z.enum([
      "public_domain",
      "open_license",
      "permission_granted",
      "internal_original",
      "reference_only",
    ]),
    attribution: z.string().max(1000).nullable().default(null),
  }),
});

export const curriculumCourseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    code: z.string().min(2).max(30),
    name: z.string().min(2).max(120),
    subject: curriculumSubjectSchema,
    recommendedGradeMin: z.number().int().min(1).max(10),
    recommendedGradeMax: z.number().int().min(1).max(10),
    description: z.string().max(1000).default(""),
  })
  .refine(
    (course) => course.recommendedGradeMin <= course.recommendedGradeMax,
    {
      message: "Course grade range is reversed",
    },
  );

const assessmentSchema = z.object({
  diagnosticRequired: z.boolean().default(true),
  practiceRequired: z.boolean().default(true),
  masteryRequired: z.boolean().default(true),
  masteryThreshold: z.number().min(0).max(1).default(0.75),
  minimumIndependentAttempts: z.number().int().min(1).max(20).default(2),
  transferRequired: z.boolean().default(true),
  rubric: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const curriculumImportSkillSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
    name: z.string().min(2).max(160),
    description: z.string().min(5).max(2000),
    subject: curriculumSubjectSchema,
    courseId: z.string().nullable().default(null),
    recommendedGradeMin: z.number().int().min(1).max(10),
    recommendedGradeMax: z.number().int().min(1).max(10),
    domain: z.object({
      id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
      code: z.string().min(1).max(40),
      name: z.string().min(2).max(120),
    }),
    topic: z.object({
      id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
      code: z.string().min(1).max(40),
      name: z.string().min(2).max(120),
    }),
    learningObjectives: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
          text: z.string().min(5).max(1000),
        }),
      )
      .min(1),
    prerequisiteSkillIds: z.array(z.string()).default([]),
    misconceptionIds: z.array(z.string()).default([]),
    teachingStrategyIds: z.array(z.string()).min(1),
    standards: z
      .array(
        z.object({
          sourceId: z.string(),
          framework: z.string().min(1).max(100),
          code: z.string().min(1).max(100),
          statement: z.string().max(2000).nullable().default(null),
          alignment: z.enum(["introduced", "supporting", "assessed"]),
          notes: z.string().max(1000).default(""),
        }),
      )
      .default([]),
    assessment: assessmentSchema.default({
      diagnosticRequired: true,
      practiceRequired: true,
      masteryRequired: true,
      masteryThreshold: 0.75,
      minimumIndependentAttempts: 2,
      transferRequired: true,
      rubric: {},
      metadata: {},
    }),
    status: z.enum(["draft", "reviewed", "approved"]),
    sourceId: z.string(),
  })
  .refine((skill) => skill.recommendedGradeMin <= skill.recommendedGradeMax, {
    message: "Skill grade range is reversed",
  });

export const curriculumImportPackageSchema = z.object({
  schemaVersion: z.literal(1),
  release: z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    version: z.string().min(1).max(80),
    status: z.enum(["draft", "reviewed", "approved"]),
    notes: z.string().max(2000).default(""),
  }),
  sources: z.array(curriculumSourceSchema).min(1),
  courses: z.array(curriculumCourseSchema).default([]),
  misconceptions: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
        name: z.string().min(2).max(160),
        description: z.string().min(5).max(2000),
        verification: z.array(z.string().min(3)).min(1),
        sourceId: z.string(),
        status: z.enum(["draft", "reviewed", "approved"]),
      }),
    )
    .default([]),
  skills: z.array(curriculumImportSkillSchema).min(1),
});

export type CurriculumImportPackage = z.infer<
  typeof curriculumImportPackageSchema
>;
