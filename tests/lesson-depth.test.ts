import { test } from "node:test";
import assert from "node:assert/strict";
import { lessonUnits } from "../content/curriculum/lesson-depth";
import { curriculumContent, contentById } from "../src/lib/teaching/content";
import { getQuestion, gradeQuestion } from "../src/lib/curriculum";
import { skillContentSchema } from "../content/curriculum/schema";
import { structuredSkill } from "../src/lib/curriculum-catalog";
import { interpretTaskUtterance } from "../src/lib/conversation/interpretation";
import { resolveSpokenChoice } from "../src/lib/conversation/choice-resolution";
import { shouldSyncSpeech } from "../agents/protocol";
import type { LearningSession } from "../src/lib/types";

test("forty sequenced lessons cover all four subjects in every grade through ten", () => {
  assert.equal(lessonUnits.length, 40);
  for (let grade = 1; grade <= 10; grade++) {
    const skills = curriculumContent.filter(
      (s) => s.grade === grade && s.lesson,
    );
    assert.deepEqual(
      new Set(skills.map((s) => s.subject)),
      new Set(["Math", "English", "Science", "Social Studies"]),
    );
    for (const skill of skills) {
      skillContentSchema.parse(skill);
      assert.equal(skill.status, "draft");
      assert.equal(skill.lesson!.teachingSteps.length, 3);
      assert.ok(skill.lesson!.workedExample.steps.length >= 2);
      assert.ok(skill.lesson!.transferGoal.length > 20);
      assert.deepEqual(
        structuredSkill(skill.id).lessonInstruction,
        skill.lesson,
      );
    }
  }
});

test("all 120 new tasks are reachable, distinct and have exactly one correct option", () => {
  for (const unit of lessonUnits) {
    const skill = contentById[unit.id];
    const added = skill.questions.slice(-3).map((q) => q.prompt);
    assert.equal(new Set(added).size, 3, unit.id);
    assert.ok(
      added.every(
        (prompt) =>
          !skill.questions.slice(0, -3).some((q) => q.prompt === prompt),
      ),
      unit.id,
    );
    for (let i = skill.questions.length - 3; i < skill.questions.length; i++) {
      const q = getQuestion(unit.id, i);
      assert.equal(q.prompt, skill.questions[i].prompt, q.id);
      assert.equal(gradeQuestion(q, q.answer), true, q.id);
      assert.equal(
        q.choices!.filter((choice) => gradeQuestion(q, choice)).length,
        1,
        q.id,
      );
      for (const choice of q.choices!) {
        const label = q.choiceLabels![choice];
        const session = { question: q } as LearningSession;
        assert.equal(
          interpretTaskUtterance(label, session, "voice").answer,
          choice,
          `${q.id}: ${label}`,
        );
      }
    }
  }
});

test("spoken letters, numbers, labels and unique option keywords resolve without a click", () => {
  const q = getQuestion("g6_science_particles", 4);
  for (const [i, choice] of q.choices!.entries()) {
    for (const text of [
      choice,
      q.choiceLabels![choice],
      `option ${i + 1}`,
      `${String.fromCharCode(65 + i)} is the answer`,
    ])
      assert.equal(
        interpretTaskUtterance(
          text,
          { question: q } as LearningSession,
          "voice",
        ).answer,
        choice,
        text,
      );
  }
  const custom = {
    ...q,
    choices: [
      "Photosynthesis uses light energy",
      "Respiration releases usable energy",
    ],
    choiceLabels: undefined,
  };
  assert.equal(
    resolveSpokenChoice("photosynthesis", custom) &&
      (resolveSpokenChoice("photosynthesis", custom) as { answer: string })
        .answer,
    custom.choices[0],
  );
  assert.deepEqual(resolveSpokenChoice("energy", custom), { ambiguous: true });
  assert.equal(resolveSpokenChoice("not photosynthesis", custom), undefined);
  assert.equal(resolveSpokenChoice("why photosynthesis?", custom), undefined);
  assert.equal(resolveSpokenChoice("A or B", custom), undefined);
  assert.equal(
    (resolveSpokenChoice("option bee", custom) as { answer: string }).answer,
    custom.choices[1],
  );
});

test("voice synchronization does not replay an answered or already-spoken turn", () => {
  assert.equal(shouldSyncSpeech("old", "new", "old"), false);
  assert.equal(shouldSyncSpeech("new", "new", "new"), false);
  assert.equal(shouldSyncSpeech("new", "new", "old"), true);
  assert.equal(shouldSyncSpeech(undefined, "new", "new"), true);
  assert.equal(shouldSyncSpeech({}, "new", "old"), false);
});
