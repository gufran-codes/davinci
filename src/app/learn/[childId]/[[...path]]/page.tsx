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
import { planLesson } from "@/lib/learning";
import { conceptById } from "@/lib/curriculum";
import { Brand, ButtonLink } from "@/components/ui";
import { Homework, Lesson, StartLesson } from "@/components/child-experience";
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
    plan = planLesson(child, learner);
  let content;
  if (path[0] === "session") {
    if (!active) redirect(`/learn/${child.id}`);
    content = <Lesson initial={await publicSession(active)} />;
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
        <p className="child-greeting">Let’s make something make sense today.</p>
        <section className="child-lesson-card">
          <div className="child-lesson-art" aria-hidden="true">
            <div className="fraction-disc" />
            <span>½ = ²⁄₄</span>
          </div>
          <div>
            <p className="eyebrow">
              {!child.diagnosticComplete
                ? "LET’S FIND YOUR STARTING POINT"
                : "TODAY’S LESSON"}
            </p>
            <h2>
              {!child.diagnosticComplete
                ? "A little getting to know you."
                : conceptById[active?.plan.targetConcept ?? plan.targetConcept]
                    .name}
            </h2>
            <p>
              {!child.diagnosticComplete
                ? "A few questions to see what feels easy and what we can explore together."
                : plan.reason}
            </p>
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
        <Link className="homework-link" href={`/learn/${child.id}/homework`}>
          <span className="icon-disc peach">
            <Camera size={23} />
          </span>
          <div>
            <strong>Something tricky in your homework?</strong>
            <p>Let’s practice it together.</p>
          </div>
          <ArrowRight size={21} />
        </Link>
        {last && (
          <div className="last-time">
            <span className="eyebrow">LAST TIME</span>
            <p>
              You worked on {last.summary?.workedOn.toLowerCase()}. We’ll
              remember where you left off.
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
