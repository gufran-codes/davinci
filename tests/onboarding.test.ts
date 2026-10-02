import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "primer-onboarding-")),
  "test.sqlite",
);
const { childSchema } = await import("../src/server/api");
const { register } = await import("../src/server/auth");
const { createChild, ownedChild } = await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { emptyLearner, initialState, subjectOverview } =
  await import("../src/lib/learning");
const { conceptById } = await import("../src/lib/curriculum");

test("onboarding validation matches grades 1-10, ages 6-16, and chosen subjects", () => {
  const good = childSchema.parse({
    nickname: "Maya",
    age: 6,
    grade: 1,
    goal: "Fill learning gaps",
    subjects: ["Math", "English"],
  });
  assert.deepEqual(good.subjects, ["Math", "English"]);
  assert.throws(() =>
    childSchema.parse({
      nickname: "M",
      age: 9,
      grade: 11,
      goal: "Get ahead",
      subjects: ["Math"],
    }),
  );
  assert.throws(() =>
    childSchema.parse({
      nickname: "M",
      age: 5,
      grade: 1,
      goal: "Get ahead",
      subjects: ["Math"],
    }),
  );
  assert.throws(() =>
    childSchema.parse({
      nickname: "M",
      age: 9,
      grade: 4,
      goal: "Get ahead",
      subjects: [],
    }),
  );
  assert.throws(() =>
    childSchema.parse({
      nickname: "M",
      age: 9,
      grade: 4,
      goal: "Get personalized math practice",
      subjects: ["Math"],
    }),
  );
});

test("high-school profiles launch the secondary curriculum in their chosen subject", () => {
  const user = register(
    "High School",
    "high-school@test.local",
    "long-password-123",
  );
  const input = childSchema.parse({
    nickname: "Sam",
    age: 16,
    grade: 10,
    goal: "Get ahead",
    subjects: ["Science"],
  });
  const child = createChild(user.id, input);
  assert.equal(ownedChild(user.id, child.id).grade, 10);
  const session = startSession(child, "lesson");
  assert.equal(session.question.subject, "Science");
  assert.match(session.plan.targetConcept, /^g10_science_/);
});

test("child subjects persist with a Math default", () => {
  const user = register("Onboard", "onboard@test.local", "long-password-123");
  const a = createChild(user.id, {
    nickname: "A",
    age: 7,
    grade: 2,
    goal: "Help with schoolwork",
    subjects: ["Science", "English"],
  });
  assert.deepEqual(ownedChild(user.id, a.id).subjects, ["Science", "English"]);
  const b = createChild(user.id, {
    nickname: "B",
    age: 9,
    grade: 4,
    goal: "Get ahead",
  });
  assert.deepEqual(ownedChild(user.id, b.id).subjects, ["Math"]);
});

test("subject overview orients each subject without scores", () => {
  const l = emptyLearner();
  const now = new Date().toISOString();
  l.states.multiplication_by_4 = {
    ...initialState("c", "multiplication_by_4"),
    masteryScore: 0.8,
    lastPracticedAt: now,
    evidence: [
      {
        at: now,
        questionId: "q",
        correct: true,
        assistance: 0,
        delta: 0.08,
        strategy: "symbolic_first",
        sessionId: "s",
      },
    ],
  };
  const rows = subjectOverview(l);
  assert.deepEqual(
    rows.map((r) => r.subject),
    ["Math", "English", "Science", "Social Studies"],
  );
  assert.equal(rows[0].practiced, 1);
  assert.equal(rows[0].lastSkillId, "multiplication_by_4");
  assert.equal(rows[1].practiced, 0);
  assert.equal(rows[1].lastSkillId, null);
});

test("a subject session starts inside that subject", () => {
  const user = register("Subj", "subj@test.local", "long-password-123");
  const c = createChild(user.id, {
    nickname: "Maya",
    age: 9,
    grade: 4,
    goal: "Fill learning gaps",
    subjects: ["Math", "Science"],
  });
  const s = startSession(c, "lesson", undefined, undefined, "Science");
  assert.equal(conceptById[s.plan.targetConcept].subject, "Science");
  assert.equal(conceptById[s.question.conceptId].subject, "Science");
});

test("legacy databases gain subjects with old grades clamped into range", async () => {
  const { readFileSync } = await import("node:fs");
  const { DatabaseSync } = await import("node:sqlite");
  const dir = mkdtempSync(path.join(tmpdir(), "primer-legacy-"));
  const file = path.join(dir, "legacy.sqlite");
  const legacy = new DatabaseSync(file);
  legacy.exec(
    readFileSync(
      path.join(process.cwd(), "migrations/001_initial.sql"),
      "utf8",
    ),
  );
  legacy.exec(
    "INSERT INTO users VALUES('u','e','n','h','2020-01-01'); INSERT INTO children VALUES('c','u','M',11,6,'Build confidence',0,'2020-01-01')",
  );
  legacy.close();
  process.env.DATABASE_PATH = file;
  const { db, one } = await import("../src/server/db");
  (globalThis as unknown as { primerDb?: unknown }).primerDb = undefined;
  db();
  const row = one<{ grade: number; subjects: string }>(
    "SELECT grade,subjects FROM children WHERE id='c'",
  );
  assert.equal(row?.grade, 5);
  assert.equal(row?.subjects, '["Math"]');
  assert.ok(
    one<{ version: string }>(
      "SELECT version FROM schema_migrations WHERE version='003_onboarding.sql'",
    ),
  );
});
