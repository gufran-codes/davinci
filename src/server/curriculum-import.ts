import { createHash, randomUUID } from "node:crypto";
import {
  curriculumImportPackageSchema,
  type CurriculumImportPackage,
} from "../../content/curriculum/import-schema";
import { strategies, type Subject } from "../lib/types";
import { all, run, transaction } from "./db";

const subjectIds: Record<Subject, string> = {
  Math: "math",
  English: "ela",
  Science: "science",
  "Social Studies": "social-studies",
};

export interface CurriculumValidationResult {
  package: CurriculumImportPackage;
  errors: string[];
  warnings: string[];
}

function duplicates(values: string[]) {
  const seen = new Set<string>();
  return [
    ...new Set(values.filter((value) => seen.has(value) || !seen.add(value))),
  ];
}

export function validateCurriculumPackage(
  input: unknown,
  existingSkills: Map<string, Subject> = new Map(),
): CurriculumValidationResult {
  const parsed = curriculumImportPackageSchema.safeParse(input);
  if (!parsed.success)
    return {
      package: input as CurriculumImportPackage,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
      warnings: [],
    };
  const value = parsed.data;
  const errors: string[] = [];
  const warnings: string[] = [];
  const sources = new Map(value.sources.map((source) => [source.id, source]));
  const courses = new Map(value.courses.map((course) => [course.id, course]));
  const skills = new Map(value.skills.map((skill) => [skill.id, skill]));
  const misconceptions = new Set(value.misconceptions.map((item) => item.id));
  const allowedStrategies = new Set<string>(strategies);

  for (const [label, ids] of [
    ["source", value.sources.map((item) => item.id)],
    ["course", value.courses.map((item) => item.id)],
    ["skill", value.skills.map((item) => item.id)],
    ["misconception", value.misconceptions.map((item) => item.id)],
    [
      "learning objective",
      value.skills.flatMap((skill) =>
        skill.learningObjectives.map((objective) => objective.id),
      ),
    ],
  ] as const)
    for (const id of duplicates(ids))
      errors.push(`Duplicate ${label} ID: ${id}`);

  for (const source of value.sources) {
    if (
      ["open_license", "permission_granted"].includes(
        source.license.usageRights,
      ) &&
      !source.license.url
    )
      errors.push(`${source.id}: licensed source requires a license URL`);
    if (
      source.license.usageRights === "open_license" &&
      !source.license.attribution
    )
      errors.push(`${source.id}: open license requires attribution text`);
  }

  for (const misconception of value.misconceptions) {
    const source = sources.get(misconception.sourceId);
    if (!source)
      errors.push(
        `${misconception.id}: unknown source ${misconception.sourceId}`,
      );
    else if (source.license.usageRights === "reference_only")
      errors.push(
        `${misconception.id}: reference-only source cannot supply misconception content`,
      );
  }

  for (const skill of value.skills) {
    const source = sources.get(skill.sourceId);
    if (!source) errors.push(`${skill.id}: unknown source ${skill.sourceId}`);
    else if (source.license.usageRights === "reference_only")
      errors.push(
        `${skill.id}: reference-only source cannot supply curriculum content`,
      );
    const course = skill.courseId ? courses.get(skill.courseId) : undefined;
    if (skill.courseId && !course)
      errors.push(`${skill.id}: unknown course ${skill.courseId}`);
    if (course) {
      if (course.subject !== skill.subject)
        errors.push(`${skill.id}: course subject does not match skill subject`);
      if (
        skill.recommendedGradeMax < course.recommendedGradeMin ||
        skill.recommendedGradeMin > course.recommendedGradeMax
      )
        errors.push(
          `${skill.id}: skill and course grade recommendations do not overlap`,
        );
    }
    for (const prerequisite of skill.prerequisiteSkillIds) {
      const prerequisiteSubject =
        skills.get(prerequisite)?.subject ?? existingSkills.get(prerequisite);
      if (!prerequisiteSubject)
        errors.push(`${skill.id}: unknown prerequisite ${prerequisite}`);
      else if (prerequisiteSubject !== skill.subject)
        errors.push(`${skill.id}: cross-subject prerequisite ${prerequisite}`);
    }
    for (const misconception of skill.misconceptionIds)
      if (!misconceptions.has(misconception))
        errors.push(`${skill.id}: unknown misconception ${misconception}`);
    for (const strategy of skill.teachingStrategyIds)
      if (!allowedStrategies.has(strategy))
        errors.push(`${skill.id}: unknown teaching strategy ${strategy}`);
    for (const standard of skill.standards) {
      const standardSource = sources.get(standard.sourceId);
      if (!standardSource)
        errors.push(
          `${skill.id}: unknown standards source ${standard.sourceId}`,
        );
      if (
        standard.statement &&
        standardSource?.license.usageRights === "reference_only"
      )
        errors.push(
          `${skill.id}: cannot ingest standard text from a reference-only source`,
        );
    }
    if (skill.status !== "draft" && value.release.status === "draft")
      errors.push(`${skill.id}: reviewed content cannot be in a draft release`);
    if (!skill.standards.length)
      warnings.push(`${skill.id}: no reviewed standards mapping yet`);
  }

  function walk(id: string, path: string[]) {
    if (path.includes(id)) {
      errors.push(`Prerequisite cycle: ${[...path, id].join(" -> ")}`);
      return;
    }
    for (const prerequisite of skills.get(id)?.prerequisiteSkillIds ?? [])
      if (skills.has(prerequisite)) walk(prerequisite, [...path, id]);
  }
  for (const id of skills.keys()) walk(id, []);

  return { package: value, errors: [...new Set(errors)], warnings };
}

