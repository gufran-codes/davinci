import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dialogueStyleChecks,
  tutorSpeechProfile,
} from "../src/lib/teaching/speech";

test("catchphrases and repeated openings are detected even when the task changes", () => {
  assert.ok(
    dialogueStyleChecks(
      "That fits. Let’s build on it. What is 3 + 2?",
      [],
    ).includes("stock_transition"),
  );
  assert.ok(
    dialogueStyleChecks(
      "Let's take this one step at a time. Which source is reliable?",
      ["Let's take this one step at a time. What is a solid?"],
      "Which source is reliable?",
    ).includes("repeated_opening"),
  );
});

test("required questions, brief acknowledgements and academic vocabulary are not verbal filler", () => {
  const required = "Let's compare these two sources. Which is older?";
  assert.deepEqual(
    dialogueStyleChecks(`Yes. ${required}`, [required], required),
    [],
  );
  assert.deepEqual(
    dialogueStyleChecks("That's correct. What is 2 + 3?", [
      "That's correct. What is 1 + 2?",
    ]),
    [],
  );
  assert.deepEqual(
    dialogueStyleChecks(
      "The denominator tells us how many equal parts form a whole.",
      ["The denominator tells us the size of each equal part."],
    ),
    [],
  );
});

test("successful progression and conceptual answers do not require a generic probe", () => {
  const input = {
    strategy: "guided_questioning" as const,
    subject: "Math" as const,
    grade: 5,
    intent: "answer",
    teachingMove: "acknowledge_and_advance",
  };
  assert.match(tutorSpeechProfile(input).turnShape, /new required question/);
  assert.match(
    tutorSpeechProfile({ ...input, intent: "why" }).turnShape,
    /Do not turn the explanation into another quiz/,
  );
});
