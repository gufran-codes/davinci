import { concepts, getQuestion, gradeQuestion } from "../src/lib/curriculum";
import { contentById } from "../src/lib/teaching/content";
const rows = new Map<
  string,
  {
    subject: string;
    skills: number;
    items: number;
    missing: number;
    invalid: number;
    writingScaffolds: number;
  }
>();
for (const c of concepts) {
  const row = rows.get(c.subject) ?? {
    subject: c.subject,
    skills: 0,
    items: 0,
    missing: 0,
    invalid: 0,
    writingScaffolds: 0,
  };
  row.skills++;
  for (
    let seed = 0;
    seed < (contentById[c.id]?.questions.length ?? 3);
    seed++
  ) {
    const q = getQuestion(c.id, seed);
    row.items++;
    if (!q.choices?.length) row.missing++;
    if (q.choices?.some((v) => !q.choiceLabels?.[v])) row.invalid++;
    if (q.choiceMode === "writing_support") row.writingScaffolds++;
    else if (q.choices?.filter((v) => gradeQuestion(q, v)).length !== 1)
      row.invalid++;
  }
  rows.set(c.subject, row);
}
console.table([...rows.values()]);
if ([...rows.values()].some((row) => row.missing || row.invalid))
  process.exitCode = 1;
console.log(
  "Coverage checks do not replace educator review of distractors. Legacy generators use three representative seeds here; choice-coverage.test.ts checks additional seeds and transfer variants.",
);
