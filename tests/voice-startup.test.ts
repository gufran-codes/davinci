import { test } from "node:test";
import assert from "node:assert/strict";
import { voiceStatusPacket, voiceEndDelay } from "../agents/protocol";

test("voice endpoint delay is configurable with bounded, safe defaults", () => {
  for (const value of [undefined, "", " ", "invalid", "Infinity"])
    assert.equal(voiceEndDelay(value), 1200);
  assert.equal(voiceEndDelay("2200"), 2200);
  assert.equal(voiceEndDelay("-1"), 800);
  assert.equal(voiceEndDelay("999999"), 4000);
});

test("worker can publish initializing/listening before greeting loads, then tag teaching turns", () => {
  const packets = [
    voiceStatusPacket("initializing", undefined),
    voiceStatusPacket("listening", undefined),
    voiceStatusPacket("thinking", {}),
    voiceStatusPacket("speaking", { conversation: { turnId: "greeting" } }),
  ];
  assert.deepEqual(JSON.parse(JSON.stringify(packets)), [
    { type: "status", status: "initializing" },
    { type: "status", status: "listening" },
    { type: "status", status: "thinking" },
    { type: "status", status: "speaking", turnId: "greeting" },
  ]);
});
