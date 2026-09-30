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
    <>
      <PageHeading
        eyebrow="THE BIG PICTURE"
        title={`${child.nickname}’s learning`}
        description="What they know, what needs practice, and how teaching is changing."
      />
      <section className="card parent-next-step">
        <div>
          <span className="eyebrow">
            {active ? "READY TO CONTINUE" : "NEXT LEARNING STEP"}
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
              ? "Their saved lesson keeps its original starting point. Updated settings apply to the next lesson."
              : plan
                ? plan.reason
                : "Past progress is saved. We will add lessons here when the curriculum is ready."}
          </p>
        </div>
        <ButtonLink href={`/learn/${child.id}`}>
          Open learning space <ArrowRight size={18} />
        </ButtonLink>
      </section>
      <LearningEvidence child={child} learner={learner} />
      <details className="card spaced parent-settings">
        <summary>Grade {child.grade} · Manage grade and subjects</summary>
        <ChildPreferences key={child.id} child={child} />
      </details>
      {last && (
        <section className="card spaced">
          <h2>Last lesson</h2>
          <p>{last.summary?.workedOn}</p>
          <p>{last.summary?.improved}</p>
          <TextLink href={`/app/children/${child.id}/sessions/${last.id}`}>
            Read the lesson summary
          </TextLink>
        </section>
      )}
    </>
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
  return (
    <>
      <PageHeading
        eyebrow="A TUTOR THAT LEARNS, TOO"
        title={`Learning how to teach ${child.nickname}.`}
        description="No fixed labels. Just careful observations, and better next steps."
      />
      <InsightCard child={child} insight={deriveInsight(child, learner)} full />
      <KnowledgeSnapshot child={child} learner={learner} />
      <section className="card spaced">
        <div className="section-title">
          <h2>What seems to help</h2>
          <Lightbulb size={20} />
        </div>
        {learner.strategies.length ? (
          <div className="strategy-list">
            {learner.strategies.map((e) => (
              <div
                key={`${e.strategyId}-${e.subject ?? ""}-${e.conceptDomain}`}
              >
                <span className="icon-disc">
                  <BookOpen size={20} />
                </span>
                <div>
                  <h3>{strategyNames[e.strategyId]}</h3>
                  <p>
                    {e.attempts < 3
                      ? "Still gathering evidence."
                      : e.successfulOutcomes / e.attempts >= 0.65
                        ? `Recently effective in ${e.conceptDomain.toLowerCase()}${e.subject ? ` · ${e.subject}` : ""}.`
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
            A mistake can happen for many reasons. Da Vinci uses fresh examples
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
