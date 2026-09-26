import { test } from "node:test";
import assert from "node:assert/strict";
import {
  concepts,
  conceptById,
  getQuestion,
  gradeSkillAnswer,
  misconceptions,
} from "../src/lib/curriculum";
import {
  chooseDecision,
  emptyLearner,
  initialState,
  strengthsFor,
  updateMisconception,
} from "../src/lib/learning";

test("skill graph spans four subjects with valid prerequisites and no cycles", () => {
  assert.ok(concepts.length >= 260);
  const subjects = new Set(concepts.map((c) => c.subject));
  assert.deepEqual([...subjects].sort(), [
    "English",
    "Math",
    "Science",
    "Social Studies",
  ]);
  for (const c of concepts) {
    assert.ok(c.topic, `${c.id} needs a topic`);
    assert.ok(
      Array.isArray(c.gradeRange) && c.gradeRange.length === 2,
      `${c.id} needs a grade range`,
    );
    for (const p of c.prerequisites) {
      assert.ok(conceptById[p], `${c.id} has unknown prerequisite ${p}`);
      assert.equal(
        conceptById[p].subject,
        c.subject,
        `${c.id} prerequisite ${p} must be same-subject for now`,
      );
    }
  }
  const visit = (id: string, seen: string[]) => {
    assert.ok(!seen.includes(id), "skill graph must be acyclic");
    for (const p of conceptById[id].prerequisites) visit(p, [...seen, id]);
  };
  for (const c of concepts) visit(c.id, []);
  for (const m of misconceptions) {
    assert.ok(m.subject, `${m.id} needs a subject`);
    for (const c of m.conceptIds) {
      assert.ok(conceptById[c], `${m.id} maps to unknown skill ${c}`);
      assert.equal(conceptById[c].subject, m.subject);
    }
  }
});

test("new-subject questions carry their subject and grade through the pluggable grader", () => {
  for (const id of [
    "ela_reading_inference",
    "ela_vocabulary_context",
    "science_energy_forms",
    "social_map_skills",
  ]) {
    for (const transfer of [false, true]) {
      const q = getQuestion(id, 0, transfer);
      assert.equal(q.subject, conceptById[id].subject);
      assert.ok(q.prompt && q.hint && q.explanation && q.concrete);
      assert.ok(
        gradeSkillAnswer(q.answer, q.answer, q.exact, q.subject),
        `${id} must self-grade`,
      );
    }
  }
  assert.ok(
    gradeSkillAnswer(
      "It is probably raining.",
      "it is probably raining",
      false,
      "English",
    ),
  );
  assert.ok(gradeSkillAnswer("DRY", "dry", false, "English"));
  assert.ok(!gradeSkillAnswer("wet", "dry", false, "English"));
  assert.ok(gradeSkillAnswer("2/4", "1/2", false, "Math"));
  assert.ok(gradeSkillAnswer("2/4", "1/2"));
});

test("non-math misconceptions confirm through targeted probes", () => {
  const q = getQuestion("ela_reading_inference", 0);
  assert.equal(q.misconception?.id, "literal_only");
  const first = updateMisconception(
    undefined,
    "child",
    q,
    q.misconception!.answer,
  )!;
  assert.equal(first.confirmed, false);
  const q2 = getQuestion("ela_reading_inference", 1, true);
  const second = updateMisconception(first, "child", q2, q2.answer)!;
  assert.ok(second.confidence < first.confidence);
});

test("strengths generalize beyond multiplication and anchor new teaching", () => {
  const l = emptyLearner();
  l.states.science_energy_forms = {
    ...initialState("child", "science_energy_forms"),
    masteryScore: 0.8,
  };
  const strengths = strengthsFor(l);
  assert.equal(strengths[0].skillId, "science_energy_forms");
  assert.equal(strengths[0].subject, "Science");

  const math = emptyLearner();
  math.states.division_inverse = {
    ...initialState("child", "division_inverse"),
    masteryScore: 0.9,
  };
  const decision = chooseDecision(math, "equivalent_fractions");
  assert.equal(decision.strategy, "symbolic_first");
  assert.equal(decision.strengthToLeverage, "division_inverse");
  assert.match(decision.personalization, /strengths/);
});

test("repeated failure escalates to re-teach scaffolding level", () => {
  assert.equal(
    chooseDecision(emptyLearner(), "equivalent_fractions", 2).scaffoldingLevel,
    5,
  );
  assert.equal(
    chooseDecision(emptyLearner(), "equivalent_fractions", 0).scaffoldingLevel,
    2,
  );
});

test("subject migration applies to a legacy database and backfills Math", async () => {
  const { mkdtempSync, readFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const path = (await import("node:path")).default;
  const { DatabaseSync } = await import("node:sqlite");
  const dir = mkdtempSync(path.join(tmpdir(), "primer-migrate-"));
  const file = path.join(dir, "legacy.sqlite");
  const legacy = new DatabaseSync(file);
  legacy.exec(
    readFileSync(
      path.join(process.cwd(), "migrations/001_initial.sql"),
      "utf8",
    ),
  );
  legacy.exec(
    "INSERT INTO users VALUES('u','e','n','h','2020-01-01'); INSERT INTO children VALUES('c','u','M',9,4,'g',0,'2020-01-01'); INSERT INTO teaching_strategies VALUES('symbolic_first','n'); INSERT INTO teaching_strategy_evidence VALUES('c','symbolic_first','Fractions','{}','2020-01-01')",
  );
  legacy.close();
  process.env.DATABASE_PATH = file;
  const { db, one, all } = await import("../src/server/db");
  db();
  const cols = all<{ name: string }>("PRAGMA table_info(concepts)").map(
    (c) => c.name,
  );
  assert.ok(cols.includes("subject"));
  assert.equal(
    one<{ subject: string }>(
      "SELECT subject FROM teaching_strategy_evidence WHERE child_id='c'",
    )?.subject,
    "Math",
  );
  assert.ok(
    one<{ version: string }>(
      "SELECT version FROM schema_migrations WHERE version='002_subjects.sql'",
    ),
  );
  assert.ok((conceptById.ela_reading_inference?.subject ?? "") === "English");
});
