import Link from "next/link";
import { notFound } from "next/navigation";
import { pageUser } from "@/server/auth";
import {
  eventsFor,
  learnerFor,
  ownedChild,
  sessionsFor,
} from "@/server/repository";
import {
  alternativesFor,
  chooseDecision,
  masteryLabel,
  availableLesson,
  strengthsFor,
  weaknessesFor,
} from "@/lib/learning";
import { conceptById, concepts } from "@/lib/curriculum";
import { strategyNames } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Inspector({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const user = await pageUser(),
    { childId } = await params;
  let child;
  try {
    child = ownedChild(user.id, childId);
  } catch {
    notFound();
  }
  const learner = learnerFor(child.id),
    plan = availableLesson(child, learner),
    target = conceptById[plan?.targetConcept ?? ""],
    state = learner.states[plan?.targetConcept ?? ""],
    decision = plan ? chooseDecision(learner, plan.targetConcept) : null,
    alternatives = plan ? alternativesFor(learner, plan.targetConcept) : [],
    sessions = sessionsFor(child.id),
    events = eventsFor(child.id),
    active = sessions.find((s) => !s.completedAt),
    last = sessions.find((s) => s.completedAt),
    prerequisites = (target?.prerequisites ?? []).map((skillId) => ({
      skillId,
      name: conceptById[skillId]?.name ?? skillId,
      mastery: learner.states[skillId]?.masteryScore ?? 0.25,
      confidence: learner.states[skillId]?.masteryConfidence ?? 0,
    })),
    latencies = events.filter((e) => e.type === "voice_latency").slice(0, 30),
    deltas: {
      at: string;
      conceptId?: unknown;
      before?: unknown;
      after?: unknown;
    }[] = events
      .filter((e) => e.type === "mastery_updated")
      .slice(0, 10)
      .map((e) => ({
        at: e.createdAt,
        ...(e.metadata as Record<string, unknown>),
      }));
  if (!plan || !decision)
    return (
      <main>
        <h1>Curriculum pending</h1>
        <p>
          No lesson is available for this grade and enabled subjects. Existing
          learner records are preserved.
        </p>
      </main>
    );
  return (
    <main className="legal inspector">
      <h1>Da Vinci personalization debugger</h1>
      {active?.teaching && (
        <details>
          <summary>
            Teaching attempts, hints, and answer access evidence
          </summary>
          <pre>
            {JSON.stringify(
              {
                attempts: active.teaching.attempts,
                hints: active.teaching.hintHistory,
                revealed: active.teaching.revealedQuestions,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
      <p>
        Owner-scoped · unavailable in production · {child.nickname}, Grade{" "}
        {child.grade}, age {child.age}
      </p>
      <p>
        <Link href="/dev/curriculum">Inspect grade and subject curriculum</Link>
      </p>
      <section className="card spaced">
        <h2>Target skill</h2>
        <dl>
          <dt>Skill</dt>
          <dd>
            {target?.name} ({plan?.targetConcept ?? ""})
          </dd>
          <dt>Subject / domain</dt>
          <dd>
            {target?.subject} / {target?.domain}
          </dd>
          <dt>Mastery</dt>
          <dd>
            {state
              ? `${state.masteryScore.toFixed(2)} · ${masteryLabel(state)}`
              : "Not started"}{" "}
            · {state?.successfulIndependentAttempts ?? 0} independent,{" "}
            {state?.assistedAttempts ?? 0} assisted,{" "}
            {state?.incorrectAttempts ?? 0} incorrect
          </dd>
          <dt>Plan reason</dt>
          <dd>{plan.reason}</dd>
        </dl>
      </section>
      <section className="card spaced">
        <h2>Knowledge model</h2>
        <h3>Strengths</h3>
        <ul>
          {strengthsFor(learner).map((s) => (
            <li key={s.skillId}>
              {conceptById[s.skillId]?.name ?? s.skillId} · confidence{" "}
              {s.strengthConfidence.toFixed(2)}
            </li>
          ))}
        </ul>
        <h3>Weaknesses</h3>
        <ul>
          {weaknessesFor(learner).map((w) => (
            <li key={w.skillId}>
              {conceptById[w.skillId]?.name ?? w.skillId} · mastery{" "}
              {w.mastery.toFixed(2)}
            </li>
          ))}
        </ul>
        <h3>Relevant prerequisites</h3>
        <ul>
          {prerequisites.map((prerequisite) => (
            <li key={prerequisite.skillId}>
              {prerequisite.name} · mastery {prerequisite.mastery.toFixed(2)} ·
              confidence {prerequisite.confidence.toFixed(2)}
            </li>
          ))}
        </ul>
        <h3>Misconceptions</h3>
        <ul>
          {learner.misconceptions.map((m) => (
            <li key={m.id}>
              {m.id} · confidence {m.confidence.toFixed(2)} ·{" "}
              {m.status ?? (m.confirmed ? "confirmed" : "suspected")} ·{" "}
              {m.checks} checks
            </li>
          ))}
        </ul>
      </section>
      <section className="card spaced">
        <h2>Teaching model</h2>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Subject</th>
              <th>Attempts</th>
              <th>Rate</th>
              <th>Confidence</th>
              <th>Skill evidence</th>
            </tr>
          </thead>
          <tbody>
            {learner.strategies.map((e) => (
              <tr key={`${e.strategyId}-${e.subject ?? ""}-${e.conceptDomain}`}>
                <td>{strategyNames[e.strategyId]}</td>
                <td>
                  {e.subject || "—"} / {e.conceptDomain}
                </td>
                <td>{e.attempts}</td>
                <td>
                  {e.attempts
                    ? (e.successfulOutcomes / e.attempts).toFixed(2)
                    : "—"}
                </td>
                <td>{e.confidence.toFixed(2)}</td>
                <td>
                  {Object.entries(e.skillOutcomes ?? {})
                    .map(
                      ([skill, outcome]) =>
                        `${skill}: ${outcome.successes}/${outcome.attempts}`,
                    )
                    .join(" · ") || "Domain-level only"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card spaced">
        <h2>Teaching decision</h2>
        <dl>
          <dt>Selected strategy</dt>
          <dd>
            {strategyNames[decision.strategy]} ({decision.strategy})
          </dd>
          <dt>Alternatives</dt>
          <dd>
            {alternatives.length
              ? alternatives
                  .map(
                    (a) =>
                      `${strategyNames[a.strategyId]} (${a.score.toFixed(3)}, ${a.attempts} attempts, ${a.basis})`,
                  )
                  .join(" · ")
              : "No strategy evidence yet"}
          </dd>
          <dt>Scaffolding level</dt>
          <dd>{decision.scaffoldingLevel}</dd>
          <dt>Pedagogical move</dt>
          <dd>{decision.pedagogicalMove}</dd>
          <dt>Difficulty</dt>
          <dd>
            {decision.difficulty} · {decision.difficultyBand}
          </dd>
          <dt>Assessment</dt>
          <dd>{decision.nextAssessmentType}</dd>
          <dt>Strength leveraged</dt>
          <dd>{decision.strengthToLeverage ?? "—"}</dd>
          <dt>Prerequisite to probe</dt>
          <dd>{decision.prerequisiteToProbe ?? "—"}</dd>
          <dt>Misconception to test</dt>
          <dd>{decision.misconceptionToTest ?? "—"}</dd>
          <dt>Why this strategy</dt>
          <dd>{decision.reason}</dd>
          <dt>Alternatives considered</dt>
          <dd>
            {decision.alternativesConsidered
              .map(
                (alternative) =>
                  `${strategyNames[alternative.strategyId]}: ${alternative.reason}`,
              )
              .join(" · ")}
          </dd>
          <dt>Assistance used this session</dt>
          <dd>
            {active?.teaching?.assistanceLedger.length
              ? active.teaching.assistanceLedger
                  .map(
                    (entry) =>
                      `${entry.kind} L${entry.level}${entry.independentlyVerified ? " ✓ independent" : ""}`,
                  )
                  .join(" · ")
              : "None recorded"}
          </dd>
          <dt>Child hears</dt>
          <dd>{decision.personalization}</dd>
        </dl>
      </section>
      <section className="card spaced">
        <h2>Recent structured learning memory</h2>
        <ul>
          {learner.recentLearning.slice(0, 12).map((entry) => (
            <li key={entry.id}>
              {entry.createdAt} · {entry.kind} · {entry.skillId}:{" "}
              {entry.summary}
            </li>
          ))}
        </ul>
      </section>
      <section className="card spaced">
        <h2>Outcome</h2>
        <dl>
          <dt>Last session</dt>
          <dd>
            {last
              ? `${last.kind} · ${last.correct}/${last.attempts} correct`
              : "No completed sessions"}
          </dd>
        </dl>
        <h3>Recent mastery changes</h3>
        <ul>
          {deltas.map((d, i) => (
            <li key={i}>
              {d.at as string} · {d.conceptId as string}:{" "}
              {(d.before as number)?.toFixed?.(2)} →{" "}
              {(d.after as number)?.toFixed?.(2)}
            </li>
          ))}
        </ul>
      </section>
      <section className="card spaced">
        <h2>Voice latency</h2>
        {latencies.length ? (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Stage</th>
                <th>Measurements (ms)</th>
              </tr>
            </thead>
            <tbody>
              {latencies.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.createdAt}</td>
                  <td>{String(entry.metadata.type ?? "unknown")}</td>
                  <td>
                    {Object.entries(entry.metadata)
                      .filter(([key]) => key !== "type" && key !== "at")
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No realtime voice measurements recorded yet.</p>
        )}
      </section>
      {Object.entries({
        child,
        plan,
        decision,
        learner,
        sessions: sessions.slice(0, 5),
        recentEvents: events.slice(0, 50),
        skillGraph: concepts.map((c) => ({
          id: c.id,
          subject: c.subject,
          domain: c.domain,
        })),
      }).map(([name, value]) => (
        <details key={name} open={name === "decision"}>
          <summary>{name}</summary>
          <pre>{JSON.stringify(value, null, 2)}</pre>
        </details>
      ))}
    </main>
  );
}
