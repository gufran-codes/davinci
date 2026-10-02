import report from "./parent-progress.module.css";
import { LearningEvidence, ParentSkillExplorer } from "./parent-learning";
import { ChildPreferences } from "./child-preferences";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  Lightbulb,
  MoveUpRight,
  Sparkles,
} from "lucide-react";
import {
  Child,
  Insight,
  Learner,
  LearningSession,
  Subject,
  strategyNames,
} from "@/lib/types";
import { concepts, conceptById } from "@/lib/curriculum";
import {
  deriveInsight,
  masteryLabel,
  availableLesson,
  strengthsFor,
  weaknessesFor,
} from "@/lib/learning";
const subjectIcons: Record<Subject, typeof Calculator> = {
  Math: Calculator,
  English: BookOpen,
  Science: FlaskConical,
  "Social Studies": Globe,
};
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
        <span>SOMETHING DA VINCI HAS LEARNED</span>
        <span className="tiny-pill">{insight.confidence}</span>
      </div>
      <h2>{insight.title}</h2>
      <p>{insight.observation}</p>
      <div className="adaptation">
        <span className="adaptation-icon">
          <MoveUpRight size={20} />
        </span>
        <div>
          <strong>How Da Vinci is adapting</strong>
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
}: {
  child: Child;
  learner: Learner;
  sessions: LearningSession[];
  now: number;
}) {
  const plan = availableLesson(child, learner);
  const active = sessions.find((s) => !s.completedAt);
  const last = sessions.find((s) => s.completedAt);
  return (
    <div className={report.report}>
      <header className={report.reportHeader}>
        <div>
          <span className={report.eyebrow}>YOUR CHILD’S LEARNING</span>
          <h1>{child.nickname}’s learning</h1>
          <p>
            Grade {child.grade} <span>·</span> A closer look at what’s becoming
            clear.
          </p>
        </div>
        <Link
          className={report.profileLink}
          href={`/app/children/${child.id}/learning`}
        >
          <span>{child.nickname.slice(0, 1)}</span>Learning map{" "}
          <ArrowUpRight size={16} />
        </Link>
      </header>
      <LearningEvidence child={child} learner={learner} />
      <section className={report.lessonStrip}>
        <div>
          <span className={report.eyebrow}>
            {active ? "CONTINUE THE CONVERSATION" : "THE NEXT LESSON"}
          </span>
          <h2>
            {active
              ? conceptById[active.plan.targetConcept]?.name
              : plan
                ? conceptById[plan.targetConcept].name
                : `Grade ${child.grade} lessons are coming`}
          </h2>
          <p>
            {active
              ? "Pick up from their saved place."
              : plan
                ? plan.reason
                : "Their progress is saved while we prepare more lessons."}
          </p>
        </div>
        <ButtonLink href={`/learn/${child.id}`}>
          Open student space <ArrowRight size={17} />
        </ButtonLink>
      </section>
      {last && (
        <section className={report.lastLesson}>
          <span className={report.eyebrow}>LAST LESSON</span>
          <div>
            <h2>{last.summary?.workedOn ?? "A saved learning session"}</h2>
            <p>{last.summary?.improved}</p>
          </div>
          <TextLink href={`/app/children/${child.id}/sessions/${last.id}`}>
            Read the lesson summary
          </TextLink>
        </section>
      )}
      <details className={report.settings}>
        <summary>Grade {child.grade} · Manage grade and subjects</summary>
        <ChildPreferences key={child.id} child={child} />
      </details>
    </div>
  );
}

