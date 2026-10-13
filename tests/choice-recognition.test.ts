import { test } from "node:test";
import assert from "node:assert/strict";
import { getQuestion } from "../src/lib/curriculum";
import { resolveSpokenChoice } from "../src/lib/conversation/choice-resolution";
import { choiceLabel } from "../src/lib/conversation/choice-label";
import { interpretTaskUtterance } from "../src/lib/conversation/interpretation";
import { interpretStudentTurn } from "../src/lib/conversation/student-dialogue";
import type { LearningSession } from "../src/lib/types";

const q = {
  ...getQuestion("g4_science_matter", 0),
  choices: [
    "Air does not disappear",
    "Water or air takes up space",
    "The mass is 1.5 grams",
  ],
  choiceLabels: undefined,
};
function answer(text: string) {
  const result = resolveSpokenChoice(text, q);
  return result && "answer" in result ? result.answer : undefined;
}
test("ASR letters, letter names, framing and complete option readings resolve without a click", () => {
  for (const [text, index] of [
    ["A?", 0],
    ["option ay", 0],
    ["the letter B.", 1],
    ["bee", 1],
    ["choice number three", 2],
    ["Um, I choose C.", 2],
    ["Air does not disappear.", 0],
    ["Water or air takes up space!", 1],
    ["The mass is 1.5 grams.", 2],
    ["B, Water or air takes up space", 1],
  ] as const)
    assert.equal(answer(text), q.choices[index], text);
});
test("negative and decimal numeric options remain distinct", () => {
  const numeric = { ...q, choices: ["-2 and -3", "2 and 3", "1.5", "15"] };
  for (const choice of numeric.choices)
    assert.equal(
      (resolveSpokenChoice(choice, numeric) as { answer: string }).answer,
      choice,
    );
});
test("questions, denials, competing choices and article A are not false selections", () => {
  for (const text of [
    "not A",
    "A or B",
    "why B?",
    "A class garden is useful because we observe plants.",
  ])
    assert.equal(answer(text), undefined, text);
  assert.deepEqual(resolveSpokenChoice("B, The mass is 1.5 grams", q), {
    ambiguous: true,
  });
});
test("saved legacy labels are cleaned without discarding authored explanations", () => {
  assert.equal(
    choiceLabel(
      "evaporation",
      "The explanation I would choose is: evaporation.",
    ),
    "evaporation",
  );
  assert.equal(choiceLabel("7", "The result would be 7."), "7");
  assert.equal(
    choiceLabel("yes", "Yes — the total is unchanged."),
    "Yes — the total is unchanged.",
  );
});
test("displayed letters and prose target the task even with a guided checkpoint", () => {
  const session = {
    question: q,
    teaching: { guidedPractice: { questionId: q.id, stepIndex: 0 } },
  } as LearningSession;
  for (const text of ["B", q.choices[1]]) {
    const turn = interpretTaskUtterance(text, session, "voice");
    assert.equal(turn.answer, q.choices[1]);
    assert.equal(turn.answerTarget, "task");
  }
});

test("reading a choice about confusion does not create a student knowledge gap", () => {
  const option = "The student does not understand the rule";
  const turn = interpretStudentTurn(option, {
    question: { ...q, choices: [option, "The student understands the rule"] },
  } as LearningSession);
  assert.equal(turn.answer, option);
  assert.equal(turn.dialogue, undefined);
});

test("long readings can omit small function words, but cannot reverse the meaning", () => {
  const detailed = {
    ...q,
    choices: [
      "A plant uses light energy to convert water and carbon dioxide into sugars and oxygen",
      "Animals eat plants",
    ],
  };
  const partial = resolveSpokenChoice(
    "plant uses light energy convert water carbon dioxide into sugars oxygen",
    detailed,
  );
  assert.equal(
    partial && "answer" in partial ? partial.answer : undefined,
    detailed.choices[0],
  );
  assert.equal(resolveSpokenChoice("plants eat animals", detailed), undefined);
});
