import { DatabaseSync, SQLInputValue } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { concepts, misconceptions } from "../lib/curriculum";
import { strategies, strategyNames } from "../lib/types";
const globalDb = globalThis as unknown as { primerDb?: DatabaseSync };
export function db() {
  if (globalDb.primerDb) return globalDb.primerDb;
  const filename =
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "primer.sqlite");
  mkdirSync(path.dirname(filename), { recursive: true });
  const d = new DatabaseSync(filename);
  d.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  d.exec(
    readFileSync(
      path.join(process.cwd(), "migrations/001_initial.sql"),
      "utf8",
    ),
  );
  const insert = d.prepare(
    "INSERT OR IGNORE INTO concepts(id,name,domain,data) VALUES(?,?,?,?)",
  );
  for (const c of concepts)
    insert.run(c.id, c.name, c.domain, JSON.stringify(c));
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
  globalDb.primerDb = d;
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
export function transaction<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const v = fn();
    d.exec("COMMIT");
    return v;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
