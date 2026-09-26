"use client";
import { useState } from "react";
import { api } from "./forms";
import type { LearningControls } from "../server/learning-controls";
export function LearningControlsForm({
  childId,
  initial,
}: {
  childId: string;
  initial: LearningControls;
}) {
  const [value, setValue] = useState(initial),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="card spaced settings-card">
      <h2>Learning controls</h2>
      <p>
        When answer reveal is delayed, Da Vinci first uses hints, alternate
        explanations, and prerequisite support to help your child solve
        independently.
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api(`/api/children/${childId}/controls`, value);
            setMessage("Learning controls saved.");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Correct answer access
          <select
            value={value.policy}
            onChange={(e) =>
              setValue({
                ...value,
                policy: e.target.value as LearningControls["policy"],
              })
            }
          >
            <option value="immediate">Allow anytime</option>
            <option value="after_attempts">Allow after attempts</option>
            <option value="disabled">Never reveal answers</option>
          </select>
        </label>
        {value.policy === "after_attempts" && (
          <label>
            Attempts before showing the answer
            <select
              value={value.minimumAttempts}
              onChange={(e) =>
                setValue({ ...value, minimumAttempts: Number(e.target.value) })
              }
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "attempt" : "attempts"}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="button" disabled={busy}>
          Save learning controls
        </button>
        <p role="status">{message}</p>
      </form>
    </section>
  );
}
