import { GradeCurriculum } from "@/components/grade-curriculum";
import { ConversationLesson } from "@/components/conversation-lesson";
import { conversationalGreeting } from "@/server/understanding";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Clock,
  Leaf,
} from "lucide-react";
import { pageUser } from "@/server/auth";
import { learnerFor, ownedChild, sessionsFor } from "@/server/repository";
import { publicSession } from "@/server/provider";
import { availableLesson, subjectOverview } from "@/lib/learning";
import { conceptById } from "@/lib/curriculum";
import { Brand, ButtonLink } from "@/components/ui";
import { Homework, StartLesson } from "@/components/child-experience";
export const dynamic = "force-dynamic";
export default async function ChildPage({
  params,
}: {
  params: Promise<{ childId: string; path?: string[] }>;
}) {
  const user = await pageUser(),
    { childId, path = [] } = await params;
  let child;
  try {
    child = ownedChild(user.id, childId);
  } catch {
    notFound();
  }
  const learner = learnerFor(child.id),
    sessions = sessionsFor(child.id),
    active = sessions.find((s) => !s.completedAt),
    last = sessions.find((s) => s.completedAt),
    plan = availableLesson(child, learner);
  let content;
  if (path[0] === "session") {
    if (!active) redirect(`/learn/${child.id}`);
    content = (
      <ConversationLesson
        initial={await publicSession(
          await conversationalGreeting(child, active.id),
          learner,
          {
            grade: child.grade,
            age: child.age,
          },
        )}
      />
    );
  } else if (path[0] === "homework")
    content = active ? (
      <div className="homework-paper">
        <h1>One little step at a time.</h1>
        <p>
          Let’s finish your saved lesson first. Then we can look at your
          homework.
        </p>
        <ButtonLink href={`/learn/${child.id}/session`}>
          Continue saved lesson
          <ArrowRight size={18} />
        </ButtonLink>
      </div>
    ) : (
      <Homework childId={child.id} />
    );
  else if (path[0] === "complete") {
    if (!last) redirect(`/learn/${child.id}`);
    content = (
      <section className="completion-paper">
        <div className="completion-mark">
          <Check size={42} />
        </div>
        <p className="eyebrow">A LITTLE PROGRESS, MADE BY YOU</p>
        <h1>
          You showed up.
          <br />
          You tried. You learned.
        </h1>
        <p className="muted">
          That’s a good day of learning, {child.nickname}.
        </p>
        <div className="completion-note">
          <Leaf size={23} />
          <div>
            <strong>{last.summary?.workedOn}</strong>
            <p>{last.summary?.improved}</p>
          </div>
        </div>
        <p>{last.summary?.next}</p>
        <ButtonLink href={`/learn/${child.id}`}>
          Back to your space
          <ArrowRight size={18} />
        </ButtonLink>
        <Link
          className="text-link"
          href={`/app/children/${child.id}/sessions/${last.id}`}
        >
          See the parent summary
        </Link>
      </section>
    );
  } else if (!path.length)
    content = (
      <div className="child-home">
        <p className="eyebrow">YOUR LITTLE SPACE TO LEARN</p>
        <h1>
          Hi, {child.nickname}
          <span className="greeting-sun">✳</span>
        </h1>
        <p className="child-greeting">
          Grade {child.grade} · Choose a subject to work on.
        </p>
        {plan || active ? (
          <section className="child-lesson-card">
            <div className="child-lesson-art" aria-hidden="true">
              <div className="fraction-disc" />
              <span>
                {!child.diagnosticComplete
                  ? "✳"
                  : (conceptById[
                      active?.plan.targetConcept ?? plan?.targetConcept ?? ""
                    ].subject ?? "Math")}
              </span>
            </div>
            <div>
              <p className="eyebrow">
                {!child.diagnosticComplete
                  ? "LET’S FIND YOUR STARTING POINT"
                  : "✨ TODAY’S LEARNING · PERSONALIZED FOR YOU"}
              </p>
              <h2>
                {!child.diagnosticComplete
                  ? "A little getting to know you."
                  : conceptById[
                      active?.plan.targetConcept ?? plan?.targetConcept ?? ""
                    ].name}
              </h2>
              <p>
                {!child.diagnosticComplete
                  ? "A few questions to see what feels easy and what we can explore together."
                  : plan?.reason}
              </p>
              {!child.diagnosticComplete ? null : (
                <p className="muted small">Why this today? {plan?.reason}</p>
              )}
              <p className="lesson-meta">
                <Clock size={17} />
                {child.diagnosticComplete
                  ? "About 10 minutes"
                  : "About 8–12 minutes"}
                <span>•</span>Go at your own pace
              </p>
              <StartLesson
                childId={child.id}
                diagnostic={!child.diagnosticComplete}
                resume={!!active}
              />
            </div>
          </section>
        ) : (
          <section className="card">
            <h2>Grade {child.grade} lessons are coming</h2>
            <p>
              Your previous progress is saved. Your parent can update learning
              settings in Parent space.
            </p>
          </section>
        )}
        {!plan || !child.diagnosticComplete ? null : (
          <section className="subject-grid">
            {subjectOverview(learner)
              .filter((row) =>
                (child.subjects ?? ["Math"]).includes(row.subject),
              )
              .map((row) => (
                <div className="card subject-tile" key={row.subject}>
                  <p className="eyebrow">{row.subject.toUpperCase()}</p>
                  <h3>
                    {row.lastSkillId
                      ? conceptById[row.lastSkillId]?.name
                      : "Not started yet"}
                  </h3>
                  <p className="muted small">
                    {row.practiced
                      ? `${row.practiced} ${row.practiced === 1 ? "idea" : "ideas"} practiced`
                      : "A fresh place to explore"}
                  </p>
                  <StartLesson
                    childId={child.id}
                    subject={row.subject}
                    label={`Practice ${row.subject}`}
                    resume={false}
                  />
                </div>
              ))}
          </section>
        )}
        <GradeCurriculum
          grade={child.grade}
          childId={child.id}
          subjects={child.subjects}
        />
        <Link className="homework-link" href={`/learn/${child.id}/homework`}>
          <span className="icon-disc peach">
            <Camera size={23} />
          </span>
          <div>
            <strong>Something tricky in your schoolwork?</strong>
            <p>📸 Schoolwork — let’s practice it together.</p>
          </div>
          <ArrowRight size={21} />
        </Link>
        {last && (
          <div className="last-time">
            <span className="eyebrow">CONTINUE LEARNING</span>
            <p>
              {conceptById[last.plan.targetConcept]?.subject ?? "Math"} ·{" "}
              {last.summary?.workedOn}. {last.summary?.next}
            </p>
          </div>
        )}
      </div>
    );
  else notFound();
  return (
    <div className="child-shell">
      <header className="child-header">
        <Brand />
        <Link
          href={
            path.length ? `/learn/${child.id}` : `/app/children/${child.id}`
          }
        >
          <ArrowLeft size={17} />
          {path.length ? "My space" : "Parent space"}
        </Link>
      </header>
      <main>{content}</main>
      <footer className="child-footer">
        A little curiosity goes a long way.
      </footer>
    </div>
  );
}
