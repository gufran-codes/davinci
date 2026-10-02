import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getQuestion } from "../src/lib/curriculum";
import {
  supportPlans,
  selectSupportPlan,
  answerLessonQuestion,
} from "../src/lib/teaching/grounded-support";
import { understandLocally } from "../src/lib/conversation/intent";
import {
  visualActionSequence,
  numberLineSequence,
} from "../src/lib/teaching/whiteboard";
import { guidedSteps } from "../src/lib/teaching/guided-steps";

process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-grounded-")),
  "test.sqlite",
);
const { register } = await import("../src/server/auth");
const { createChild, saveSession, learnerFor } =
  await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { converse, greeting } = await import("../src/server/conversation");

test("alternate requests are not mistaken for answer reveals or grading", () => {
  const q = getQuestion("adding_unlike", 0);
  for (const text of [
    "answer in another way",
    "show me another solution",
    "explain a different method",
  ])
    assert.equal(understandLocally(text, q).intent, "confused", text);
  assert.equal(
    understandLocally("Why don't we add the denominators?", q).intent,
    "why",
  );
  assert.equal(understandLocally("How are you?", q).intent, "rapport");
});
test("different methods have grounded content and exhaustion asks for the missing step", () => {
  for (const id of [
    "equivalent_fractions",
    "adding_unlike",
    "g7_math_two_step_equations",
    "g9_english_rhetoric",
  ]) {
    const plans = supportPlans(getQuestion(id, 0), getQuestion(id, 1));
    const used: string[] = [];
    for (let i = 0; i < plans.length; i++) {
      const p = selectSupportPlan(plans, used);
      assert.ok(!used.includes(p.id));
      used.push(p.id);
      assert.ok(p.message.length > 20);
      assert.doesNotMatch(
        JSON.stringify(p.visuals),
        /Observe.*Predict.*Check evidence/,
      );
    }
    assert.equal(selectSupportPlan(plans, used).id, "locate-gap");
  }
});
test("why answers explain relationships rather than just defining a matching noun", () => {
  const answer = answerLessonQuestion(
    getQuestion("adding_unlike", 0),
    "Why don't we add the denominators?",
    { denominator: "The bottom number." },
  );
  assert.match(answer!, /size of the pieces/);
  assert.doesNotMatch(answer!, /What does that tell/);
  assert.match(
    answerLessonQuestion(
      getQuestion("equivalent_fractions", 0),
      "Why do we multiply both the numerator and denominator?",
      {},
    )!,
    /Both counts must change together/,
  );
});
test("fraction number-line coordinates preserve the numerical value", () => {
  const actions = visualActionSequence([
    { type: "number_line", numerator: 1, denominator: 2 },
  ]);
  assert.ok(actions[0].type === "showNumberLine");
  assert.equal(actions[0].max, 1);
  assert.equal(actions[0].subdivisions, 2);
  assert.ok(actions[1].type === "animateNumberLineJump");
  assert.equal(actions[1].to, 0.5);
  const negative = numberLineSequence(2, -5)[0];
  assert.ok(negative.type === "showNumberLine");
  assert.equal(negative.min, -3);
});
test("algebra guided steps are verified against the key and do not grade substeps as mastery", () => {
  const q = getQuestion("g7_math_two_step_equations", 0);
  const steps = guidedSteps(q);
  assert.equal(steps.length, 2);
  assert.equal(steps[0].expected, 6);
  assert.equal(steps[1].expected, 3);
  assert.equal(guidedSteps({ ...q, answer: "999" }).length, 0);
});
test("conceptual question in guided algebra is answered without consuming a student attempt", () => {
  const parent = register(
    "QA",
    `${randomUUID()}@test.local`,
    "testing-password",
  );
  const child = createChild(parent.id, {
    nickname: "QA",
    age: 12,
    grade: 7,
    subjects: ["Math"],
    goal: "Build confidence",
  });
  let s = startSession(child, "lesson", "g7_math_two_step_equations");
  s.question = getQuestion("g7_math_two_step_equations", 0);
  s.state = "TEACH";
  s.assistance = 1;
  saveSession(s);
  s = greeting(child, s.id);
  const say = (transcript: string) =>
    (s = converse(child, s.id, {
      requestId: randomUUID(),
      version: s.version,
      transcript,
      source: "text",
    }));
  say("Walk me through this step by step");
  const before = JSON.stringify(learnerFor(child.id));
  say("Why do we do the same thing on both sides?");
  assert.match(s.conversation!.spokenText!, /equal|equality/);
  assert.equal(s.teaching!.guidedPractice!.stepIndex, 0);
  assert.equal(JSON.stringify(learnerFor(child.id)), before);
  assert.equal(s.attempts, 0);
});
