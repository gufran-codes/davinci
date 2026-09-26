import {
  curriculumCoverage,
  questionQuality,
} from "../src/lib/curriculum-catalog";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { skillContentSchema } from "../content/curriculum/schema";
import { conceptById, concepts, getQuestion } from "../src/lib/curriculum";
const file = path.join(process.cwd(), "content/curriculum/grades-1-5.json");
const records = skillContentSchema
  .array()
  .parse(JSON.parse(readFileSync(file, "utf8")));
const [command = "validate", id, reviewer] = process.argv.slice(2);
if (command === "coverage") {
  console.table(curriculumCoverage());
} else if (command === "validate") {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const c of records) {
    if (ids.has(c.id)) errors.push(`Duplicate skill ${c.id}`);
    ids.add(c.id);
    if (c.status !== "draft" && !c.reviewer)
      errors.push(`${c.id} has no reviewer`);
    if (
      !["diagnostic", "practice", "mastery"].every((role) =>
        c.questions.some((q) => q.role === role),
      )
    )
      errors.push(`${c.id} missing assessment phase`);
    for (const p of c.prerequisites) {
      if (!conceptById[p]) errors.push(`${c.id}: unknown prerequisite ${p}`);
      else if (conceptById[p].subject !== c.subject)
        errors.push(`${c.id}: cross-subject prerequisite ${p}`);
      else if (conceptById[p].gradeBand[0] > c.grade)
        errors.push(`${c.id}: prerequisite from higher grade`);
    }
  }
  function walk(id: string, seen: Set<string>) {
    if (seen.has(id)) {
      errors.push(`Cycle at ${id}`);
      return;
    }
    for (const p of conceptById[id]?.prerequisites ?? [])
      walk(p, new Set([...seen, id]));
  }
  for (const c of concepts) walk(c.id, new Set());
  const report = [];
  for (let grade = 1; grade <= 5; grade++)
    for (const subject of ["Math", "English", "Science", "Social Studies"]) {
      const r = records.filter(
        (c) => c.grade === grade && c.subject === subject,
      );
      if (r.length < 8) errors.push(`Coverage gap: grade ${grade} ${subject}`);
      report.push({
        grade,
        subject,
        skills: r.length,
        domains: [...new Set(r.map((c) => c.domain))].join(", "),
      });
    }
  console.table(report);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    `${concepts.length} total skills; ${records.length} new draft-capable records. No invalid links or cycles. Scope coverage is not proof of factual quality or complete standards alignment.`,
  );
} else if (command === "review" || command === "approve") {
  if (!id || !reviewer)
    throw new Error(
      "Usage: npm run curriculum -- review|approve SKILL_ID REVIEWER",
    );
  const record = records.find((c) => c.id === id);
  if (!record) throw Error("Unknown skill");
  if (command === "approve" && record.status !== "reviewed")
    throw Error("A skill must be reviewed before approval.");
  const issues = [0, 1, 2].flatMap((seed) =>
    questionQuality(getQuestion(record.id, seed)).map(
      (issue) => `item ${seed}: ${issue}`,
    ),
  );
  if (issues.length)
    throw Error(`Cannot mark content ${command}: ${issues.join("; ")}`);
  record.status = command === "review" ? "reviewed" : "approved";
  record.reviewer = reviewer;
  writeFileSync(file, JSON.stringify(records, null, 2) + "\n");
} else if (command === "draft") {
  const grade = Number(id),
    subject = reviewer,
    topic = process.argv.slice(5).join(" ");
  if (!grade || grade < 1 || grade > 5 || !subject || !topic)
    throw Error("Usage: npm run curriculum -- draft 4 Science Energy");
  const draft = {
    grade,
    subject,
    topic,
    status: "draft",
    reviewer: null,
    objective: "Author and review a measurable objective.",
    prerequisites: [],
    misconceptions: [],
    teachingApproaches: ["prediction", "observation", "guided reasoning"],
    diagnosticProbes: [],
    practice: [],
    masteryChecks: [],
    rubric: [],
  };
  mkdirSync("content/drafts", { recursive: true });
  const name = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  writeFileSync(
    `content/drafts/g${grade}-${name}.json`,
    JSON.stringify(draft, null, 2) + "\n",
  );
  console.log(
    "Draft created outside the published catalog; add complete question/rubric evidence before review.",
  );
} else throw Error("Unknown curriculum command");
