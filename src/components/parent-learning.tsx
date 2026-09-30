import Link from "next/link";
import { conceptById } from "@/lib/curriculum";
import {
  parentLevels,
  parentSkillLevel,
  parentSkills,
  parentObservations,
  progressDays,
} from "@/lib/parent-learning";
import type { Child, Learner } from "@/lib/types";
const levelClass = (level: string) => level.toLowerCase().replaceAll(" ", "-");
export function LearningEvidence({
  child,
  learner,
}: {
  child: Child;
  learner: Learner;
}) {
  const skills = parentSkills(child, learner),
    days = progressDays(learner),
    observations = parentObservations(child, learner);
  const counts = parentLevels.map((level) => ({
    level,
    count: skills.filter(
      (c) => parentSkillLevel(learner.states[c.id]) === level,
    ).length,
  }));
  const max = Math.max(
    1,
    ...days.map((d) => d.independent + d.assisted + d.needsPractice),
  );
  const needs = skills
    .filter((c) =>
      learner.states[c.id]?.evidence.slice(-3).some((e) => !e.correct),
    )
    .slice(0, 3);
  return (
    <section className="learning-evidence" aria-label="Learning evidence">
      <div className="parent-evidence-grid">
        <article className="card">
          <h2>What is taking shape?</h2>
          <p className="muted small">
            Current grade skills plus previously practiced skills.
          </p>
          <div
            className="level-distribution"
            role="img"
            aria-label={counts.map((c) => `${c.count} ${c.level}`).join(", ")}
          >
            {counts
              .filter((c) => c.count)
              .map((c) => (
                <span
                  key={c.level}
                  className={levelClass(c.level)}
                  style={{ flexGrow: c.count }}
                />
              ))}
          </div>
          <ul className="level-legend">
            {counts.map((c) => (
              <li key={c.level}>
                <i className={levelClass(c.level)} />
                {c.level}
                <strong>{c.count}</strong>
              </li>
            ))}
          </ul>
          <Link
            className="text-link"
            href={`/app/children/${child.id}/learning`}
          >
            Explore subjects and skills →
          </Link>
        </article>
        <article className="card">
          <h2>Growing independence</h2>
          <p className="muted small">
            Recorded responses on the last seven days with practice. More
            answers without help can signal growing independence.
          </p>
          {days.length ? (
            <div
              className="practice-chart"
              role="img"
              aria-label={days
                .map(
                  (d) =>
                    `${d.day}: ${d.independent} correct without help, ${d.assisted} correct with help, ${d.needsPractice} incorrect`,
                )
                .join("; ")}
            >
              {days.map((d) => (
                <div className="practice-day" key={d.day}>
                  <span className="practice-count">
                    {d.independent + d.assisted + d.needsPractice}
                  </span>
                  <div className="practice-bar">
                    {(
                      ["needsPractice", "assisted", "independent"] as const
                    ).map((kind) => (
                      <span
                        key={kind}
                        className={kind}
                        style={{ height: `${(d[kind] / max) * 100}%` }}
                      />
                    ))}
                  </div>
                  <small>{d.day.slice(5)}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>Practice evidence will appear after the first response.</p>
          )}
          <p className="chart-legend">
            <span>● Without help</span>
            <span>● With help</span>
            <span>● Still practicing</span>
          </p>
          <details>
            <summary>View recorded counts</summary>
            <ul>
              {days.map((d) => (
                <li key={d.day}>
                  {d.day}: {d.independent} without help, {d.assisted} with help,{" "}
                  {d.needsPractice} still practicing.
                </li>
              ))}
            </ul>
          </details>
        </article>
      </div>
      <article className="card spaced">
        <h2>Where a little support may help</h2>
        {needs.length ? (
          <ul>
            {needs.map((c) => (
              <li key={c.id}>
                {c.name} — a recent response needs more practice.
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No recent difficulty is recorded yet. This does not mean every skill
            is secure.
          </p>
        )}
      </article>
      <article className="card spaced">
        <h2>How teaching is adapting</h2>
        <p className="muted small">
          Evidence summaries from saved responses, not AI-generated claims.
        </p>
        {observations.length ? (
          observations.map((o) => (
            <div className="evidence-observation" key={o.id}>
              <p>{o.text}</p>
              <p className="muted small">
                Suggested next step: {o.implication}
              </p>
              <details>
                <summary>Why we say this</summary>
                <ul>
                  {o.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            </div>
          ))
        ) : (
          <p>
            We need a few more responses before describing a teaching pattern.
          </p>
        )}
      </article>
    </section>
  );
}
export function ParentSkillExplorer({
  child,
  learner,
}: {
  child: Child;
  learner: Learner;
}) {
  const skills = parentSkills(child, learner);
  return (
    <div className="skill-explorer">
      {["Math", "English", "Science", "Social Studies"].map((subject) => {
        const selected = skills.filter((c) => c.subject === subject);
        if (!selected.length) return null;
        return (
          <details
            className="card spaced"
            key={subject}
            open={subject === "Math"}
          >
            <summary>
              {subject === "English" ? "English Language Arts" : subject} ·{" "}
              {selected.length} skills
            </summary>
            {[...new Set(selected.map((c) => c.domain))].map((domain) => (
              <details className="skill-domain" key={domain}>
                <summary>{domain}</summary>
                {selected
                  .filter((c) => c.domain === domain)
                  .map((c) => {
                    const state = learner.states[c.id],
                      level = parentSkillLevel(state),
                      recent = state?.evidence.slice(-3) ?? [];
                    return (
                      <details className="parent-skill" key={c.id}>
                        <summary>
                          <span>{c.name}</span>
                          <span className={`status ${levelClass(level)}`}>
                            {level}
                          </span>
                        </summary>
                        <p>{c.description}</p>
                        <dl>
                          <dt>Last practiced</dt>
                          <dd>
                            {state?.lastPracticedAt
                              ? new Date(
                                  state.lastPracticedAt,
                                ).toLocaleDateString("en", {
                                  dateStyle: "medium",
                                })
                              : "Not yet"}
                          </dd>
                          <dt>Recent practice</dt>
                          <dd>
                            {recent.length
                              ? `${recent.filter((e) => e.correct && e.assistance === 0).length} of the last ${recent.length} responses correct without help`
                              : "No response evidence yet"}
                          </dd>
                          <dt>Help needed</dt>
                          <dd>
                            {recent.some((e) => e.assistance > 0)
                              ? "Some recent responses used support"
                              : recent.length
                                ? "No help recorded on recent responses"
                                : "We will check together"}
                          </dd>
                          <dt>Likely next step</dt>
                          <dd>
                            {level === "Strong" || level === "Secure"
                              ? "Try a new context and revisit later"
                              : recent.some((e) => !e.correct)
                                ? "Check the difficult step and its foundations"
                                : "Try a fresh example with less help"}
                          </dd>
                        </dl>
                        {c.prerequisites.length > 0 && (
                          <p className="small muted">
                            Builds on{" "}
                            {c.prerequisites
                              .map((id) => conceptById[id]?.name)
                              .join(", ")}
                            .
                          </p>
                        )}
                      </details>
                    );
                  })}
              </details>
            ))}
          </details>
        );
      })}
    </div>
  );
}