export function importCurriculumPackage(input: unknown, sourceFile: string) {
  const existing = new Map(
    all<{ id: string; subject: Subject }>(
      "SELECT id,subject FROM concepts",
    ).map((row) => [row.id, row.subject]),
  );
  const validation = validateCurriculumPackage(input, existing);
  if (validation.errors.length) throw new Error(validation.errors.join("\n"));
  const value = validation.package;
  const encoded = JSON.stringify(value);
  const hash = createHash("sha256").update(encoded).digest("hex");
  const importedAt = new Date().toISOString();
  const importId = randomUUID();

  transaction(() => {
    run(
      "INSERT INTO curriculum_releases(id,version,status,notes,source_hash,created_at,published_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,status=excluded.status,notes=excluded.notes,source_hash=excluded.source_hash,published_at=excluded.published_at",
      value.release.id,
      value.release.version,
      value.release.status,
      value.release.notes,
      hash,
      importedAt,
      value.release.status === "approved" ? importedAt : null,
    );
    for (const source of value.sources)
      run(
        "INSERT INTO curriculum_sources(id,name,framework,source_url,source_version,source_year,license_name,license_url,usage_rights,attribution,metadata,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,framework=excluded.framework,source_url=excluded.source_url,source_version=excluded.source_version,source_year=excluded.source_year,license_name=excluded.license_name,license_url=excluded.license_url,usage_rights=excluded.usage_rights,attribution=excluded.attribution,metadata=excluded.metadata,updated_at=excluded.updated_at",
        source.id,
        source.name,
        source.framework,
        source.url,
        source.version,
        source.year,
        source.license.name,
        source.license.url,
        source.license.usageRights,
        source.license.attribution,
        "{}",
        importedAt,
        importedAt,
      );
    for (const course of value.courses)
      run(
        "INSERT INTO curriculum_courses(id,subject_id,code,name,recommended_grade_min,recommended_grade_max,description,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET subject_id=excluded.subject_id,code=excluded.code,name=excluded.name,recommended_grade_min=excluded.recommended_grade_min,recommended_grade_max=excluded.recommended_grade_max,description=excluded.description,active=excluded.active,updated_at=excluded.updated_at",
        course.id,
        subjectIds[course.subject],
        course.code,
        course.name,
        course.recommendedGradeMin,
        course.recommendedGradeMax,
        course.description,
        1,
        importedAt,
        importedAt,
      );
    for (const misconception of value.misconceptions)
      run(
        "INSERT INTO misconceptions(id,data,source_id,curriculum_status,curriculum_version,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,source_id=excluded.source_id,curriculum_status=excluded.curriculum_status,curriculum_version=excluded.curriculum_version,updated_at=excluded.updated_at",
        misconception.id,
        JSON.stringify(misconception),
        misconception.sourceId,
        misconception.status,
        value.release.version,
        importedAt,
      );
    for (const skill of value.skills) {
      run(
        "INSERT INTO curriculum_domains(id,subject_id,course_id,code,name,description,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET subject_id=excluded.subject_id,course_id=excluded.course_id,code=excluded.code,name=excluded.name,updated_at=excluded.updated_at",
        skill.domain.id,
        subjectIds[skill.subject],
        skill.courseId,
        skill.domain.code,
        skill.domain.name,
        "",
        importedAt,
        importedAt,
      );
      run(
        "INSERT INTO curriculum_topics(id,domain_id,code,name,description,sequence,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET domain_id=excluded.domain_id,code=excluded.code,name=excluded.name,updated_at=excluded.updated_at",
        skill.topic.id,
        skill.domain.id,
        skill.topic.code,
        skill.topic.name,
        "",
        0,
        importedAt,
        importedAt,
      );
      run(
        "INSERT INTO concepts(id,name,domain,subject,data,course_id,domain_id,topic_id,recommended_grade_min,recommended_grade_max,curriculum_status,curriculum_version,source_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,domain=excluded.domain,subject=excluded.subject,data=excluded.data,course_id=excluded.course_id,domain_id=excluded.domain_id,topic_id=excluded.topic_id,recommended_grade_min=excluded.recommended_grade_min,recommended_grade_max=excluded.recommended_grade_max,curriculum_status=excluded.curriculum_status,curriculum_version=excluded.curriculum_version,source_id=excluded.source_id,updated_at=excluded.updated_at",
        skill.id,
        skill.name,
        skill.domain.name,
        skill.subject,
        JSON.stringify(skill),
        skill.courseId,
        skill.domain.id,
        skill.topic.id,
        skill.recommendedGradeMin,
        skill.recommendedGradeMax,
        skill.status,
        value.release.version,
        skill.sourceId,
        importedAt,
      );
      run(
        "DELETE FROM curriculum_learning_objectives WHERE skill_id=?",
        skill.id,
      );
      skill.learningObjectives.forEach((objective, index) =>
        run(
          "INSERT INTO curriculum_learning_objectives(id,skill_id,objective,sequence,status,source_id) VALUES(?,?,?,?,?,?)",
          objective.id,
          skill.id,
          objective.text,
          index,
          skill.status,
          skill.sourceId,
        ),
      );
      run("DELETE FROM curriculum_skill_strategies WHERE skill_id=?", skill.id);
      skill.teachingStrategyIds.forEach((strategy, index) =>
        run(
          "INSERT INTO curriculum_skill_strategies(skill_id,strategy_id,priority,rationale) VALUES(?,?,?,?)",
          skill.id,
          strategy,
          index,
          "Imported curriculum recommendation",
        ),
      );
      run("DELETE FROM concept_misconceptions WHERE concept_id=?", skill.id);
      for (const misconception of skill.misconceptionIds)
        run(
          "INSERT INTO concept_misconceptions(concept_id,misconception_id) VALUES(?,?)",
          skill.id,
          misconception,
        );
      run(
        "DELETE FROM curriculum_standard_mappings WHERE skill_id=?",
        skill.id,
      );
      for (const standard of skill.standards) {
        const standardId = createHash("sha256")
          .update(`${standard.sourceId}:${standard.framework}:${standard.code}`)
          .digest("hex")
          .slice(0, 32);
        run(
          "INSERT INTO curriculum_standards(id,framework,standard_code,statement,source_id,version) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET statement=excluded.statement,version=excluded.version",
          standardId,
          standard.framework,
          standard.code,
          standard.statement,
          standard.sourceId,
          value.sources.find((source) => source.id === standard.sourceId)
            ?.version ?? null,
        );
        run(
          "INSERT INTO curriculum_standard_mappings(skill_id,standard_id,framework,reference_label,source_id,alignment,notes) VALUES(?,?,?,?,?,?,?)",
          skill.id,
          standardId,
          standard.framework,
          standard.code,
          standard.sourceId,
          standard.alignment,
          standard.notes,
        );
      }
      run(
        "INSERT INTO curriculum_assessment_requirements(skill_id,diagnostic_required,practice_required,mastery_required,mastery_threshold,minimum_independent_attempts,transfer_required,rubric,metadata) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(skill_id) DO UPDATE SET diagnostic_required=excluded.diagnostic_required,practice_required=excluded.practice_required,mastery_required=excluded.mastery_required,mastery_threshold=excluded.mastery_threshold,minimum_independent_attempts=excluded.minimum_independent_attempts,transfer_required=excluded.transfer_required,rubric=excluded.rubric,metadata=excluded.metadata",
        skill.id,
        skill.assessment.diagnosticRequired ? 1 : 0,
        skill.assessment.practiceRequired ? 1 : 0,
        skill.assessment.masteryRequired ? 1 : 0,
        skill.assessment.masteryThreshold,
        skill.assessment.minimumIndependentAttempts,
        skill.assessment.transferRequired ? 1 : 0,
        JSON.stringify(skill.assessment.rubric),
        JSON.stringify(skill.assessment.metadata),
      );
    }
    for (const skill of value.skills) {
      run("DELETE FROM concept_prerequisites WHERE concept_id=?", skill.id);
      for (const prerequisite of skill.prerequisiteSkillIds)
        run(
          "INSERT INTO concept_prerequisites(concept_id,prerequisite_id) VALUES(?,?)",
          skill.id,
          prerequisite,
        );
    }
    run(
      "INSERT INTO curriculum_import_runs(id,release_id,source_file,source_hash,status,record_counts,errors,started_at,completed_at) VALUES(?,?,?,?,?,?,?,?,?)",
      importId,
      value.release.id,
      sourceFile,
      hash,
      "imported",
      JSON.stringify({
        sources: value.sources.length,
        courses: value.courses.length,
        skills: value.skills.length,
        misconceptions: value.misconceptions.length,
      }),
      "[]",
      importedAt,
      importedAt,
    );
  });
  return {
    importId,
    releaseId: value.release.id,
    hash,
    warnings: validation.warnings,
    counts: {
      sources: value.sources.length,
      courses: value.courses.length,
      skills: value.skills.length,
      misconceptions: value.misconceptions.length,
    },
  };
}
