import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Clock,
  Upload,
  CalendarDays,
} from "lucide-react";
import type { Child, Learner, LearningSession, Subject } from "@/lib/types";
import { availableLesson, planLesson } from "@/lib/learning";
import { gradeSkills } from "@/lib/curriculum-catalog";
import { conceptById } from "@/lib/curriculum";
import { parentSkillLevel, parentObservations } from "@/lib/parent-learning";
import { studentSubjects } from "@/lib/student-space";
import type { StudyScheduleEntry } from "@/lib/study-schedule";
import { SubjectIcon } from "./student-shell";
import { StartLesson } from "./child-experience";
import { SkillBrowser } from "./skill-browser";
import { LocalDate } from "./study-schedule";
import styles from "./studio.module.css";

export function StudentHome({
  child,
  learner,
  sessions,
  schedule,
  now,
}: {
  child: Child;
  learner: Learner;
  sessions: LearningSession[];
  schedule: StudyScheduleEntry[];
  now: number;
}) {
  const active = sessions.find((s) => !s.completedAt),
    plan = active?.plan ?? availableLesson(child, learner),
    skill = plan && conceptById[plan.targetConcept];
  const completed = sessions.filter((s) => s.completedAt),
    upcoming = schedule.filter((s) => Date.parse(s.startsAt) > now).slice(0, 2);
  const observations = parentObservations(child, learner);
  const observation =
    observations.find(
      (item) =>
        skill &&
        (item.id.includes(skill.id) || item.id.endsWith(`:${skill.domain}`)),
    ) ?? observations[0];
  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <p className={styles.overline}>A LITTLE CURIOSITY, EVERY DAY</p>
        <h1>Welcome back, {child.nickname}.</h1>
        <p>What would you like to discover today?</p>
      </div>
      <div className={styles.homeGrid}>
        <div>
          {skill && plan ? (
            <section className={styles.heroCard} data-subject={skill.subject}>
              <div>
                <span className={styles.tag}>
                  {active ? "CONTINUE YOUR SESSION" : "CHOSEN FOR YOU"}
                </span>
                <h2>
                  {!child.diagnosticComplete && !active
                    ? "Let’s find your starting point."
                    : `Explore ${skill.name.toLowerCase()}`}
                </h2>
                <p>
                  {active
                    ? "Your lesson is saved, just where you left it."
                    : !child.diagnosticComplete
                      ? "A few questions will help Da Vinci get to know how you think."
                      : `${skill.subject} · Grade ${child.grade}`}
                </p>
                <StartLesson
                  childId={child.id}
                  diagnostic={!child.diagnosticComplete}
                  resume={!!active}
                />
                <span className={styles.duration}>
                  <Clock size={14} />
                  About {plan.estimatedMinutes} minutes · At your pace
                </span>
              </div>
              <div className={styles.subjectArt} aria-hidden="true">
                <SubjectIcon subject={skill.subject} size={90} />
                <span>✦</span>
              </div>
            </section>
          ) : (
            <section className={styles.panel}>
              <h2>Grade {child.grade} lessons are coming</h2>
              <p>
                Your progress is saved. Choose another grade in your learning
                settings to explore available content.
              </p>
              <Link className="text-link" href={`/learn/${child.id}/settings`}>
                Grade & subjects <ArrowRight size={17} />
              </Link>
            </section>
          )}
          <section
            className={styles.curriculum}
            aria-labelledby="curriculum-title"
          >
            <div className={styles.sectionHeading}>
              <h2 id="curriculum-title">Grade {child.grade} curriculum</h2>
              <Link href={`/learn/${child.id}/settings`}>
                Change grade & subjects <ArrowRight size={15} />
              </Link>
            </div>
            <p className={styles.quiet}>
              Choose a subject. We’ll find the right next step together.
            </p>
            <div className={styles.subjectGrid}>
              {studentSubjects
                .filter((s) => (child.subjects ?? ["Math"]).includes(s.subject))
                .map(({ subject, slug, description }) => {
                  const skills = gradeSkills(child.grade, subject),
                    practiced = skills.filter(
                      (s) => learner.states[s.id]?.evidence.length,
                    ).length;
                  const next = skills.length
                    ? planLesson(child, learner, new Date(), subject)
                    : null;
                  return (
                    <Link
                      className={styles.subjectCard}
                      href={`/learn/${child.id}/subjects/${slug}`}
                      key={subject}
                      data-subject={subject}
                    >
                      <span className={styles.subjectIcon}>
                        <SubjectIcon subject={subject} size={30} />
                      </span>
                      <span className={styles.tag}>{subject}</span>
                      <h3>
                        {next
                          ? conceptById[next.targetConcept].name
                          : description}
                      </h3>
                      <p>
                        {skills.length
                          ? `${practiced} of ${skills.length} available skills explored`
                          : "Curriculum coming soon"}
                      </p>
                      <span className={styles.cardLink}>
                        {skills.length ? "Explore subject" : "See availability"}
                        <ArrowRight size={17} />
                      </span>
                    </Link>
                  );
                })}
            </div>
          </section>
          <section className={styles.recent}>
            <div className={styles.sectionHeading}>
              <h2>Pick up a thought</h2>
              <Link href={`/learn/${child.id}/sessions`}>
                All sessions <ArrowRight size={15} />
              </Link>
            </div>
            {completed.length ? (
              completed.slice(0, 3).map((session) => (
                <Link
                  className={styles.sessionRow}
                  key={session.id}
                  href={`/learn/${child.id}/sessions/${session.id}`}
                >
                  <span className={styles.subjectIcon}>
                    <SubjectIcon
                      subject={
                        conceptById[session.plan.targetConcept]?.subject ??
                        "Math"
                      }
                    />
                  </span>
                  <div>
                    <h3>
                      {session.summary?.workedOn ??
                        conceptById[session.plan.targetConcept]?.name}
                    </h3>
                    <p>
                      {session.summary?.next ??
                        "Revisit your learning and saved work."}
                    </p>
                  </div>
                  <ArrowRight size={18} />
                </Link>
              ))
            ) : (
              <p className={styles.quiet}>
                Your completed lessons and saved work will live here.
              </p>
            )}
          </section>
        </div>
        <aside className={styles.homeAside}>
          <section className={`${styles.panel} ${styles.personalNote}`}>
            <span className={styles.noteIcon}>
              <Sparkles size={23} />
            </span>
            <p className={styles.overline}>YOUR DA VINCI</p>
            <h2>
              Learning how
              <br />
              you learn.
            </h2>
            <p>
              {active?.decision?.reason ??
                observation?.text ??
                plan?.reason ??
                "We’ll build your learning path as you explore."}
            </p>
            <p className={styles.quiet}>
              The goal stays the same. The examples, pace, and support adapt to
              you.
            </p>
            <Link
              href={`/app/children/${child.id}/insights`}
              className="text-link"
            >
              See how Da Vinci adapts <ArrowRight size={16} />
            </Link>
          </section>
          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <h3>Your next study time</h3>
              <CalendarDays size={20} />
            </div>
            {upcoming.length ? (
              upcoming.map((item) => (
                <p key={item.id}>
                  <strong>{item.subject}</strong>
                  <br />
                  <LocalDate value={item.startsAt} />
                </p>
              ))
            ) : (
              <p className={styles.quiet}>A little time, just for learning.</p>
            )}
            <Link className="text-link" href={`/learn/${child.id}/schedule`}>
              Plan a study time <ArrowRight size={16} />
            </Link>
          </section>
          <Link
            className={styles.materialCta}
            href={`/learn/${child.id}/homework`}
          >
            <Upload size={23} />
            <h3>Bring your own question.</h3>
            <p>
              Upload a schoolwork photo or PDF to find a related skill to
              practice.
            </p>
            <span className="text-link">
              Explore your schoolwork <ArrowRight size={16} />
            </span>
          </Link>
        </aside>
      </div>
    </div>
  );
}

