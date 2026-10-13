import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-usage-")),
  "test.sqlite",
);
process.env.OPENAI_API_KEY = "";
const { usageEstimate, trackModelRequest, withModelUsage } =
  await import("../src/server/model-usage");
const { register } = await import("../src/server/auth");
const { createChild } = await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { all } = await import("../src/server/db");

test("standard estimates account for cached input and do not charge reasoning twice", () => {
  const usage = {
    input_tokens: 1000,
    output_tokens: 200,
    input_tokens_details: { cached_tokens: 400 },
    output_tokens_details: { reasoning_tokens: 100 },
  };
  assert.ok(Math.abs(usageEstimate("gpt-6.1-sol", usage)! - 0.00324) < 1e-10);
  assert.ok(Math.abs(usageEstimate("gpt-6-luna", usage)! - 0.000164) < 1e-10);
  assert.equal(usageEstimate("unpriced", usage), null);
  assert.equal(usageEstimate("gpt-6.1-sol", usage, "priority"), null);
  assert.equal(
    usageEstimate("gpt-6.1-sol", { ...usage, input_tokens: 300000 }),
    null,
  );
});

test("usage is scoped per request including repairs; failures are unknown cost, with no transcript or secret persisted", async () => {
  const parent = register("QA", `${randomUUID()}@test.local`, "test-password");
  const child = createChild(parent.id, {
    nickname: "Test",
    age: 9,
    grade: 4,
    goal: "Learn",
    subjects: ["Math"],
  });
  const session = startSession(child, "lesson", "equivalent_fractions");
  const response = {
    model: "gpt-6-luna",
    status: "completed",
    usage: { input_tokens: 100, output_tokens: 50 },
    transcript: "private student text",
    secret: "private-token",
  };
  await Promise.all([
    withModelUsage(session, "turn-a", async () => {
      await trackModelRequest("interpreter", async () => response);
      await trackModelRequest("tutor", async () => ({
        ...response,
        model: "gpt-6.1-sol",
      }));
      await trackModelRequest("tutor", async () => ({
        ...response,
        model: "gpt-6.1-sol",
      }));
    }),
    withModelUsage(session, "turn-b", async () => {
      await assert.rejects(
        trackModelRequest("tutor", async () => {
          throw new Error("private-token");
        }),
      );
    }),
  ]);
  await trackModelRequest("interpreter", async () => response); // no scope, no event
  const records = all<{ metadata: string }>(
    "SELECT metadata FROM session_events WHERE session_id=? AND type='model_usage'",
    session.id,
  ).map((row) => JSON.parse(row.metadata));
  assert.equal(records.length, 4);
  assert.equal(records.filter((r) => r.requestId === "turn-a").length, 3);
  assert.equal(
    records.find((r) => r.requestId === "turn-b").estimatedUsd,
    null,
  );
  assert.equal(
    records.find((r) => r.requestId === "turn-b").usageUnavailable,
    true,
  );
  assert.equal(records.find((r) => r.role === "interpreter").inputTokens, 100);
  assert.doesNotMatch(JSON.stringify(records), /private/);
});
