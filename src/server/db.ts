import { curriculumContent } from "../lib/teaching/content";
import { DatabaseSync, SQLInputValue } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { concepts, misconceptions } from "../lib/curriculum";
import { strategies, strategyNames } from "../lib/types";
const globalDb = globalThis as unknown as {
  primerDb?: DatabaseSync;
  primerSchema?: string;
};
export function db() {
  const schemaVersion = "006_learning_controls";
  if (globalDb.primerDb && globalDb.primerSchema === schemaVersion)
    return globalDb.primerDb;
  const filename =
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "primer.sqlite");
  mkdirSync(path.dirname(filename), { recursive: true });
  const d = globalDb.primerDb ?? new DatabaseSync(filename);
  d.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  d.exec(
    readFileSync(
      path.join(process.cwd(), "migrations/001_initial.sql"),
      "utf8",
    ),
  );
  d.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY)",
  );
  const applied = new Set(
    d
      .prepare("SELECT version FROM schema_migrations")
      .all()
      .map((r) => (r as { version: string }).version),
  );
  for (const file of [
    "002_subjects.sql",
    "003_onboarding.sql",
    "004_conversations.sql",
    "005_structured_memory.sql",
    "006_learning_controls.sql",
  ]) {
    if (applied.has(file)) continue;
    d.exec(readFileSync(path.join(process.cwd(), "migrations", file), "utf8"));
    d.prepare("INSERT INTO schema_migrations VALUES(?)").run(file);
  }
  const insert = d.prepare(
    "INSERT INTO concepts(id,name,domain,subject,data) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,domain=excluded.domain,subject=excluded.subject,data=excluded.data",
  );
  for (const c of concepts)
    insert.run(c.id, c.name, c.domain, c.subject, JSON.stringify(c));
  for (const c of concepts)
    for (const p of c.prerequisites)
      d.prepare("INSERT OR IGNORE INTO concept_prerequisites VALUES(?,?)").run(
        c.id,
        p,
      );
  for (const m of misconceptions) {
    d.prepare("INSERT OR IGNORE INTO misconceptions VALUES(?,?)").run(
      m.id,
      JSON.stringify(m),
    );
    for (const c of m.conceptIds)
      d.prepare("INSERT OR IGNORE INTO concept_misconceptions VALUES(?,?)").run(
        c,
        m.id,
      );
  }
  for (const s of strategies)
    d.prepare("INSERT OR IGNORE INTO teaching_strategies VALUES(?,?)").run(
      s,
      strategyNames[s],
    );
  for (const c of curriculumContent)
    d.prepare(
      "INSERT INTO curriculum_content(skill_id,grade,status,data) VALUES(?,?,?,?) ON CONFLICT(skill_id) DO UPDATE SET grade=excluded.grade,status=excluded.status,data=excluded.data",
    ).run(c.id, c.grade, c.status, JSON.stringify(c));
  globalDb.primerDb = d;
  globalDb.primerSchema = schemaVersion;
  return d;
}
export function one<T>(sql: string, ...args: SQLInputValue[]): T | undefined {
  return db()
    .prepare(sql)
    .get(...args) as T | undefined;
}
export function all<T>(sql: string, ...args: SQLInputValue[]): T[] {
  return db()
    .prepare(sql)
    .all(...args) as T[];
}
export function run(sql: string, ...args: SQLInputValue[]) {
  return db()
    .prepare(sql)
    .run(...args);
}
let transactionDepth = 0;
export function transaction<T>(fn: () => T): T {
  const d = db(),
    level = transactionDepth++,
    savepoint = `primer_${level}`;
  try {
    d.exec(level ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
    const v = fn();
    d.exec(level ? `RELEASE SAVEPOINT ${savepoint}` : "COMMIT");
    return v;
  } catch (error) {
    d.exec(
      level
        ? `ROLLBACK TO SAVEPOINT ${savepoint}; RELEASE SAVEPOINT ${savepoint}`
        : "ROLLBACK",
    );
    throw error;
  } finally {
    transactionDepth--;
  }
}