export function DomainRows({ learner }: { learner: Learner }) {
  const subjects: Subject[] = ["Math", "English", "Science", "Social Studies"];
  return (
    <div className="domain-rows">
      {subjects.map((subject, i) => {
        const Icon = subjectIcons[subject];
        const states = concepts
          .filter((c) => c.subject === subject)
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
          <div className="domain-row" key={subject}>
            <span className={`domain-icon domain-${i}`}>
              <Icon size={19} />
            </span>
            <div>
              <strong>{subject}</strong>
              <div className="mastery-track">
                <span style={{ width: `${avg * 100}%` }} />
              </div>
            </div>
            <span className={`status ${label.toLowerCase().replace(" ", "-")}`}>
              {label}
            </span>
          </div>
        );
      })}
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
        These are Da Vinci’s current estimates, based on practice. They are not
        grades or a formal assessment.
      </p>
      <ParentSkillExplorer child={child} learner={learner} />
    </>
  );
}
export function KnowledgeSnapshot({
  child,
  learner,
}: {
  child: Child;
  learner: Learner;
}) {
  const strengths = strengthsFor(learner).slice(0, 3),
    developing = Object.values(learner.states)
      .filter((s) => masteryLabel(s) === "Developing")
      .sort((a, b) => b.masteryScore - a.masteryScore)
      .slice(0, 3),
    needs = weaknessesFor(learner).slice(0, 3);
  if (!strengths.length && !developing.length && !needs.length) return null;
  return (
    <section className="card spaced">
      <div className="section-title">
        <h2>What {child.nickname} knows</h2>
        <Sparkles size={20} />
      </div>
      {strengths.length > 0 && (
        <div className="knowledge-group">
          <h3>Strengths Da Vinci can build on</h3>
          {strengths.map((s) => (
            <p key={s.skillId}>
              <span className="status secure">
                {conceptById[s.skillId]?.name ?? s.skillId}
              </span>{" "}
              {conceptById[s.skillId]?.subject ?? ""}
            </p>
          ))}
        </div>
      )}
      {developing.length > 0 && (
        <div className="knowledge-group">
          <h3>Developing right now</h3>
          {developing.map((s) => (
            <p key={s.conceptId}>
              <span className="status developing">
                {conceptById[s.conceptId]?.name ?? s.conceptId}
              </span>{" "}
              {conceptById[s.conceptId]?.subject ?? ""}
            </p>
          ))}
        </div>
      )}
      {needs.length > 0 && (
        <div className="knowledge-group">
          <h3>Needs a little more support</h3>
          {needs.map((w) => (
            <p key={w.skillId}>
              <span className="status emerging">
                {conceptById[w.skillId]?.name ?? w.skillId}
              </span>{" "}
              {conceptById[w.skillId]?.subject ?? ""}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
export function Insights({
  child,
  learner,
}: {
  child: Child;
  learner: Learner;
}) {
  const insight = deriveInsight(child, learner);
  const strengths = strengthsFor(learner).slice(0, 4);
  const strategies = [...learner.strategies].sort((a, b) =>
    b.lastUsedAt.localeCompare(a.lastUsedAt),
  );
  const patterns = learner.misconceptions.filter(
    (m) => m.confidence > 0.3 && !m.resolvedAt,
  );
  return (
    <div className={report.report}>
      <header className={report.reportHeader}>
        <div>
          <span className={report.eyebrow}>HOW DA VINCI ADAPTS</span>
          <h1>Learning to teach {child.nickname}.</h1>
          <p>
            What we’ve noticed, the evidence behind it, and what we’ll try next.
          </p>
        </div>
      </header>
      <div className={report.leadGrid}>
        <article className={report.teachingNote}>
          <span className={report.eyebrow}>
            {insight.confidence} · CURRENT OBSERVATION
          </span>
          <h2>{insight.title}</h2>
          <p className={report.leadText}>{insight.observation}</p>
          <div className={report.nextThought}>
            <span>How the next lesson changes</span>
            <p>{insight.adaptation}</p>
          </div>
          <p className={report.source}>
            {insight.attempts
              ? `Based on ${insight.attempts} practice responses.`
              : "More practice will help us form a useful observation."}
          </p>
        </article>
        <aside className={report.snapshot}>
          <span className={report.eyebrow}>STRENGTHS TO BUILD ON</span>
          {strengths.length ? (
            strengths.map((strength) => (
              <div className={report.strength} key={strength.skillId}>
                <small>{conceptById[strength.skillId]?.subject}</small>
                <h3>
                  {conceptById[strength.skillId]?.name ?? strength.skillId}
                </h3>
              </div>
            ))
          ) : (
            <p>
              Independent practice will show which foundations we can build on.
            </p>
          )}
          <Link href={`/app/children/${child.id}/learning`}>
            See the learning map <ArrowUpRight size={16} />
          </Link>
        </aside>
      </div>
      <section className={report.subjects}>
        <div className={report.sectionHeader}>
          <div>
            <span className={report.eyebrow}>01 / TEACHING APPROACHES</span>
            <h2>What seems to help</h2>
          </div>
          <p>Recent outcomes, specific to the subject and skill.</p>
        </div>
        <div className={report.approaches}>
          {strategies.length ? (
            strategies.map((e) => (
              <article
                key={`${e.strategyId}-${e.subject ?? ""}-${e.conceptDomain}`}
              >
                <div>
                  <span className={report.eyebrow}>
                    {e.subject ? `${e.subject} · ` : ""}
                    {e.conceptDomain}
                  </span>
                  <h3>{strategyNames[e.strategyId]}</h3>
                  <p>
                    {e.attempts < 3
                      ? "Still gathering evidence."
                      : e.successfulOutcomes / e.attempts >= 0.65
                        ? "Recent responses suggest this is worth trying again."
                        : "Results are mixed. Other approaches are worth exploring."}
                  </p>
                  <details className={report.source}>
                    <summary>Why we think this</summary>
                    <p>
                      {e.successfulOutcomes} successful outcomes across{" "}
                      {e.attempts} responses.{" "}
                      {e.confidence < 0.5
                        ? "Early evidence"
                        : "Growing evidence"}
                      ; success with help still needs an independent check.
                    </p>
                  </details>
                </div>
                <div className={report.outcomeCount}>
                  <strong>
                    {e.successfulOutcomes}
                    <span> / {e.attempts}</span>
                  </strong>
                  <small>successful responses</small>
                </div>
              </article>
            ))
          ) : (
            <p className={report.quiet}>
              Teaching observations will appear after a few learning sessions.
            </p>
          )}
        </div>
      </section>
      {patterns.length > 0 && (
        <section className={report.moreNotes}>
          <span className={report.eyebrow}>02 / IDEAS WE’RE CHECKING</span>
          <h2>A closer look before drawing conclusions.</h2>
          {patterns.map((m) => (
            <article key={m.id}>
              <p>{m.id.replaceAll("_", " ")}</p>
              <span>
                {m.confirmed ? "Repeated pattern" : "Possible pattern"} ·{" "}
                {m.checks} checks. Fresh examples help distinguish a
                misconception from a one-off mistake.
              </span>
            </article>
          ))}
        </section>
      )}
    </div>
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
            "Da Vinci noticed": s.summary.noticed,
            "What happens next": s.summary.next,
            "For you": s.summary.parentAction,
          }).map(([title, text]) => (
            <div key={title}>
              <span className="eyebrow">{title}</span>
              <p>{text}</p>
            </div>
          ))}
          {s.teaching?.attempts?.length ? (
            <div>
              <span className="eyebrow">HOW TEACHING CHANGED</span>
              <ol>
                {s.teaching.attempts.map((attempt, i) => (
                  <li key={i}>
                    {strategyNames[attempt.strategyId]} · {attempt.outcome} ·
                    {attempt.assistanceLevel ? "with help" : "without help"}
                  </li>
                ))}
              </ol>
              <p>
                Hints used: {s.teaching.hintHistory?.length ?? 0}. Answers
                shown: {s.teaching.revealedQuestions?.length ?? 0}. Fresh
                independent checks passed:{" "}
                {
                  s.teaching.assistanceLedger.filter(
                    (e) => e.independentlyVerified,
                  ).length
                }
                .
              </p>
            </div>
          ) : null}
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
            <Empty title="Da Vinci hasn’t learned much here yet.">
              After a few sessions, you’ll see what {child.nickname} knows and
              which approaches seem to help.
            </Empty>
          )}
        </section>
      )}
    </>
  );
}
