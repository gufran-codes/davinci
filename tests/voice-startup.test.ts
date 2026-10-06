import { test } from "node:test";
import assert from "node:assert/strict";
import { voiceStatusPacket } from "../agents/protocol";

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
