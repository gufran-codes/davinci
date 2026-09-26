import { boardSchema, type StudentBoard } from "../lib/teaching/whiteboard";
import { one, run, transaction } from "./db";
import { HttpError } from "./repository";
export function boardFor(sessionId: string): StudentBoard {
  const row = one<{ revision: number; data: string }>(
    "SELECT revision,data FROM student_boards WHERE session_id=?",
    sessionId,
  );
  return row
    ? { revision: row.revision, objects: JSON.parse(row.data) }
    : { revision: 0, objects: [] };
}
export function saveBoard(sessionId: string, input: unknown) {
  return transaction(() => {
    const next = boardSchema.parse(input),
      current = boardFor(sessionId);
    if (next.revision !== current.revision)
      throw new HttpError(
        409,
        "The board changed in another tab. Reload it before continuing.",
      );
    run(
      "INSERT INTO student_boards VALUES(?,?,?) ON CONFLICT(session_id) DO UPDATE SET revision=excluded.revision,data=excluded.data",
      sessionId,
      current.revision + 1,
      JSON.stringify(next.objects),
    );
    return { revision: current.revision + 1, objects: next.objects };
  });
}
