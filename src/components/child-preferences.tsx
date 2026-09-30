"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Child } from "@/lib/types";
import { api } from "./forms";
export function ChildPreferences({ child }: { child: Child }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      await api(
        `/api/children/${child.id}`,
        { grade: Number(data.get("grade")), subjects: data.getAll("subjects") },
        "PATCH",
      );
      setMessage(
        "Learning settings saved. Past progress is kept; your next lesson uses these choices.",
      );
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="card form-stack spaced"
      onSubmit={save}
      aria-label={`${child.nickname} learning settings`}
    >
      <h3>Learning settings for {child.nickname}</h3>
      <label>
        Current grade
        <select name="grade" defaultValue={child.grade}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="subject-picker">
        <legend>Enabled subjects</legend>
        {["Math", "English", "Science", "Social Studies"].map((subject) => (
          <label className="check-label" key={subject}>
            <input
              type="checkbox"
              name="subjects"
              value={subject}
              defaultChecked={child.subjects?.includes(
                subject as Child["subjects"][number],
              )}
            />
            {subject === "English" ? "English Language Arts" : subject}
          </label>
        ))}
      </fieldset>
      <p className="small muted">
        Grades 6–10 can be saved now; their lessons are not yet available.
        Existing lessons can be finished. Earlier learning and prerequisite
        review are preserved.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : "Save grade and subjects"}
      </button>
    </form>
  );
}
