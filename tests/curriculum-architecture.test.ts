import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-curriculum-architecture-")),
  "test.sqlite",
);

const sample = JSON.parse(
  readFileSync(
    path.join(
      process.cwd(),
      "content/curriculum/samples/grades-6-10-architecture.json",
    ),
    "utf8",
  ),
) as unknown;
const { validateCurriculumPackage, importCurriculumPackage } =
  await import("../src/server/curriculum-import");
const { concepts } = await import("../src/lib/curriculum");
const { all, one, run } = await import("../src/server/db");
const { register } = await import("../src/server/auth");
const { createChild, learnerFor, saveLearner } =
  await import("../src/server/repository");
const { emptyLearner, initialState } = await import("../src/lib/learning");

test("representative Grades 6-10 package validates without invented standards", () => {
  const known = new Map(concepts.map((skill) => [skill.id, skill.subject]));
  const result = validateCurriculumPackage(sample, known);
  assert.deepEqual(result.errors, []);
  assert.equal(result.package.skills.length, 11);
  assert.equal(result.package.courses.length, 9);
  assert.ok(
    result.package.skills.some(
      (skill) => skill.recommendedGradeMax === 10 && skill.courseId,
    ),
  );
  assert.ok(result.package.skills.every((skill) => !skill.standards.length));
});

test("import validation blocks curriculum content from reference-only sources", () => {
  const copy = structuredClone(sample) as {
    sources: { license: { usageRights: string } }[];
  };
  copy.sources[0].license.usageRights = "reference_only";
  const known = new Map(concepts.map((skill) => [skill.id, skill.subject]));
  const result = validateCurriculumPackage(copy, known);
  assert.ok(
    result.errors.some((error) =>
      error.includes("reference-only source cannot supply curriculum content"),
    ),
  );
});

test("normalized import preserves skill IDs, courses, hierarchy and cross-grade prerequisites", () => {
  const result = importCurriculumPackage(
    sample,
    "content/curriculum/samples/grades-6-10-architecture.json",
  );
  assert.equal(result.counts.skills, 11);
  const skill = one<{
    id: string;
    course_id: string;
    domain_id: string;
    topic_id: string;
    recommended_grade_min: number;
    recommended_grade_max: number;
    curriculum_status: string;
  }>(
    "SELECT id,course_id,domain_id,topic_id,recommended_grade_min,recommended_grade_max,curriculum_status FROM concepts WHERE id=?",
    "sample_alg1_linear_equations",
  );
  assert.deepEqual(
    { ...skill },
    {
      id: "sample_alg1_linear_equations",
      course_id: "algebra-1",
      domain_id: "alg1-equations",
      topic_id: "alg1-one-variable",
      recommended_grade_min: 8,
      recommended_grade_max: 10,
      curriculum_status: "draft",
    },
  );
  assert.deepEqual(
    {
      ...one<{ prerequisite_id: string }>(
        "SELECT prerequisite_id FROM concept_prerequisites WHERE concept_id=?",
        "sample_alg1_linear_equations",
      ),
    },
    { prerequisite_id: "sample_g6_ratio_reasoning" },
  );
  assert.equal(
    one<{ count: number }>(
      "SELECT COUNT(*) AS count FROM curriculum_learning_objectives WHERE skill_id=?",
      "sample_alg1_linear_equations",
    )?.count,
    1,
  );
  assert.equal(
    one<{ name: string }>(
      "SELECT name FROM curriculum_courses WHERE id='algebra-1'",
    )?.name,
    "Algebra I",
  );
  assert.deepEqual(all("PRAGMA foreign_key_check"), []);
});

test("Grades 9-10 learners and course enrollment retain mastery keyed by skill_id", () => {
  const user = register(
    "Secondary Parent",
    "secondary-curriculum@test.local",
    "safe-password-123",
  );
  const child = createChild(user.id, {
    nickname: "Ari",
    age: 15,
    grade: 10,
    goal: "Stay on grade level",
    subjects: ["Math", "English"],
  });
  run(
    "INSERT INTO student_course_enrollments(child_id,course_id,grade_at_enrollment,status,started_at) VALUES(?,?,?,?,?)",
    child.id,
    "algebra-1",
    10,
    "active",
    new Date().toISOString(),
  );
  const learner = emptyLearner();
  learner.states.sample_alg1_linear_equations = initialState(
    child.id,
    "sample_alg1_linear_equations",
  );
  saveLearner(child.id, learner);
  assert.equal(
    learnerFor(child.id).states.sample_alg1_linear_equations.conceptId,
    "sample_alg1_linear_equations",
  );
  assert.equal(
    one<{ course_id: string }>(
      "SELECT course_id FROM student_course_enrollments WHERE child_id=?",
      child.id,
    )?.course_id,
    "algebra-1",
  );
});
