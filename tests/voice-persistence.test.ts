import { test } from "node:test";
import assert from "node:assert/strict";
import { VoicePersistence } from "../agents/persistence";

test("a blocked metric cannot delay delivery receipts or the next turn", async () => {
  const metric = Promise.withResolvers<void>();
  const receipt = Promise.withResolvers<void>();
  const events: string[] = [];
  const queue = new VoicePersistence(() =>
    assert.fail("Unexpected persistence failure"),
  );
  queue.metric(async () => {
    events.push("metric");
    await metric.promise;
  });
  queue.receipt(async () => {
    events.push("receipt");
    await receipt.promise;
  });
  queue.receipt(async () => {
    events.push("receipt-two");
  });
  let ready = false;
  const turn = queue.beforeTurn().then(() => {
    ready = true;
  });
  await Promise.resolve();
  assert.equal(ready, false);
  assert.deepEqual(events, ["metric", "receipt"]);
  receipt.resolve();
  await turn;
  assert.deepEqual(events, ["metric", "receipt", "receipt-two"]);
  assert.equal(ready, true);
  metric.resolve();
});

test("failed receipts do not poison later turns and telemetry backlog is bounded", async () => {
  const errors: string[] = [];
  const queue = new VoicePersistence((kind) => {
    errors.push(kind);
  });
  queue.receipt(async () => {
    throw new Error("offline");
  });
  let saved = false;
  queue.receipt(async () => {
    saved = true;
  });
  await queue.beforeTurn();
  assert.equal(saved, true);
  assert.deepEqual(errors, ["receipt"]);
  let calls = 0;
  const metric = Promise.withResolvers<void>();
  for (let i = 0; i < 100; i++)
    queue.metric(async () => {
      calls++;
      await metric.promise;
    });
  await queue.beforeTurn();
  assert.equal(calls, 1);
  metric.resolve();
  // Drain the finite microtask chain, with no network or real timers.
  for (let i = 0; i < 300; i++) await Promise.resolve();
  assert.equal(calls, 32);
});
