import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "primer-schoolwork-")),
  "test.sqlite",
);
const { prepareHomeworkUpload } = await import("../src/server/api");
const { provider } = await import("../src/server/provider");
const { emptyLearner, initialState, updateStrategy } =
  await import("../src/lib/learning");
const { register } = await import("../src/server/auth");
const { createChild, saveLearner } = await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test("uploads accept photos and PDFs but reject anything else", async () => {
  const png = await prepareHomeworkUpload(
    new File([tinyPng], "worksheet.png", { type: "image/png" }),
  );
  assert.equal(png.mime, "image/jpeg");
  assert.ok(png.dataUrl.startsWith("data:image/jpeg;base64,"));

  const pdf = await prepareHomeworkUpload(
    new File([new Uint8Array([37, 80, 68, 70])], "worksheet.pdf", {
      type: "application/pdf",
    }),
  );
  assert.equal(pdf.mime, "application/pdf");
  assert.ok(pdf.dataUrl.startsWith("data:application/pdf;base64,"));

  await assert.rejects(
    prepareHomeworkUpload(new File(["x"], "notes.txt", { type: "text/plain" })),
  );
  await assert.rejects(
    prepareHomeworkUpload(
      new File([new Uint8Array(6 * 1024 * 1024)], "big.png", {
        type: "image/png",
      }),
    ),
  );
});

test("offline identification stays manual for every file kind", async () => {
  const local = provider();
  assert.equal(local.constructor.name, "LocalTutorProvider");
  assert.equal(await local.identify("data:image/jpeg;base64,AAA"), null);
  assert.equal(
    await local.identify("data:application/pdf;base64,JVBERi0"),
    null,
  );
});

test("the same worksheet produces different tutoring for different children", () => {
  const user = register("School", "school@test.local", "long-password-123");
  const mkChild = (nickname: string) =>
    createChild(user.id, {
      nickname,
      age: 9,
      grade: 4,
      goal: "Build confidence",
    });
  const maya = mkChild("Maya"),
    adam = mkChild("Adam");

  const mayaLearner = emptyLearner();
  mayaLearner.states.equivalent_fractions = {
    ...initialState(maya.id, "equivalent_fractions"),
    masteryScore: 0.45,
  };
  let e = updateStrategy(
    undefined,
    maya.id,
    "visual_fraction_model",
    "Fractions",
    true,
    0.04,
    new Date(),
    "Math",
  );
  for (let i = 0; i < 3; i++)
    e = updateStrategy(e, maya.id, e.strategyId, e.conceptDomain, true, 0.04);
  mayaLearner.strategies.push(e);
  saveLearner(maya.id, mayaLearner);

  const adamLearner = emptyLearner();
  adamLearner.states.multiplication_by_4 = {
    ...initialState(adam.id, "multiplication_by_4"),
    masteryScore: 0.9,
  };
  saveLearner(adam.id, adamLearner);

  const homeworkId = "123e4567-e89b-12d3-a456-426614174000";
  const mayaSession = startSession(
    maya,
    "homework",
    "equivalent_fractions",
    homeworkId,
  );
  const adamSession = startSession(
    adam,
    "homework",
    "equivalent_fractions",
    homeworkId,
  );
  assert.equal(mayaSession.kind, "homework");
  assert.equal(mayaSession.homeworkId, homeworkId);
  assert.equal(mayaSession.decision.strategy, "visual_fraction_model");
  assert.equal(adamSession.decision.strategy, "symbolic_first");
  assert.match(mayaSession.decision.personalization, /helped last time/);
  assert.match(adamSession.decision.personalization, /strengths/);
});
