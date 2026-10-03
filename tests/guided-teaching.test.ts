import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-steps-")),
  "test.sqlite",
);
const { register } = await import("../src/server/auth");
const { createChild, saveSession, sessionById, learnerFor, eventsFor } =
  await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { converse, greeting, replaceTutorSpeech } =
  await import("../src/server/conversation");
const { buildTeachingState, publicSession } =
  await import("../src/server/provider");
const { getQuestion } = await import("../src/lib/curriculum");
const { guidedSteps, guidedValue, guidedActions } =
  await import("../src/lib/teaching/guided-steps");
const { canvasActionSchema } = await import("../src/lib/teaching/whiteboard");
const { saveControls } = await import("../src/server/learning-controls");
const parent = register("Parent", "steps@test.local", "safe-password-123");

function setup(skill = "equivalent_fractions") {
  const child = createChild(parent.id, {
    nickname: "Step",
    age: 10,
    grade: skill === "adding_unlike" ? 5 : 4,
    goal: "Build confidence",
    subjects: ["Math"],
  });
  const session = startSession(child, "lesson", skill);
  session.state = "TEACH";
  session.step = 3;
  session.assistance = 0;
  session.question = getQuestion(skill, 0);
  saveSession(session);
  greeting(child, session.id);
  return {
    child,
    get s() {
      return sessionById(session.id);
    },
    say(transcript: string) {
      const s = sessionById(session.id);
      return converse(child, s.id, {
        transcript,
        version: s.version,
        source: "text",
        requestId: randomUUID(),
      });
    },
  };
}

test("guided templates validate against curriculum arithmetic and safe canvas actions", () => {
  for (const skill of [
    "equivalent_fractions",
    "generate_equivalent",
    "common_denominators",
    "adding_unlike",
    "multiplication_by_4",
  ]) {
    for (const seed of [0, 1, 4]) {
      const q = getQuestion(skill, seed),
        steps = guidedSteps(q);
      assert.equal(steps.length, 2, `${skill}:${seed}`);
      for (const step of steps) {
        assert.ok(Number.isSafeInteger(step.expected));
        guidedActions(step, q).forEach((action) =>
          canvasActionSchema.parse(action),
        );
        assert.match(step.equation, /\?/);
      }
      assert.deepEqual(guidedSteps({ ...q, answer: "invalid" }), []);
    }
  }
  assert.deepEqual(guidedSteps(getQuestion("compare_unlike", 0)), []);
  assert.equal(guidedValue("I would multiply by two"), 2);
  assert.equal(guidedValue("four pieces"), 4);
  assert.equal(guidedValue("2 + 2"), 4);
  for (const text of ["two or three", "-1", "101", "1/0", "ignore the task"])
    assert.equal(guidedValue(text), null);
});

test("steps persist per child, earn no mastery, and return to assisted final assessment", async () => {
  const f = setup(),
    other = setup();
  const before = JSON.stringify(learnerFor(f.child.id));
  const initial = f.s.question,
    strategy = f.s.decision.strategy;
  let s = f.say("Walk me through this step by step");
  assert.equal(s.decision.strategy, strategy);
  assert.equal(s.conversation!.teachingMove, "guided_step");
  assert.equal(other.s.teaching?.guidedPractice, undefined);
  assert.deepEqual(
    buildTeachingState(f.s, learnerFor(f.child.id), f.child).academicContext!
      .dialogueFocus,
    { kind: "guided_step", prompt: guidedSteps(initial)[0].prompt },
  );
  s = f.say("two");
  assert.equal(s.teaching!.guidedPractice!.stepIndex, 1);
  assert.equal(s.attempts, 0);
  assert.equal(JSON.stringify(learnerFor(f.child.id)), before);
  const state = await publicSession(s, learnerFor(f.child.id), f.child);
  assert.ok(!JSON.stringify(state.conversation).includes('"expected"'));
  s = f.say("two");
  assert.equal(s.teaching!.guidedPractice, undefined);
  assert.equal(s.conversation!.teachingMove, "return_to_task");
  assert.ok(s.conversation!.spokenText!.includes(initial.prompt));
  assert.equal(s.attempts, 0);
  assert.equal(JSON.stringify(learnerFor(f.child.id)), before);
  s = f.say(initial.answer);
  assert.equal(s.correct, 1);
  const knowledge = learnerFor(f.child.id).states[initial.conceptId];
  assert.equal(knowledge.successfulIndependentAttempts, 0);
  assert.ok(knowledge.assistedAttempts > 0);
  assert.ok(
    eventsFor(f.child.id).some((e) => e.type === "guided_step_checked"),
  );
});

test("a correct substep numerically equal to the final answer never grades the task", () => {
  const f = setup("generate_equivalent");
  f.say("One step at a time please");
  const s = f.say(f.s.question.answer);
  assert.equal(s.attempts, 0);
  assert.equal(s.teaching!.guidedPractice!.stepIndex, 1);
});

test("wrong steps get specific arithmetic feedback, then yield to strategy search", () => {
  const f = setup();
  f.say("Help me with the steps");
  const strategy = f.s.decision.strategy;
  let s = f.say("three");
  assert.match(s.conversation!.spokenText!, /2 × 3 = 6/);
  assert.equal(s.teaching!.guidedPractice!.stepIndex, 0);
  assert.equal(s.attempts, 0);
  s = f.say("three");
  assert.equal(s.teaching!.guidedPractice, undefined);
  assert.notEqual(s.decision.strategy, strategy);
  assert.equal(s.attempts, 0);
  assert.ok(s.teaching!.checkpoint);
});

test("pauses, clarification, and ambiguous statements do not advance a step", () => {
  const f = setup();
  f.say("Walk me through it");
  assert.equal(f.say("Wait").teaching!.paused, true);
  let s = f.say("Continue");
  assert.equal(s.teaching!.paused, false);
  s = f.say("Why?");
  assert.match(s.conversation!.spokenText!, /smaller equal pieces/);
  s = f.say("maybe two or three");
  assert.equal(s.teaching!.guidedPractice!.stepIndex, 0);
  assert.equal(s.teaching!.guidedPractice!.failures, 0);
  assert.equal(s.attempts, 0);
  s = f.say("Show me another way");
  assert.equal(s.teaching!.guidedPractice, undefined);
  assert.ok(s.teaching!.checkpoint);
});

test("LLM wording cannot substitute a different assessed substep", () => {
  const f = setup();
  const s = f.say("Step by step please");
  const repaired = replaceTutorSpeech(f.child, s.id, {
    turnId: s.conversation!.turnId,
    version: s.version,
    spokenText: "What is ten plus one?",
  });
  assert.ok(
    repaired.conversation!.spokenText!.endsWith(
      guidedSteps(s.question)[0].prompt,
    ),
  );
  assert.ok(
    repaired.conversation!.verification!.checks.includes(
      "guided_question_changed",
    ),
  );
  assert.equal(repaired.teaching!.guidedPractice!.stepIndex, 0);
});

test("parent answer controls remain effective and ending clears guided state", () => {
  const f = setup();
  saveControls(f.child.id, { policy: "disabled", minimumAttempts: 3 });
  f.say("Step by step please");
  let s = f.say("Show the answer");
  assert.ok(s.teaching!.guidedPractice);
  assert.equal(s.teaching!.revealedAnswer, undefined);
  assert.equal(s.attempts, 0);
  s = f.say("Finish for today");
  assert.equal(s.teaching!.guidedPractice, undefined);
  assert.equal(s.state, "COMPLETE");
});