export function StudentSubject({
  child,
  learner,
  subject,
  active,
}: {
  child: Child;
  learner: Learner;
  subject: Subject;
  active?: LearningSession;
}) {
  const skills = gradeSkills(child.grade, subject),
    plan = skills.length
      ? planLesson(child, learner, new Date(), subject)
      : null;
  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <p className={styles.overline}>
          GRADE {child.grade} · YOUR LEARNING PATH
        </p>
        <h1>{subject === "English" ? "English Language Arts" : subject}</h1>
        <p>A new idea starts with what you already know.</p>
      </div>
      {plan && (
        <section className={styles.heroCard} data-subject={subject}>
          <div>
            <span className={styles.tag}>YOUR NEXT STEP</span>
            <h2>{conceptById[plan.targetConcept].name}</h2>
            <p>{plan.reason}</p>
            <StartLesson
              childId={child.id}
              subject={subject}
              resume={!!active}
              label={
                active ? "Continue saved lesson" : `Start ${subject} session`
              }
            />
          </div>
          <div className={styles.subjectArt} aria-hidden="true">
            <SubjectIcon subject={subject} size={85} />
          </div>
        </section>
      )}
      <SkillBrowser
        childId={child.id}
        subject={subject}
        resume={!!active}
        skills={skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          domain: skill.domain,
          level: parentSkillLevel(learner.states[skill.id]),
        }))}
      />
    </div>
  );
}
