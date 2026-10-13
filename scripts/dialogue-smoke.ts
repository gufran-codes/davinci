/** Opt-in live semantic/speech check. Uses synthetic records in a fresh temp DB,
 * never the family's lesson history. Requires the existing OPENAI_API_KEY. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

if (!process.env.OPENAI_API_KEY)
  throw new Error("OPENAI_API_KEY is required for this opt-in check.");
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "davinci-live-dialogue-")),
  "test.sqlite",
);
const { register } = await import("../src/server/auth");
const { createChild, saveSession, learnerFor } =
  await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { greeting } = await import("../src/server/conversation");
const { conversationTurn } = await import("../src/server/understanding");
const { getQuestion } = await import("../src/lib/curriculum");
const { chooseDecision } = await import("../src/lib/learning");
const { all } = await import("../src/server/db");
const parent = register(
  "Synthetic QA",
  `${randomUUID()}@test.local`,
  randomUUID(),
);
const child = createChild(parent.id, {
  nickname: "Synthetic learner",
  age: 9,
  grade: 4,
  goal: "Understand fractions",
  subjects: ["Math"],
});
let s = startSession(child, "lesson", "equivalent_fractions");
s.question = getQuestion("equivalent_fractions", 0);
s.state = "TEACH";
s.assistance = 0;
s.decision = chooseDecision(learnerFor(child.id), s.question.conceptId);
saveSession(s);
s = greeting(child, s.id);
const probes = [
  `${s.question.answer}, but why do we multiply the top and bottom by the same number?`,
  "I understand that we split the pieces, but not why the amount stays the same. Please explain directly instead of asking questions.",
  "I still don't understand the unchanged amount. Can you use a separate worked example?",
  "Random question: why is the sky blue?",
  "Back to that earlier fraction example: what exactly is the whole?",
];
let failures = 0;
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice(8)) : probes.length;
assert.ok(
  Number.isInteger(limit) && limit >= 1 && limit <= probes.length,
  "--limit must be 1–5",
);
for (const [index, transcript] of probes.slice(0, limit).entries()) {
  const started = Date.now();
  const requestId = randomUUID();
  s = await conversationTurn(child, s.id, {
    requestId,
    version: s.version,
    transcript,
    source: "text",
  });
  const trace = s.teaching!.lastTurnTrace!;
  const quality = trace.quality;
  if (
    trace.interpretationSource !== "model" ||
    !quality ||
    quality.usedFallback
  )
    failures++;
  console.log(
    JSON.stringify({
      probe: index + 1,
      student: transcript,
      intent: trace.interpretation.intent,
      mode: s.teaching!.dialogue!.plan!.mode,
      semanticSource: trace.interpretationSource,
      quality,
      speech: s.conversation!.spokenText,
      milliseconds: Date.now() - started,
      modelUsage: all<{ metadata: string }>(
        "SELECT metadata FROM session_events WHERE session_id=? AND type='model_usage'",
        s.id,
      )
        .map((row) => JSON.parse(row.metadata))
        .filter((row) => row.requestId === requestId),
    }),
  );
  assert.equal(
    s.attempts,
    1,
    "Only the first compound message should be assessed",
  );
  assert.equal(s.correct, 1);
  assert.ok(s.teaching!.dialogue!.gaps.length > 0);
}
console.log(
  JSON.stringify({
    probes: limit,
    fallbackOrUnavailable: failures,
    database: process.env.DATABASE_PATH,
  }),
);
if (failures) process.exitCode = 1;
