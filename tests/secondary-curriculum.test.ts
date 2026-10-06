import { test } from "node:test";
import assert from "node:assert/strict";
import { secondaryCurriculum } from "../content/curriculum/secondary";
import { skillContentSchema } from "../content/curriculum/schema";
import {
  concepts,
  conceptById,
  getQuestion,
  gradeQuestion,
} from "../src/lib/curriculum";
import {
  curriculumCoverage,
  gradeSkills,
  questionQuality,
} from "../src/lib/curriculum-catalog";
import { emptyLearner, availableLesson } from "../src/lib/learning";
import { visualActionSequence } from "../src/lib/teaching/whiteboard";
import type { Child } from "../src/lib/types";

test("secondary curriculum is explicit draft content with original provenance and unique IDs", () => {
  assert.equal(secondaryCurriculum.length, 100);
  assert.equal(
    secondaryCurriculum.reduce((n, c) => n + c.questions.length, 0),
    420,
  );
  assert.equal(new Set(concepts.map((c) => c.id)).size, concepts.length);
  for (const c of secondaryCurriculum) {
    skillContentSchema.parse(c);
    assert.equal(c.status, "draft");
    assert.equal(c.reviewer, null);
    assert.ok(c.standards.length > 0);
    assert.equal(c.sourceId, "davinci-us-secondary-v1");
    for (const p of c.prerequisites) {
      assert.equal(conceptById[p].subject, c.subject);
      assert.ok(conceptById[p].gradeBand[0] <= c.grade);
    }
    assert.deepEqual(
      new Set(c.questions.map((q) => q.role)),
      new Set(["diagnostic", "practice", "mastery"]),
    );
    assert.ok(new Set(c.questions.map((q) => q.prompt)).size >= 3);
  }
});
test("every secondary item self-grades, has one correct choice and valid visual actions", () => {
  for (const c of secondaryCurriculum)
    for (let i = 0; i < c.questions.length; i++) {
      const q = getQuestion(c.id, i);
      assert.equal(gradeQuestion(q, q.answer), true, q.id);
      if (q.choices)
        assert.equal(
          q.choices.filter((a) => gradeQuestion(q, a)).length,
          1,
          q.id,
        );
      // Newly added numerical distractors remain explicitly unreviewed.
      const expected = !c.questions[i].choices
        ? ["Distractor needs diagnostic review"]
        : [];
      assert.deepEqual(questionQuality(q), expected, q.id);
      assert.doesNotThrow(() => visualActionSequence(q.visuals), q.id);
    }
});
test("every secondary grade and subject has a real grade-scoped lesson and coverage row", () => {
  for (let grade = 6; grade <= 10; grade++)
    for (const subject of [
      "Math",
      "English",
      "Science",
      "Social Studies",
    ] as const) {
      assert.ok(gradeSkills(grade, subject).length >= 4);
      const child: Child = {
        id: "qa",
        parentId: "qa",
        nickname: "QA",
        age: grade + 5,
        grade,
        goal: "Learn",
        subjects: [subject],
        diagnosticComplete: true,
        createdAt: new Date().toISOString(),
      };
      const plan = availableLesson(child, emptyLearner());
      assert.ok(plan);
      assert.equal(conceptById[plan.targetConcept].subject, subject);
      assert.equal(conceptById[plan.targetConcept].gradeBand[0], grade);
    }
  assert.equal(curriculumCoverage().length, 40);
});
