import Link from "next/link";
import { conceptById } from "@/lib/curriculum";
import {
  parentSkillLevel,
  parentSkills,
  parentObservations,
  progressDays,
} from "@/lib/parent-learning";
import type { Child, Learner } from "@/lib/types";
import styles from "./parent-progress.module.css";
import { ArrowUpRight, ArrowRight } from "lucide-react";
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
  const practiced = skills.filter(
    (skill) => learner.states[skill.id]?.evidence.length,
  );
  const secure = practiced.filter((skill) =>
    ["Secure", "Strong"].includes(parentSkillLevel(learner.states[skill.id])),
  );
  const totals = days.reduce(
    (acc, day) => ({
      independent: acc.independent + day.independent,
      assisted: acc.assisted + day.assisted,
      needsPractice: acc.needsPractice + day.needsPractice,
    }),
    { independent: 0, assisted: 0, needsPractice: 0 },
  );
  const max = Math.max(
    1,
    ...days.map((d) => d.independent + d.assisted + d.needsPractice),
  );
  const needs = practiced
    .filter((skill) =>
      learner.states[skill.id].evidence.slice(-3).some((e) => !e.correct),
    )
    .slice(0, 3);
  const lead = observations[0];
  const subjects = [...new Set(skills.map((skill) => skill.subject))];
  return (
    <section className={styles.evidence} aria-label="Learning evidence">
      <div className={styles.leadGrid}>
        <article className={styles.teachingNote}>
          <span className={styles.eyebrow}>A NOTE FROM YOUR TUTOR</span>
          <h2>
            {lead
              ? lead.id.startsWith("fade:")
                ? "More thinking on their own."
                : "A way of teaching that’s working."
              : `Getting to know how ${child.nickname} learns.`}
          </h2>
          <p className={styles.leadText}>
            {lead?.text ??
              "The first few lessons help us see which ideas feel familiar, where support helps, and what to try next."}
          </p>
          {lead && (
            <div className={styles.nextThought}>
              <span>What this means for the next lesson</span>
              <p>{lead.implication}</p>
            </div>
          )}
          {lead && (
            <details className={styles.source}>
              <summary>See the learning evidence</summary>
              <ul>
                {lead.evidence.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </article>
        <aside className={styles.snapshot}>
          <span className={styles.eyebrow}>THE LEARNING PICTURE</span>
          <div className={styles.bigNumber}>
            {secure.length}
            <span>skills secure or strong</span>
          </div>
          <p>
            Of {practiced.length} skills practiced so far. We look for repeated
            success without help.
          </p>
          <div className={styles.snapshotRule} />
          <dl>
            <div>
              <dt>Still developing</dt>
              <dd>{practiced.length - secure.length}</dd>
            </div>
            <div>
              <dt>Not yet explored</dt>
              <dd>{skills.length - practiced.length}</dd>
            </div>
          </dl>
          <Link href={`/app/children/${child.id}/learning`}>
            Explore subjects and skills <ArrowUpRight size={17} />
          </Link>
        </aside>
      </div>
      <section
        className={styles.subjects}
        aria-labelledby="subject-progress-title"
      >
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>01 / SUBJECTS</span>
            <h2 id="subject-progress-title">
              Understanding, subject by subject
            </h2>
          </div>
          <p>Grade {child.grade} skills and earlier foundations practiced.</p>
        </div>
        <div className={styles.subjectTable}>
          {subjects.map((subject, index) => {
            const selected = skills.filter((c) => c.subject === subject);
            const touched = selected.filter(
              (c) => learner.states[c.id]?.evidence.length,
            );
            const mastered = touched.filter((c) =>
              ["Secure", "Strong"].includes(
                parentSkillLevel(learner.states[c.id]),
              ),
            );
            const latest = [...touched].sort((a, b) =>
              (learner.states[b.id].lastPracticedAt ?? "").localeCompare(
                learner.states[a.id].lastPracticedAt ?? "",
              ),
            )[0];
            return (
              <Link
                className={styles.subjectRow}
                key={subject}
                href={`/app/children/${child.id}/learning#${subject.toLowerCase().replaceAll(" ", "-")}`}
              >
                <span className={styles.subjectNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className={styles.subjectName}>
                  <h3>
                    {subject === "English" ? "English Language Arts" : subject}
                  </h3>
                  <p>
                    {latest
                      ? `Last practiced: ${latest.name}`
                      : "Ready for a first lesson"}
                  </p>
                </div>
                <div className={styles.subjectProgress}>
                  <span>
                    {mastered.length} secure{" "}
                    <span>· {touched.length} practiced</span>
                  </span>
                  <div className={styles.subjectTrack}>
                    <i
                      style={{
                        width: `${selected.length ? (touched.length / selected.length) * 100 : 0}%`,
                      }}
                    />
                    <b
                      style={{
                        width: `${selected.length ? (mastered.length / selected.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <small>{selected.length} skills in this learning map</small>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            );
          })}
        </div>
      </section>
      <div className={styles.detailGrid}>
        <section className={styles.independence}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>02 / PRACTICE</span>
              <h2>Growing independence</h2>
            </div>
          </div>
          <p className={styles.sectionIntro}>
            How much help was needed in the last seven days with recorded
            practice.
          </p>
          {days.length ? (
            <>
              <div
                className={styles.chart}
                role="img"
                aria-label={days
                  .map(
                    (d) =>
                      `${d.day}: ${d.independent} correct without help, ${d.assisted} correct with help, ${d.needsPractice} incorrect`,
                  )
                  .join("; ")}
              >
                {days.map((d) => (
                  <div className={styles.chartDay} key={d.day}>
                    <span>{d.independent + d.assisted + d.needsPractice}</span>
                    <div className={styles.chartColumn}>
                      {(
                        ["needsPractice", "assisted", "independent"] as const
                      ).map((kind) => (
                        <i
                          key={kind}
                          className={styles[kind]}
                          style={{ height: `${(d[kind] / max) * 100}%` }}
                        />
                      ))}
                    </div>
                    <small>
                      {new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </small>
                  </div>
                ))}
              </div>
              <div className={styles.legend}>
                <span>
                  <i className={styles.independent} />
                  Without help <b>{totals.independent}</b>
                </span>
                <span>
                  <i className={styles.assisted} />
                  With help <b>{totals.assisted}</b>
                </span>
                <span>
                  <i className={styles.needsPractice} />
                  Still practicing <b>{totals.needsPractice}</b>
                </span>
              </div>
              <details className={styles.source}>
                <summary>View recorded counts</summary>
                <ul>
                  {days.map((d) => (
                    <li key={d.day}>
                      {d.day}: {d.independent} without help, {d.assisted} with
                      help, {d.needsPractice} still practicing.
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <div className={styles.emptyChart}>
              <span>No practice recorded yet</span>
              <p>The first lesson will start this picture.</p>
            </div>
          )}
        </section>
        <section className={styles.practiceNext}>
          <span className={styles.eyebrow}>03 / LOOKING AHEAD</span>
          <h2>Worth another look</h2>
          <p className={styles.sectionIntro}>
            Small areas to revisit, based on recent responses.
          </p>
          {needs.length ? (
            <ul>
              {needs.map((c) => (
                <li key={c.id}>
                  <span>{c.subject}</span>
                  <h3>{c.name}</h3>
                  <p>A recent response suggests more practice would help.</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.quiet}>
              No recent difficulty recorded. Future lessons will keep checking
              understanding.
            </p>
          )}
          <Link href={`/learn/${child.id}`}>
            Open learning space <ArrowRight size={17} />
          </Link>
        </section>
      </div>
      {observations.length > 1 && (
        <section className={styles.moreNotes}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>TEACHING NOTES</span>
              <h2>How teaching is adapting</h2>
            </div>
          </div>
          {observations.slice(1).map((o) => (
            <article key={o.id}>
              <p>{o.text}</p>
              <span>{o.implication}</span>
              <details className={styles.source}>
                <summary>Why we say this</summary>
                <ul>
                  {o.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </section>
      )}
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
            id={subject.toLowerCase().replaceAll(" ", "-")}
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
