import { notFound } from "next/navigation";
import { pageUser } from "@/server/auth";
import {
  curriculumCoverage,
  gradeSkills,
  questionQuality,
  structuredSkill,
} from "@/lib/curriculum-catalog";
import { getQuestion } from "@/lib/curriculum";
import { contentById } from "@/lib/teaching/content";
export const dynamic = "force-dynamic";
export default async function CurriculumInspector() {
  if (process.env.NODE_ENV !== "development") notFound();
  await pageUser();
  return (
    <main className="legal inspector">
      <h1>Da Vinci curriculum inspector</h1>
      <p>
        Coverage uses the current expected skill map, not a claim of complete
        standards coverage. Authored content and draft content require educator
        review; only explicitly approved records count as approved.
      </p>
      {curriculumCoverage().map((row) => (
        <details key={`${row.grade}-${row.subject}`} className="card spaced">
          <summary>
            Grade {row.grade} · {row.subject} · {row.approved}/{row.expected}{" "}
            approved ({row.approvedPercent}%) · {row.flaggedQuestions} questions
            flagged
          </summary>
          {gradeSkills(row.grade, row.subject).map((c) => (
            <details key={c.id} className="spaced">
              <summary>
                {c.domain} → {c.topic} → {c.name}
              </summary>
              <p>{c.description}</p>
              <details>
                <summary>Structured instructional content</summary>
                <pre>{JSON.stringify(structuredSkill(c.id), null, 2)}</pre>
              </details>
              <p>
                Prerequisites: {c.prerequisites.join(", ") || "None"} · Status:{" "}
                {contentById[c.id]?.status ?? "authored, awaiting review"}
              </p>
              <p>Misconceptions: {c.misconceptionIds.join(", ")}</p>
              <p>Strategies: {c.teachingStrategyIds.join(", ")}</p>
              {contentById[c.id]?.standards.map((s, i) => (
                <p key={i}>
                  <a href={s.source}>
                    {s.framework}: {s.reference}
                  </a>{" "}
                  · {s.alignment}
                </p>
              ))}
              {[0, 1, 2].map((seed) => {
                const q = getQuestion(c.id, seed);
                return (
                  <div key={seed}>
                    <h3>
                      {q.purpose}: {q.prompt}
                    </h3>
                    <p>
                      Answer: {q.answer} · {q.explanation}
                    </p>
                    <p>
                      Quality:{" "}
                      {questionQuality(q).join("; ") ||
                        "Structural checks passed; human academic review still required"}
                    </p>
                  </div>
                );
              })}
            </details>
          ))}
        </details>
      ))}
    </main>
  );
}
