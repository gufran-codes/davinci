import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-board-")),
  "test.sqlite",
);
process.env.OPENAI_API_KEY = "";
const { register } = await import("../src/server/auth");
const { createChild, saveSession, learnerFor, sessionById } =
  await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { greeting, converse, replaceTutorSpeech } =
  await import("../src/server/conversation");
const { chooseDecision } = await import("../src/lib/learning");
const { canvasActionSchema } = await import("../src/lib/teaching/whiteboard");
const { publicSession } = await import("../src/server/provider");

test("a real science support turn draws only the source food chain, persists it and retimes final wording", async () => {
  const parent = register(
    `board-${randomUUID()}@example.com`,
    "password123",
    "Parent",
  );
  const child = createChild(parent.id, {
    nickname: "Learner",
    age: 8,
    grade: 3,
    goal: "Understand relationships",
    subjects: ["Science"],
  });
  let session = startSession(child, "lesson", "g3_science_ecosystems");
  session.assistance = 1;
  session.decision = chooseDecision(
    learnerFor(child.id),
    session.question.conceptId,
  );
  saveSession(session);
  session = greeting(child, session.id);
  const before = JSON.stringify(learnerFor(child.id));
  session = converse(child, session.id, {
    requestId: randomUUID(),
    version: session.version,
    transcript: "Can you show me?",
    source: "voice",
  });
  const actions = session.conversation!.canvasActions!;
  assert.ok(canvasActionSchema.array().safeParse(actions).success);
  assert.deepEqual(
    actions.filter((a) => a.type === "drawDiagramNode").map((a) => a.label),
    ["grass", "rabbit", "fox"],
  );
  assert.equal(session.attempts, 0);
  assert.equal(JSON.stringify(learnerFor(child.id)), before);
  assert.deepEqual(
    sessionById(session.id).conversation!.canvasActions,
    actions,
  );
  const publicState = await publicSession(session, learnerFor(child.id), {
    grade: 3,
    age: 8,
  });
  assert.deepEqual(publicState.conversation!.canvasActions, actions);
  const originalIds = actions.map((a) => a.id);
  const next = replaceTutorSpeech(child, session.id, {
    turnId: session.conversation!.turnId,
    version: session.version,
    spokenText:
      "Look at grass, then rabbit, then fox. Which relationship helps you think?",
  });
  assert.deepEqual(
    next.conversation!.canvasActions!.map((a) => a.id),
    originalIds,
  );
  assert.ok(
    next.conversation!.canvasActions!.every(
      (a) => a.atWord < next.conversation!.spokenText!.split(/\s+/).length,
    ),
  );
});
