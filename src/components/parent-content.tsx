import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  Lightbulb,
  MoveUpRight,
  Sparkles,
  Sun,
  TrendingUp,
} from "lucide-react";
import {
  Child,
  Insight,
  Learner,
  LearningSession,
  strategyNames,
} from "@/lib/types";
import { concepts, conceptById } from "@/lib/curriculum";
import { deriveInsight, masteryLabel, planLesson } from "@/lib/learning";
import { ButtonLink, Empty, PageHeading, TextLink } from "./ui";
export function InsightCard({
  insight,
  child,
  full = false,
}: {
  insight: Insight;
  child: Child;
  full?: boolean;
}) {
  return (
    <section className="insight-card">
      <div className="section-kicker">
        <span className="icon-disc light">
          <Lightbulb size={21} />
        </span>
        <span>SOMETHING PRIMER HAS LEARNED</span>
        <span className="tiny-pill">{insight.confidence}</span>
      </div>
      <h2>{insight.title}</h2>
      <p>{insight.observation}</p>
      <div className="adaptation">
        <span className="adaptation-icon">
          <MoveUpRight size={20} />
        </span>
        <div>
          <strong>How Primer is adapting</strong>
          <p>{insight.adaptation}</p>
        </div>
      </div>
      <div className="insight-foot">
        <span>
          {insight.attempts
            ? `Based on ${insight.attempts} practice responses`
            : "Insights grow with every session"}
        </span>
        {!full && (
          <Link href={`/app/children/${child.id}/insights`}>
            Explore this insight
            <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}
export function Dashboard({
  child,
  learner,
  sessions,
  now,
}: {
  child: Child;
  learner: Learner;
  sessions: LearningSession[];
  now: number;
}) {
  const completed = sessions.filter((s) => s.completedAt),
    week = completed.filter(
      (s) => now - Date.parse(s.completedAt!) < 7 * 86400000,
    ),
    plan = planLesson(child, learner),
    secure = Object.values(learner.states).filter(
      (s) => masteryLabel(s) === "Secure",
    ).length;
  const last = completed[0];
  return (
    <>
      <PageHeading
        eyebrow="THE BIG PICTURE"
        title={`${child.nickname}’s learning`}
        description="A little more understanding. A little more confidence."
        action={
          <span className="date-chip">
            <Sun size={16} />
            One small step at a time
          </span>
        }
      />
      <div className="overview-grid">
        <div className="overview-main">
          <section className="welcome-card">
            <div>
              <span className="eyebrow">
                {child.diagnosticComplete
                  ? "GROWING AT THEIR OWN PACE"
                  : "A GOOD PLACE TO BEGIN"}
              </span>
              <h2>
                {child.diagnosticComplete
                  ? "Every little “I get it”\nis a big thing."
                  : `Let’s understand where\n${child.nickname} is today.`}
              </h2>
              <p>
                {child.diagnosticComplete
                  ? `A thoughtful next step is ready for ${child.nickname}. About ten minutes, with room to think.`
                  : "A few gentle questions help us find the right starting point. No grades. No pressure."}
              </p>
              <ButtonLink href={`/learn/${child.id}`}>
                {child.diagnosticComplete
                  ? "Open today’s lesson"
                  : "Start diagnostic"}
                <ArrowRight size={18} />
              </ButtonLink>
            </div>
            <div className="growth-art" aria-hidden="true">
              <div className="art-orbit" />
              <div className="art-stem" />
              <i className="art-leaf leaf-a" />
              <i className="art-leaf leaf-b" />
              <i className="art-leaf leaf-c" />
              <div className="art-pot" />
              <span className="art-spark">✦</span>
            </div>
          </section>
          <div className="stats-row">
            <div>
              <span className="stat-icon">
                <BookOpen size={19} />
              </span>
              <div>
                <strong>
                  {week.length}
                  <small> sessions</small>
                </strong>
                <p>Completed this week</p>
              </div>
            </div>
            <div>
              <span className="stat-icon peach">
                <TrendingUp size={19} />
              </span>
              <div>
                <strong>
                  {secure}
                  <small> concepts</small>
                </strong>
                <p>Looking secure so far</p>
              </div>
            </div>
            <div>
              <span className="stat-icon lavender">
                <Clock size={19} />
              </span>
              <div>
                <strong>
                  ~10<small> min</small>
                </strong>
                <p>A little time to learn</p>
              </div>
            </div>
          </div>
          <InsightCard insight={deriveInsight(child, learner)} child={child} />
        </div>
        <aside className="overview-side">
          <section className="card next-card">
            <span className="section-kicker">
              <span className="tiny-dot" /> UP NEXT FOR{" "}
              {child.nickname.toUpperCase()}
            </span>
            <div className="mini-fractions" aria-hidden="true">
              <div>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div>
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
            <h3>
              {child.diagnosticComplete
                ? conceptById[plan.targetConcept].name
                : "A little getting-to-know-you"}
            </h3>
            <p className="muted">
              {child.diagnosticComplete
                ? plan.reason
                : "We’ll find a comfortable place to start, one question at a time."}
            </p>
            <div className="lesson-meta">
              <Clock size={15} />
              {child.diagnosticComplete
                ? "About 10 minutes"
                : "About 8–12 minutes"}
              <span>•</span>Math
            </div>
            <Link className="next-link" href={`/learn/${child.id}`}>
              Ready when they are
              <ArrowRight size={18} />
            </Link>
          </section>
          <section className="card parent-note">
            <span className="icon-disc peach">
              <Check size={20} />
            </span>
            <h3>You’re doing enough.</h3>
            <p className="muted">
              No lesson planning needed. Just a quiet spot, a little time, and
              space for {child.nickname} to figure things out.
            </p>
            <span className="small">We’ll take it from there.</span>
          </section>
        </aside>
      </div>
      <div className="bottom-grid">
        <section className="card">
          <div className="section-title">
            <h3>What’s taking shape</h3>
            <TextLink href={`/app/children/${child.id}/learning`}>
              Learning journey
            </TextLink>
          </div>
          <DomainRows learner={learner} />
          <p className="card-footnote">
            Primer’s current estimate. Understanding takes time.
          </p>
        </section>
        <section className="card">
          <div className="section-title">
            <h3>The last little step</h3>
            <TextLink href={`/app/children/${child.id}/sessions`}>
              All sessions
            </TextLink>
          </div>
          {last ? (
            <>
              <span className="small muted">
                {new Date(last.completedAt!).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                ·{" "}
                {last.kind === "diagnostic"
                  ? "Getting to know you"
                  : "Math session"}
              </span>
              <h3 className="last-title">{last.summary?.workedOn}</h3>
              <p className="muted">{last.summary?.improved}</p>
              <Link
                className="text-link"
                href={`/app/children/${child.id}/sessions/${last.id}`}
              >
                See what happened
                <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <Empty title="Their story starts here.">
              After a first session, you’ll see what clicked and what comes
              next.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
export function DomainRows({ learner }: { learner: Learner }) {
  return (
    <div className="domain-rows">
      {(["Fractions", "Multiplication", "Division"] as const).map(
        (domain, i) => {
          const states = concepts
            .filter((c) => c.domain === domain)
            .map((c) => learner.states[c.id])
            .filter(Boolean);
          const avg = states.length
            ? states.reduce((sum, s) => sum + s.masteryScore, 0) / states.length
            : 0;
          const label = !states.length
            ? "Not started"
            : states.every((s) => masteryLabel(s) === "Secure")
              ? "Secure"
              : avg >= 0.4
                ? "Developing"
                : "Emerging";
          return (
            <div className="domain-row" key={domain}>
              <span className={`domain-icon domain-${i}`}>
                {i === 0 ? "½" : i === 1 ? "×" : "÷"}
              </span>
              <div>
                <strong>{domain}</strong>
                <div className="mastery-track">
                  <span style={{ width: `${avg * 100}%` }} />
                </div>
              </div>
              <span
                className={`status ${label.toLowerCase().replace(" ", "-")}`}
              >
                {label}
              </span>
            </div>
          );
        },
      )}
    </div>
  );
}
export function LearningJourney({
  child,
  learner,
}: {
  child: Child;
  learner: Learner;
}) {
  return (
    <>
      <PageHeading
        eyebrow="UNDERSTANDING, ONE IDEA AT A TIME"
        title={`${child.nickname}’s learning journey`}
        description="A map of what’s taking shape, and the foundations underneath."
      />
      <p className="notice">
        <Sparkles size={18} />
        These are Primer’s current estimates, based on practice. They are not
        grades or a formal assessment.
      </p>
      {(["Multiplication", "Division", "Fractions"] as const).map((domain) => (
        <section className="card journey-section" key={domain}>
          <div className="section-title">
            <h2>{domain}</h2>
            <span className="small muted">
              {concepts.filter((c) => c.domain === domain).length} connected
              ideas
            </span>
          </div>
          <div className="concept-list">
            {concepts
              .filter((c) => c.domain === domain)
              .map((c) => {
                const state = learner.states[c.id],
                  label = masteryLabel(state);
                return (
                  <div className="concept-row" key={c.id}>
                    <span
                      className={`concept-dot ${label === "Secure" ? "secure" : ""}`}
                    >
                      {label === "Secure" ? <Check size={15} /> : <span />}
                    </span>
                    <div>
                      <h3>{c.name}</h3>
                      <p>
                        {c.prerequisites.length
                          ? `Builds on ${c.prerequisites.map((p) => conceptById[p].name.toLowerCase()).join(" and ")}`
                          : "A starting foundation"}
                        {state?.nextReviewAt &&
                          ` · Review ${new Date(state.nextReviewAt).toLocaleDateString("en", { month: "short", day: "numeric" })}`}
                      </p>
                    </div>
                    <span className={`status ${label.toLowerCase()}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}
export function Insights({
  child,
  learner,
}: {
  child: Child;
  learner: Learner;
}) {
  return (
    <>
      <PageHeading
        eyebrow="A TUTOR THAT LEARNS, TOO"
        title={`Learning how to teach ${child.nickname}.`}
        description="No fixed labels. Just careful observations, and better next steps."
      />
      <InsightCard child={child} insight={deriveInsight(child, learner)} full />
      <section className="card spaced">
        <div className="section-title">
          <h2>What seems to help</h2>
          <Lightbulb size={20} />
        </div>
        {learner.strategies.length ? (
          <div className="strategy-list">
            {learner.strategies.map((e) => (
              <div key={`${e.strategyId}-${e.conceptDomain}`}>
                <span className="icon-disc">
                  <BookOpen size={20} />
                </span>
                <div>
                  <h3>{strategyNames[e.strategyId]}</h3>
                  <p>
                    {e.attempts < 3
                      ? "Still gathering evidence."
                      : e.successfulOutcomes / e.attempts >= 0.65
                        ? `Recently effective in ${e.conceptDomain.toLowerCase()}.`
                        : "Mixed results so far. We’ll try other approaches too."}
                  </p>
                  <small>
                    {e.successfulOutcomes} successful outcomes across{" "}
                    {e.attempts} responses ·{" "}
                    {e.confidence < 0.5 ? "Early evidence" : "Growing evidence"}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Still learning.">
            After a few sessions, you’ll start seeing which teaching approaches
            seem to help.
          </Empty>
        )}
      </section>
      {learner.misconceptions.some((m) => m.confidence > 0.3) && (
        <section className="card spaced">
          <h3>Ideas we’re gently checking</h3>
          <p className="muted">
            A mistake can happen for many reasons. Primer uses fresh examples
            before drawing conclusions.
          </p>
          {learner.misconceptions
            .filter((m) => m.confidence > 0.3)
            .map((m) => (
              <p key={m.id}>
                <span className="status emerging">
                  {m.confirmed ? "Repeated pattern" : "Possible pattern"}
                </span>{" "}
                {m.id.replaceAll("_", " ")} · {m.checks} checks
              </p>
            ))}
        </section>
      )}
    </>
  );
}
export function SessionHistory({
  child,
  sessions,
  detail,
}: {
  child: Child;
  sessions: LearningSession[];
  detail?: string;
}) {
  const completed = sessions.filter((s) => s.completedAt),
    s = detail ? completed.find((s) => s.id === detail) : undefined;
  return (
    <>
      <PageHeading
        eyebrow="SMALL STEPS, REMEMBERED"
        title={
          s
            ? "A little closer to understanding."
            : `${child.nickname}’s sessions`
        }
        description={
          s
            ? new Date(s.completedAt!).toLocaleDateString("en", {
                dateStyle: "long",
              })
            : "What clicked, what needs time, and what comes next."
        }
      />
      {s?.summary ? (
        <section className="card summary-card">
          {Object.entries({
            "Today’s focus": s.summary.workedOn,
            "What improved": s.summary.improved,
            "Still developing": s.summary.developing,
            "Primer noticed": s.summary.noticed,
            "What happens next": s.summary.next,
            "For you": s.summary.parentAction,
          }).map(([title, text]) => (
            <div key={title}>
              <span className="eyebrow">{title}</span>
              <p>{text}</p>
            </div>
          ))}
          <TextLink href={`/app/children/${child.id}/sessions`}>
            Back to all sessions
          </TextLink>
        </section>
      ) : (
        <section className="card">
          {completed.length ? (
            completed.map((s) => (
              <Link
                className="session-row"
                key={s.id}
                href={`/app/children/${child.id}/sessions/${s.id}`}
              >
                <span className="icon-disc">
                  <BookOpen size={21} />
                </span>
                <div>
                  <h3>
                    {s.summary?.workedOn ??
                      conceptById[s.plan.targetConcept].name}
                  </h3>
                  <p>
                    {new Date(s.completedAt!).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    ·{" "}
                    {s.kind === "diagnostic"
                      ? "Initial check-in"
                      : "Personalized lesson"}
                  </p>
                </div>
                <span className="status secure">Complete</span>
                <ArrowUpRight size={19} />
              </Link>
            ))
          ) : (
            <Empty title="Primer hasn’t learned much here yet.">
              After a few sessions, you’ll see what {child.nickname} knows and
              which approaches seem to help.
            </Empty>
          )}
        </section>
      )}
    </>
  );
}
