import { test } from "node:test";
import assert from "node:assert/strict";
import { concepts, getQuestion, gradeQuestion } from "../src/lib/curriculum";
import { contentById, curriculumContent } from "../src/lib/teaching/content";
import { prepareChoices } from "../content/curriculum/choices/prepare";
import { updateMastery, initialState } from "../src/lib/learning";

test("every grade and subject has distinct labelled choices without changing answer keys", () => {
  const coverage = new Set<string>();
  for (const c of concepts) {
    coverage.add(`${c.gradeBand[0]}:${c.subject}`);
    const seeds =
      /^g[1-5]_math_(addition|subtraction|multiplication|division)$/.test(c.id)
        ? 97
        : Math.max(10, contentById[c.id]?.questions.length ?? 0);
    for (let seed = 0; seed < seeds; seed++)
      for (const transfer of [false, true]) {
        const q = getQuestion(c.id, seed, transfer);
        assert.ok(
          q.choices && q.choices.length >= 2 && q.choices.length <= 6,
          q.id,
        );
        assert.equal(new Set(q.choices).size, q.choices.length, q.id);
        const labels = q.choices.map((v) => q.choiceLabels![v]);
        assert.equal(new Set(labels).size, labels.length, q.id);
        assert.ok(
          labels.every((label) => label && label.length >= 8),
          q.id,
        );
        if (q.choiceMode === "writing_support") continue;
        assert.equal(
          q.choices.filter((v) => gradeQuestion(q, v)).length,
          1,
          q.id,
        );
        assert.equal(labels.filter((v) => gradeQuestion(q, v)).length, 1, q.id);
      }
  }
  assert.equal(coverage.size, 40);
});

test("primary normalized tasks no longer embed their solution in an opening prompt or first hint", () => {
  for (const c of curriculumContent.filter((c) => c.grade <= 5))
    for (const q of c.questions) {
      assert.doesNotMatch(q.prompt, /^Consider this explanation:/, c.id);
      assert.ok(!q.hint.endsWith(q.explanation), c.id);
      assert.notEqual(q.context, q.explanation, c.id);
    }
});

test("unknown conceptual answers require authored alternatives instead of invented fallback distractors", () => {
  assert.throws(
    () =>
      prepareChoices(
        {
          prompt: "An unfamiliar reviewed question",
          answer: "an unknown concept",
          hint: "Observe",
          explanation: "An explanation",
        },
        "Science",
        0,
      ),
    /Author answer choices/,
  );
});

test("recognizing a choice does not count as independent or transfer mastery", () => {
  const before = initialState("child", "equivalent_fractions");
  const recognized = updateMastery(
    before,
    true,
    0,
    true,
    "guided_questioning",
    "q1",
    "session",
    new Date(),
    { recognitionOnly: true },
  );
  const independent = updateMastery(
    before,
    true,
    0,
    true,
    "guided_questioning",
    "q2",
    "session",
    new Date(),
    { reasoningQuality: 0.8 },
  );
  assert.equal(recognized.successfulIndependentAttempts, 0);
  assert.equal(recognized.evidence.at(-1)!.outcome, "recognition_success");
  assert.ok(recognized.masteryScore < independent.masteryScore);
  assert.equal(recognized.nextReviewAt, null);
});
