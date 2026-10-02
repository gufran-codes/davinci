import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Upload,
  BookOpen,
} from "lucide-react";
import type { Child, LearningSession } from "@/lib/types";
import { conceptById } from "@/lib/curriculum";
import { all } from "@/server/db";
import { boardFor } from "@/server/whiteboard";
import { SubjectIcon } from "./student-shell";
import { LocalDate } from "./study-schedule";
import styles from "./studio.module.css";

export function StudentSessions({
  child,
  sessions,
  detail,
}: {
  child: Child;
  sessions: LearningSession[];
  detail?: string;
}) {
  const session = detail
    ? sessions.find((s) => s.id === detail && s.completedAt)
    : undefined;
  const board = session && boardFor(session.id);
  const turns = session
    ? all<{
        id: string;
        student_transcript: string;
        written_tutor_text: string;
        spoken_tutor_text: string;
        interrupted: number;
      }>(
        "SELECT id,student_transcript,COALESCE(json_extract(data,'$.presentation.text'),generated_tutor_text) AS written_tutor_text,spoken_tutor_text,interrupted FROM conversation_turns WHERE child_id=? AND session_id=? ORDER BY created_at,rowid",
        child.id,
        session.id,
      )
    : [];
  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        {session && (
          <Link className="text-link" href={`/learn/${child.id}/sessions`}>
            <ArrowLeft size={16} />
            All sessions
          </Link>
        )}
        <p className={styles.overline}>YOUR IDEAS, REMEMBERED</p>
        <h1>
          {session
            ? (session.summary?.workedOn ??
              conceptById[session.plan.targetConcept]?.name)
            : "Past sessions"}
        </h1>
        <p>
          {session
            ? "Look back at what you explored, then take your next step."
            : "A place for everything you’ve figured out along the way."}
        </p>
      </div>
      {session ? (
        <>
          <div className={styles.reviewGrid}>
            {Object.entries({
              "What clicked": session.summary?.improved,
              "Keep exploring": session.summary?.developing,
              "Da Vinci noticed": session.summary?.noticed,
              "Your next step": session.summary?.next,
            }).map(
              ([title, text]) =>
                text && (
                  <section className={styles.panel} key={title}>
                    <p className={styles.overline}>{title}</p>
                    <p>{text}</p>
                  </section>
                ),
            )}
          </div>
          <section className={styles.panel}>
            <h2>Your saved whiteboard</h2>
            {board?.objects.length ? (
              <svg
                viewBox="0 0 800 400"
                role="img"
                aria-label="Saved student whiteboard"
                className={styles.savedBoard}
              >
                {board.objects.map((o) => (
                  <g
                    key={o.id}
                    stroke="#285951"
                    fill="none"
                    strokeWidth={o.kind === "highlighter" ? 18 : 3}
                    opacity={o.kind === "highlighter" ? 0.35 : 1}
                  >
                    {o.points ? (
                      <polyline
                        points={o.points.map((p) => p.join(",")).join(" ")}
                        strokeLinecap="round"
                      />
                    ) : o.kind === "text" ? (
                      <text
                        x={o.x}
                        y={o.y}
                        stroke="none"
                        fill="#285951"
                        fontSize="20"
                      >
                        {o.text}
                      </text>
                    ) : o.kind === "rectangle" ? (
                      <rect x={o.x} y={o.y} width="90" height="55" />
                    ) : (
                      <circle
                        cx={o.x}
                        cy={o.y}
                        r={o.kind === "counter" ? 12 : 35}
                        fill={o.kind === "counter" ? "#acd4c1" : "none"}
                      />
                    )}
                  </g>
                ))}
              </svg>
            ) : (
              <p className={styles.quiet}>
                No drawing was saved for this session.
              </p>
            )}
          </section>
          <details className={styles.transcript}>
            <summary>Review the conversation · {turns.length} turns</summary>
            <p className={styles.quiet}>
              Spoken replies show the recorded delivered words. Written replies
              are labelled separately.
            </p>
            {turns.map((turn) => (
              <article key={turn.id}>
                {turn.student_transcript && (
                  <div>
                    <strong>You</strong>
                    <p>{turn.student_transcript}</p>
                  </div>
                )}
                <div>
                  <strong>
                    Da Vinci ·{" "}
                    {turn.spoken_tutor_text ? "Spoken" : "Written reply"}
                    {turn.interrupted ? " · Interrupted" : ""}
                  </strong>
                  <p>
                    {turn.spoken_tutor_text ||
                      (turn.interrupted
                        ? "Stopped before any speech was recorded."
                        : turn.written_tutor_text)}
                  </p>
                  {turn.spoken_tutor_text &&
                    turn.written_tutor_text !== turn.spoken_tutor_text && (
                      <details>
                        <summary>Full written reply</summary>
                        <p>{turn.written_tutor_text}</p>
                      </details>
                    )}
                </div>
              </article>
            ))}
          </details>
          <Link className="button" href={`/learn/${child.id}`}>
            Back to learning <ArrowRight size={18} />
          </Link>
        </>
      ) : (
        <section className={styles.panel}>
          {sessions.filter((s) => s.completedAt).length ? (
            sessions
              .filter((s) => s.completedAt)
              .map((s) => (
                <Link
                  className={styles.sessionRow}
                  href={`/learn/${child.id}/sessions/${s.id}`}
                  key={s.id}
                >
                  <span className={styles.subjectIcon}>
                    <SubjectIcon
                      subject={
                        conceptById[s.plan.targetConcept]?.subject ?? "Math"
                      }
                    />
                  </span>
                  <div>
                    <h3>
                      {s.summary?.workedOn ??
                        conceptById[s.plan.targetConcept]?.name}
                    </h3>
                    <p>
                      <LocalDate value={s.completedAt!} /> ·{" "}
                      {s.kind === "diagnostic"
                        ? "Starting-point check"
                        : "Personalized lesson"}
                    </p>
                  </div>
                  <ArrowRight size={18} />
                </Link>
              ))
          ) : (
            <div className={styles.empty}>
              <BookOpen size={35} />
              <h2>Your story starts here.</h2>
              <p>
                Complete a lesson to see your session summary and saved work.
              </p>
              <Link className="button" href={`/learn/${child.id}`}>
                Explore a subject <ArrowRight size={18} />
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function StudentUploads({ childId }: { childId: string }) {
  const uploads = all<{
    id: string;
    mime: string;
    concept_id: string | null;
    created_at: string;
  }>(
    "SELECT id,mime,concept_id,created_at FROM homework_uploads WHERE child_id=? ORDER BY created_at DESC",
    childId,
  );
  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <p className={styles.overline}>BRING YOUR CURIOSITY</p>
        <h1>My materials</h1>
        <p>Your schoolwork, all in one place.</p>
        <Link className="button" href={`/learn/${childId}/homework`}>
          <Upload size={18} />
          Upload schoolwork
        </Link>
      </div>
      <p className={styles.quiet}>
        Photos and PDFs up to 5 MB. Da Vinci helps you practice a related skill
        from the available curriculum.
      </p>
      <div className={styles.uploadGrid}>
        {uploads.map((upload) => (
          <article className={styles.panel} key={upload.id}>
            <FileText size={32} />
            <span className={styles.tag}>
              {upload.mime === "application/pdf" ? "PDF" : "Image"}
            </span>
            <h2>
              {upload.concept_id
                ? (conceptById[upload.concept_id]?.name ?? "Schoolwork")
                : "Your schoolwork"}
            </h2>
            <p>
              <LocalDate value={upload.created_at} />
            </p>
            <a
              className="button secondary"
              href={`/api/children/${childId}/homework/${upload.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open material <ArrowRight size={16} />
            </a>
          </article>
        ))}
      </div>
      {!uploads.length && (
        <div className={styles.empty}>
          <Upload size={36} />
          <h2>A question worth exploring?</h2>
          <p>Add a schoolwork photo or PDF to begin.</p>
        </div>
      )}
    </div>
  );
}
