import { curriculumContent } from "../lib/teaching/content";
import { DatabaseSync, SQLInputValue } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { concepts, misconceptions } from "../lib/curriculum";
import { strategies, strategyNames } from "../lib/types";
const globalDb = globalThis as unknown as {
  primerDb?: DatabaseSync;
  primerSchema?: string;
};
export function db() {
  const schemaVersion = "008_curriculum_guards";
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
    "007_curriculum_architecture.sql",
    "008_curriculum_guards.sql",
  ]) {
    if (applied.has(file)) continue;
    d.exec(readFileSync(path.join(process.cwd(), "migrations", file), "utf8"));
    d.prepare("INSERT INTO schema_migrations VALUES(?)").run(file);
  }
  const timestamp = new Date().toISOString();
  const subjectId = {
    Math: "math",
    English: "ela",
    Science: "science",
    "Social Studies": "social-studies",
  } as const;
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  d.prepare(
    "INSERT OR IGNORE INTO curriculum_sources(id,name,framework,source_url,source_version,source_year,license_name,license_url,usage_rights,attribution,metadata,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    "davinci-legacy-baseline",
    "Da Vinci legacy authored baseline",
    null,
    "urn:davinci:legacy-authored-baseline",
    "legacy-v1",
    null,
    null,
    null,
    "reference_only",
    "Existing authored and AI-authored baseline; educational and rights review remains required.",
    "{}",
    timestamp,
    timestamp,
  );
  const insert = d.prepare(
    "INSERT INTO concepts(id,name,domain,subject,data,course_id,domain_id,topic_id,recommended_grade_min,recommended_grade_max,curriculum_status,curriculum_version,source_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,domain=excluded.domain,subject=excluded.subject,data=excluded.data,domain_id=excluded.domain_id,topic_id=excluded.topic_id,recommended_grade_min=excluded.recommended_grade_min,recommended_grade_max=excluded.recommended_grade_max,curriculum_status=excluded.curriculum_status,curriculum_version=excluded.curriculum_version,source_id=excluded.source_id,updated_at=excluded.updated_at",
  );
  for (const c of concepts) {
    const domainId = `${subjectId[c.subject]}-${slug(c.domain)}`;
    const topicId = `${domainId}-${slug(c.topic)}`;
    d.prepare(
      "INSERT INTO curriculum_domains(id,subject_id,course_id,code,name,description,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at",
    ).run(
      domainId,
      subjectId[c.subject],
      null,
      slug(c.domain),
      c.domain,
      "",
      timestamp,
      timestamp,
    );
    d.prepare(
      "INSERT INTO curriculum_topics(id,domain_id,code,name,description,sequence,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at",
    ).run(
      topicId,
      domainId,
      slug(c.topic),
      c.topic,
      "",
      0,
      timestamp,
      timestamp,
    );
    const content = curriculumContent.find((item) => item.id === c.id);
    insert.run(
      c.id,
      c.name,
      c.domain,
      c.subject,
      JSON.stringify(c),
      null,
      domainId,
      topicId,
      c.gradeRange[0],
      c.gradeRange.at(-1) ?? c.gradeRange[0],
      content?.status ?? "draft",
      content?.curriculumVersion ?? "legacy-v1",
      "davinci-legacy-baseline",
      timestamp,
    );
    d.prepare(
      "DELETE FROM curriculum_learning_objectives WHERE skill_id=?",
    ).run(c.id);
    c.learningObjectives.forEach((objective, index) =>
      d
        .prepare(
          "INSERT INTO curriculum_learning_objectives(id,skill_id,objective,sequence,status,source_id) VALUES(?,?,?,?,?,?)",
        )
        .run(
          `${c.id}:objective${index + 1}`,
          c.id,
          objective,
          index,
          content?.status ?? "draft",
          "davinci-legacy-baseline",
        ),
    );
  }
  for (const c of concepts)
    for (const p of c.prerequisites)
      d.prepare("INSERT OR IGNORE INTO concept_prerequisites VALUES(?,?)").run(
        c.id,
        p,
      );
  for (const m of misconceptions) {
    d.prepare("INSERT OR IGNORE INTO misconceptions(id,data) VALUES(?,?)").run(
      m.id,
      JSON.stringify(m),
    );
    d.prepare(
      "UPDATE misconceptions SET source_id=?,curriculum_status=?,curriculum_version=?,updated_at=? WHERE id=?",
    ).run("davinci-legacy-baseline", "draft", "legacy-v1", timestamp, m.id);
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
  for (const c of concepts) {
    d.prepare("DELETE FROM curriculum_skill_strategies WHERE skill_id=?").run(
      c.id,
    );
    c.teachingStrategyIds.forEach((strategy, priority) =>
      d
        .prepare(
          "INSERT INTO curriculum_skill_strategies(skill_id,strategy_id,priority,rationale) VALUES(?,?,?,?)",
        )
        .run(c.id, strategy, priority, "Legacy curriculum recommendation"),
    );
    d.prepare(
      "INSERT INTO curriculum_assessment_requirements(skill_id,diagnostic_required,practice_required,mastery_required,mastery_threshold,minimum_independent_attempts,transfer_required,rubric,metadata) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(skill_id) DO UPDATE SET diagnostic_required=excluded.diagnostic_required,practice_required=excluded.practice_required,mastery_required=excluded.mastery_required,rubric=excluded.rubric,metadata=excluded.metadata",
    ).run(
      c.id,
      c.diagnosticItems.length ? 1 : 0,
      c.practiceItems.length ? 1 : 0,
      c.masteryItems.length ? 1 : 0,
      0.75,
      2,
      1,
      "{}",
      JSON.stringify({
        diagnosticItems: c.diagnosticItems,
        practiceItems: c.practiceItems,
        masteryItems: c.masteryItems,
      }),
    );
  }
  for (const c of curriculumContent) {
    for (const standard of c.standards) {
      const sourceId = `reference-${createHash("sha256")
        .update(standard.source)
        .digest("hex")
        .slice(0, 16)}`;
      d.prepare(
        "INSERT INTO curriculum_sources(id,name,framework,source_url,source_version,source_year,license_name,license_url,usage_rights,attribution,metadata,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,framework=excluded.framework,updated_at=excluded.updated_at",
      ).run(
        sourceId,
        `${standard.framework} reference`,
        standard.framework,
        standard.source,
        null,
        null,
        null,
        null,
        "reference_only",
        null,
        "{}",
        timestamp,
        timestamp,
      );
      d.prepare(
        "INSERT INTO curriculum_standard_mappings(skill_id,standard_id,framework,reference_label,source_id,alignment,notes) VALUES(?,?,?,?,?,?,?) ON CONFLICT(skill_id,framework,reference_label,source_id) DO UPDATE SET alignment=excluded.alignment,notes=excluded.notes",
      ).run(
        c.id,
        null,
        standard.framework,
        standard.reference,
        sourceId,
        "reference_only",
        "Legacy scope reference; no official standards code asserted.",
      );
    }
    d.prepare(
      "INSERT INTO curriculum_content(skill_id,grade,status,data,course_id,source_id,recommended_grade_min,recommended_grade_max) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(skill_id) DO UPDATE SET grade=excluded.grade,status=excluded.status,data=excluded.data,course_id=excluded.course_id,source_id=excluded.source_id,recommended_grade_min=excluded.recommended_grade_min,recommended_grade_max=excluded.recommended_grade_max",
    ).run(
      c.id,
      c.grade,
      c.status,
      JSON.stringify(c),
      c.courseId ?? null,
      c.sourceId ?? "davinci-legacy-baseline",
      c.recommendedGradeMin ?? c.grade,
      c.recommendedGradeMax ?? c.grade,
    );
  }
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
