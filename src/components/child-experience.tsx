"use client";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Upload,
  Camera,
  Clock,
  Leaf,
} from "lucide-react";
import type { PublicSession } from "@/server/provider";
import { api } from "./forms";
import { MathVisual } from "./math-visuals";
import { concepts } from "@/lib/curriculum";
export function StartLesson({
  childId,
  diagnostic = false,
  resume = false,
}: {
  childId: string;
  diagnostic?: boolean;
  resume?: boolean;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        className="button large-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api(`/api/children/${childId}/sessions`, {
              kind: diagnostic ? "diagnostic" : "lesson",
            });
            router.push(`/learn/${childId}/session`);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <>
            <LoaderCircle size={20} className="spin" />
            Getting your lesson ready…
          </>
        ) : (
          <>
            {resume
              ? "Pick up where you left off"
              : diagnostic
                ? "Let’s find your starting point"
                : "Start today’s lesson"}
            <ArrowRight size={21} />
          </>
        )}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
const phaseNames: Record<string, string> = {
  WARMUP: "A little warm-up",
  DIAGNOSTIC: "Let’s see what you know",
  TEACH: "A new way to see it",
  GUIDED_PRACTICE: "Let’s try together",
  INDEPENDENT_PRACTICE: "Your turn",
  MASTERY_CHECK: "One last little check",
  REMEDIATION: "A helpful building block",
  SESSION_REVIEW: "A moment to look back",
  COMPLETE: "All done",
};
export function Lesson({ initial }: { initial: PublicSession }) {
  const [session, setSession] = useState(initial),
    [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter(),
    heading = useRef<HTMLHeadingElement>(null);
  async function act(action: string, extra: Record<string, string> = {}) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ session: PublicSession }>(
        `/api/sessions/${session.id}`,
        { action, version: session.version, ...extra },
      );
      setSession(data.session);
      if (action === "continue") setAnswer("");
      if (data.session.state === "COMPLETE") {
        router.push(`/learn/${session.childId}/complete`);
        router.refresh();
      } else if (action === "continue")
        requestAnimationFrame(() => heading.current?.focus());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const review = session.state === "SESSION_REVIEW";
  return (
    <div className="lesson-wrap">
      <div className="lesson-progress">
        <span>
          {session.kind === "diagnostic"
            ? "Getting to know you"
            : "A little learning, just for you"}
        </span>
        <span>{review ? "Time to reflect" : `${session.step + 1} of 8`}</span>
        <progress value={session.step} max={8} aria-label="Lesson progress" />
      </div>
      <div className="lesson-paper" aria-busy={busy}>
        <div className="lesson-kicker">
          <span className="tutor-symbol">
            <Leaf size={20} />
          </span>
          {phaseNames[session.state]}
        </div>
        {review ? (
          <>
            <h1 ref={heading} tabIndex={-1}>
              How did that feel?
            </h1>
            <p className="tutor-message">
              There’s no right answer here. Every try helps us find your next
              step.
            </p>
            <div className="reflection-options">
              {["Ready for more", "A little clearer", "Still tricky"].map(
                (label, i) => (
                  <button
                    className="reflection-button"
                    key={label}
                    disabled={busy}
                    onClick={() => act("reflect", { reflection: label })}
                  >
                    <span>{["☀", "◒", "○"][i]}</span>
                    {label}
                    <ArrowRight size={19} />
                  </button>
                ),
              )}
            </div>
          </>
        ) : (
          <>
            <p className="personalization">{session.personalization}</p>
            <p className="tutor-message" aria-live="polite">
              {session.content.message}
            </p>
            <h1 ref={heading} tabIndex={-1} className="question-heading">
              {session.question.prompt}
            </h1>
            {session.content.ui.length > 0 && (
              <div className="math-stage">
                {session.content.ui.map((visual, i) => (
                  <MathVisual
                    visual={visual}
                    key={`${session.question.id}-${i}`}
                  />
                ))}
              </div>
            )}
            {!session.feedback ? (
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void act("answer", { answer });
                }}
              >
                <div className="answer-area">
                  {session.question.choices ? (
                    <fieldset className="answer-choices">
                      <legend className="sr-only">Choose an answer</legend>
                      {session.question.choices.map((choice) => (
                        <label
                          key={choice}
                          className={`answer-card ${answer === choice ? "selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="answer"
                            value={choice}
                            checked={answer === choice}
                            onChange={() => setAnswer(choice)}
                          />
                          <span>{choice}</span>
                          {answer === choice && <Check size={19} />}
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    <label className="numeric-label">
                      <span>Your answer</span>
                      <input
                        aria-label="Your answer"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        maxLength={80}
                        placeholder="e.g. 3 or 1/2"
                        autoComplete="off"
                        inputMode="text"
                        required
                      />
                    </label>
                  )}
                  <button
                    className="button answer-submit"
                    disabled={busy || !answer.trim()}
                    type="submit"
                  >
                    {busy ? (
                      <LoaderCircle size={19} className="spin" />
                    ) : (
                      <>
                        Check my answer
                        <ArrowRight size={19} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div
                className={`answer-feedback ${session.feedback.startsWith("That") ? "correct" : "try-again"}`}
                aria-live="polite"
              >
                <div>
                  <span className="icon-disc">
                    {session.feedback.startsWith("That") ? (
                      <Check size={21} />
                    ) : (
                      <Lightbulb size={21} />
                    )}
                  </span>
                  <p>{session.feedback}</p>
                </div>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => act("continue")}
                >
                  Keep going
                  <ArrowRight size={19} />
                </button>
              </div>
            )}
            {!session.feedback && (
              <div className="help-actions">
                <button disabled={busy} onClick={() => act("hint")}>
                  <Lightbulb size={18} />I need a hint
                </button>
                <button disabled={busy} onClick={() => act("another")}>
                  <RefreshCw size={18} />
                  Teach me another way
                </button>
              </div>
            )}
            {session.hint && !session.feedback && (
              <p className="hint-note" role="status">
                <Lightbulb size={17} />
                {session.hint}
              </p>
            )}
          </>
        )}
        {error && (
          <div role="alert" className="error">
            <p>{error}</p>
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Reload my saved lesson
            </button>
          </div>
        )}
        {busy && (
          <p className="loading-note" role="status">
            Thinking about the next little step…
          </p>
        )}
      </div>
      <p className="lesson-reassurance">
        No rush. It’s okay to try, wonder, and try again.
      </p>
      <Link href={`/learn/${session.childId}`} className="pause-link">
        Take a break — your place is saved
      </Link>
    </div>
  );
}
export function Homework({ childId }: { childId: string }) {
  const [preview, setPreview] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [result, setResult] = useState<{
      id: string;
      conceptId: string | null;
      manual: boolean;
    } | null>(null),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    const data = new FormData();
    data.set("image", file);
    try {
      const r = await api<{
        id: string;
        conceptId: string | null;
        manual: boolean;
      }>(`/api/children/${childId}/homework`, data);
      setResult(r);
      setSelected(r.conceptId ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="homework-paper">
      <span className="icon-disc peach">
        <Camera size={27} />
      </span>
      <p className="eyebrow">A LITTLE HELP GETTING UNSTUCK</p>
      <h1>Let’s figure it out.</h1>
      <p className="muted">
        We’ll practice a similar problem together. Then you can come back and
        try your homework yourself.
      </p>
      {!result ? (
        <>
          <label className={`upload-zone ${preview ? "has-preview" : ""}`}>
            {preview ? (
              <Image
                src={preview}
                alt="Your homework preview"
                width={500}
                height={300}
                unoptimized
              />
            ) : (
              <>
                <Upload size={30} />
                <strong>Add a photo of your math</strong>
                <span>
                  Take a photo or choose one · JPG, PNG, WebP · Up to 5 MB
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose homework photo"
              onChange={(e) => {
                const next = e.target.files?.[0];
                if (!next) return;
                if (next.size > 5 * 1024 * 1024) {
                  setError("Choose a photo smaller than 5 MB.");
                  return;
                }
                if (preview) URL.revokeObjectURL(preview);
                setFile(next);
                setPreview(URL.createObjectURL(next));
                setError("");
              }}
            />
          </label>
          <p className="small muted">
            Photograph just the problem. Leave names and personal details out of
            the picture.
          </p>
          <button
            className="button full"
            disabled={!file || busy}
            onClick={upload}
          >
            {busy
              ? "Looking for a good place to start…"
              : "Find what to practice"}
            <ArrowRight size={18} />
          </button>
        </>
      ) : (
        <div className="homework-result">
          <p className="notice">
            <Check size={18} />
            Your photo is saved privately.
          </p>
          <label>
            {result.manual
              ? "Which idea is this homework about?"
              : "This looks like the idea below. Does that fit?"}
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="" disabled>
                Choose a math idea
              </option>
              {concepts.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {result.manual && (
            <p className="small muted">
              Automatic photo reading isn’t available right now. You can choose
              the idea and still get the same guided practice.
            </p>
          )}
          <button
            className="button full"
            disabled={!selected || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/api/children/${childId}/sessions`, {
                  kind: "homework",
                  homeworkId: result.id,
                  conceptId: selected,
                });
                router.push(`/learn/${childId}/session`);
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            Practice a similar problem
            <ArrowRight size={18} />
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="lesson-meta">
        <Clock size={15} />A little understanding goes a long way.
      </p>
    </section>
  );
}
