"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, X } from "lucide-react";
import { api } from "./forms";
import type { Subject } from "@/lib/types";
import type { StudyScheduleEntry } from "@/lib/study-schedule";
import { subjectSlug } from "@/lib/student-space";
import styles from "./studio.module.css";

export function StudySchedule({
  childId,
  subjects,
  initial,
}: {
  childId: string;
  subjects: Subject[];
  initial: StudyScheduleEntry[];
}) {
  const router = useRouter(),
    [entries, setEntries] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { entry } = await api<{ entry: StudyScheduleEntry }>(
        `/api/children/${childId}/schedule`,
        {
          subject: data.get("subject"),
          startsAt: new Date(String(data.get("startsAt"))).toISOString(),
          durationMinutes: Number(data.get("duration")),
        },
      );
      setEntries((items) =>
        [...items, entry].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      );
      setMessage(
        "Study time saved. Come back here when you’re ready to learn.",
      );
      form.reset();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/children/${childId}/schedule/${id}`, undefined, "DELETE");
      setEntries((items) => items.filter((item) => item.id !== id));
      setMessage("Study time cancelled.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.scheduleGrid}>
      <section className={styles.panel}>
        <h2>Make time for curiosity.</h2>
        <p>
          Plan a little time to learn. Dates and times use this device’s time
          zone. Automatic reminders are not enabled.
        </p>
        {subjects.length ? (
          <form
            className="form-stack"
            aria-label="Plan a study session"
            onSubmit={save}
          >
            <label>
              Subject
              <select name="subject">
                {subjects.map((subject) => (
                  <option key={subject}>{subject}</option>
                ))}
              </select>
            </label>
            <label>
              Date and time
              <input name="startsAt" type="datetime-local" required />
            </label>
            <label>
              Time to explore
              <select name="duration" defaultValue="15">
                {[10, 15, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            </label>
            <button className="button" disabled={busy}>
              <Plus size={18} />
              {busy ? "Saving…" : "Save study time"}
            </button>
          </form>
        ) : (
          <p className={styles.notice}>
            Scheduling will be available when your grade has teaching content.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </section>
      <section className={styles.panel}>
        <h2>Your study times</h2>
        {!entries.length && (
          <div className={styles.empty}>
            <CalendarDays size={32} />
            <p>
              No study times yet. A small, regular habit is a good place to
              start.
            </p>
          </div>
        )}
        {entries.map((entry) => (
          <article className={styles.scheduleEntry} key={entry.id}>
            <div>
              <span className={styles.tag}>{entry.subject}</span>
              <h3>
                <LocalDate value={entry.startsAt} />
              </h3>
              <p>{entry.durationMinutes} minutes</p>
              <Link
                className="text-link"
                href={`/learn/${childId}/subjects/${subjectSlug(entry.subject)}`}
              >
                Open subject →
              </Link>
            </div>
            <button
              disabled={busy}
              aria-label={`Cancel ${entry.subject} study time`}
              onClick={() => void cancel(entry.id)}
            >
              <X size={18} />
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

// Server and client use the same initial text; hydration then formats in the
// learner's actual time zone without assuming the web server's zone.
const subscribe = () => () => {};
export function LocalDate({ value }: { value: string }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <time dateTime={value}>
      {hydrated
        ? new Date(value).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : `${value.slice(0, 10)} · ${value.slice(11, 16)} UTC`}
    </time>
  );
}
