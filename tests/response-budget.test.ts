import { test } from "node:test";
import assert from "node:assert/strict";
import {
  boundedFallback,
  isSimpleDefinition,
  responseDepthRequest,
  speechWords,
  tutorSpeechBudget,
} from "../src/lib/teaching/response-budget";

test("length requests honor negation without mistaking confusion for a brevity request", () => {
  for (const text of [
    "Keep it brief, do not explain in detail",
    "Don't give me a full explanation",
    "No need to explain more",
    "Explain without a detailed explanation",
    "Not in depth, please",
    "No detailed explanation, please",
    "Do not elaborate",
    "Don't go deeper",
    "No more details",
    "Keep your answers short from now on",
    "Explain it in one sentence",
    "Your replies are too long",
  ])
    assert.equal(responseDepthRequest(text).depth, "brief", text);
  for (const text of [
    "Explain in detail",
    "I don't understand, explain in detail",
    "I don't understand but please explain in detail",
    "Don't be brief; give me a detailed explanation",
    "Please elaborate",
  ])
    assert.equal(responseDepthRequest(text).depth, "detailed", text);
  for (const text of [
    "Explain a short circuit",
    "What is a short story?",
    "Why don't electrons change the element?",
  ])
    assert.equal(responseDepthRequest(text).depth, undefined, text);
  assert.equal(
    responseDepthRequest("Don't keep your answers short").depth,
    "standard",
  );
  assert.equal(
    responseDepthRequest("I don't want a short answer").depth,
    "standard",
  );
  assert.equal(responseDepthRequest("Don't answer briefly").depth, "standard");
  assert.equal(
    responseDepthRequest("Keep this answer brief").persistent,
    false,
  );
  assert.equal(
    responseDepthRequest("Keep your answers short").persistent,
    true,
  );
});

test("budgets distinguish definition, hint, conceptual depth, age and explicit overrides", () => {
  assert.equal(
    tutorSpeechBudget({ intent: "define", utterance: "What is a proton?" })
      .maxWords,
    35,
  );
  assert.equal(tutorSpeechBudget({ intent: "hint" }).maxWords, 35);
  assert.equal(tutorSpeechBudget({ intent: "why" }).maxWords, 70);
  assert.equal(tutorSpeechBudget({ intent: "why", grade: 2 }).maxWords, 50);
  assert.equal(
    tutorSpeechBudget({ intent: "why", utterance: "Explain in detail" })
      .maxWords,
    180,
  );
  assert.equal(
    tutorSpeechBudget({ intent: "why", utterance: "Don't explain in detail" })
      .maxWords,
    35,
  );
  assert.equal(
    tutorSpeechBudget({ intent: "why", preference: "brief" }).maxWords,
    35,
  );
  assert.equal(
    tutorSpeechBudget({
      intent: "why",
      preference: "brief",
      utterance: "Explain in detail",
    }).maxWords,
    180,
  );
});

test("only a required question receives extra space; fallback retains it verbatim", () => {
  const question =
    "A ribbon is 1.5 metres long. Another ribbon is twice that length. How long is the second ribbon?";
  const budget = tutorSpeechBudget({
    intent: "answer",
    requiredQuestion: question,
  });
  assert.equal(budget.maxWords, 25 + speechWords(question));
  const compact = boundedFallback(
    `Correct. ${"That was the previous question. ".repeat(20)}${question}`,
    budget,
    question,
  );
  assert.ok(compact.startsWith("Correct."));
  assert.ok(compact.endsWith(question));
  assert.ok(speechWords(compact) <= budget.maxWords);
  assert.equal((compact.match(/1\.5/g) ?? []).length, 1);
});

test("fallback compaction never cuts sentences or decimal quantities", () => {
  const budget = tutorSpeechBudget({ intent: "define" });
  const first = "The marker is 1.5 units from zero.";
  const result = boundedFallback(
    `${first} ${"An additional sentence explains a separate point. ".repeat(10)}`,
    budget,
  );
  assert.ok(result.startsWith(first));
  assert.ok(result.endsWith("point."));
  assert.ok(speechWords(result) <= 35);
  assert.equal(boundedFallback("word ".repeat(80), budget), "");
});

test("single-call definition routing excludes ambiguous and compound questions", () => {
  for (const text of [
    "What is a proton?",
    "What are prime numbers?",
    "What does denominator mean?",
    "Define photosynthesis.",
  ])
    assert.equal(isSimpleDefinition(text), true, text);
  for (const text of [
    "What is it?",
    "What is the answer?",
    "What is the difference between mass and weight?",
    "What is a proton and why is it positive?",
    "What is 2 plus 2?",
    "What is the earlier example?",
    "B, but what is a proton?",
    "What does that mean?",
    "What does denominator mean? Explain in depth.",
  ])
    assert.equal(isSimpleDefinition(text), false, text);
});
