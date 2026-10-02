import { StudentShell } from "@/components/student-shell";
import { StudentHome, StudentSubject } from "@/components/student-home";
import { StudentSessions, StudentUploads } from "@/components/student-library";
import { StudySchedule } from "@/components/study-schedule";
import { ChildPreferences } from "@/components/child-preferences";
import { studyScheduleFor } from "@/server/study-schedule";
import { studentSubjects } from "@/lib/student-space";
import { gradeSkills } from "@/lib/curriculum-catalog";
import styles from "@/components/studio.module.css";
import { ConversationLesson } from "@/components/conversation-lesson";
import { conversationalGreeting } from "@/server/understanding";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Check, Leaf } from "lucide-react";
import { pageUser } from "@/server/auth";
import { learnerFor, ownedChild, sessionsFor, now } from "@/server/repository";
import { publicSession } from "@/server/provider";
import { ButtonLink } from "@/components/ui";
import { Homework } from "@/components/child-experience";
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
    last = sessions.find((s) => s.completedAt);
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
  } else if (!path.length) {
    content = (
      <StudentHome
        child={child}
        learner={learner}
        sessions={sessions}
        schedule={studyScheduleFor(user.id, child.id)}
        now={Date.parse(now())}
      />
    );
  } else if (path[0] === "subjects" && path.length === 2) {
    const subject = studentSubjects.find((s) => s.slug === path[1])?.subject;
    if (!subject || !(child.subjects ?? ["Math"]).includes(subject)) notFound();
    content = (
      <StudentSubject
        child={child}
        learner={learner}
        subject={subject}
        active={active}
      />
    );
  } else if (path[0] === "sessions" && path.length <= 2) {
    if (path[1] && !sessions.some((s) => s.id === path[1] && s.completedAt))
      notFound();
    content = (
      <StudentSessions child={child} sessions={sessions} detail={path[1]} />
    );
  } else if (path[0] === "uploads" && path.length === 1) {
    content = <StudentUploads childId={child.id} />;
  } else if (path[0] === "settings" && path.length === 1) {
    content = (
      <div className={styles.page}>
        <div className={styles.welcome}>
          <p className={styles.overline}>YOUR LEARNING, YOUR PACE</p>
          <h1>Grade & subjects</h1>
          <p>Choose your grade, then the subjects you’d like to explore.</p>
        </div>
        <ChildPreferences
          child={child}
          key={`${child.grade}:${child.subjects?.join(",")}`}
        />
      </div>
    );
  } else if (path[0] === "schedule" && path.length === 1) {
    content = (
      <div className={styles.page}>
        <div className={styles.welcome}>
          <p className={styles.overline}>A LITTLE TIME TO LEARN</p>
          <h1>Study schedule</h1>
          <p>Make room for your next discovery.</p>
        </div>
        <StudySchedule
          childId={child.id}
          subjects={(child.subjects ?? ["Math"]).filter(
            (subject) => gradeSkills(child.grade, subject).length > 0,
          )}
          initial={studyScheduleFor(user.id, child.id)}
        />
      </div>
    );
  } else notFound();
  return (
    <StudentShell
      key={child.id}
      child={{
        id: child.id,
        nickname: child.nickname,
        grade: child.grade,
        subjects: child.subjects,
      }}
    >
      {content}
    </StudentShell>
  );
}
