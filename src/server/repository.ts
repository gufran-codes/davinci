import { randomUUID } from "node:crypto";
import { Child, Learner, LearningSession, SessionEvent } from "../lib/types";
import { all, one, run } from "./db";
export const now = () => new Date().toISOString();
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function childrenFor(parentId: string) {
  return all<Child>(
    "SELECT id,parent_id AS parentId,nickname,age,grade,goal,diagnostic_complete AS diagnosticComplete,created_at AS createdAt FROM children WHERE parent_id=? ORDER BY created_at",
    parentId,
  ).map((c) => ({ ...c, diagnosticComplete: !!c.diagnosticComplete }));
}
export function ownedChild(parentId: string, id: string): Child {
  const c = childrenFor(parentId).find((c) => c.id === id);
  if (!c) throw new HttpError(404, "Child profile not found.");
  return c;
}
export function createChild(
  parentId: string,
  data: { nickname: string; age: number; grade: number; goal: string },
) {
  const id = randomUUID();
  run(
    "INSERT INTO children(id,parent_id,nickname,age,grade,goal,created_at) VALUES(?,?,?,?,?,?,?)",
    id,
    parentId,
    data.nickname,
    data.age,
    data.grade,
    data.goal,
    now(),
  );
  return ownedChild(parentId, id);
}
export function learnerFor(childId: string): Learner {
  const states = all<{ data: string }>(
    "SELECT data FROM learner_concept_states WHERE child_id=?",
    childId,
  ).map((r) => JSON.parse(r.data));
  return {
    states: Object.fromEntries(states.map((s) => [s.conceptId, s])),
    strategies: all<{ data: string }>(
      "SELECT data FROM teaching_strategy_evidence WHERE child_id=?",
      childId,
    ).map((r) => JSON.parse(r.data)),
    misconceptions: all<{ data: string }>(
      "SELECT data FROM learner_misconception_states WHERE child_id=?",
      childId,
    ).map((r) => JSON.parse(r.data)),
  };
}
export function saveLearner(childId: string, l: Learner) {
  for (const s of Object.values(l.states))
    run(
      "INSERT INTO learner_concept_states VALUES(?,?,?,?) ON CONFLICT(child_id,concept_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
      childId,
      s.conceptId,
      JSON.stringify(s),
      now(),
    );
  for (const e of l.strategies)
    run(
      "INSERT INTO teaching_strategy_evidence VALUES(?,?,?,?,?) ON CONFLICT(child_id,strategy_id,domain) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
      childId,
      e.strategyId,
      e.conceptDomain,
      JSON.stringify(e),
      now(),
    );
  for (const m of l.misconceptions)
    run(
      "INSERT INTO learner_misconception_states VALUES(?,?,?,?) ON CONFLICT(child_id,misconception_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
      childId,
      m.id,
      JSON.stringify(m),
      now(),
    );
}
export function sessionsFor(childId: string): LearningSession[] {
  return all<{ data: string }>(
    "SELECT data FROM learning_sessions WHERE child_id=? ORDER BY created_at DESC",
    childId,
  ).map((r) => JSON.parse(r.data));
}
export function sessionById(id: string): LearningSession {
  const row = one<{ data: string }>(
    "SELECT data FROM learning_sessions WHERE id=?",
    id,
  );
  if (!row) throw new HttpError(404, "Lesson not found.");
  return JSON.parse(row.data);
}
export function saveSession(s: LearningSession) {
  run(
    "INSERT INTO learning_sessions VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,data=excluded.data,completed_at=excluded.completed_at",
    s.id,
    s.childId,
    s.state,
    JSON.stringify(s),
    s.startedAt,
    s.completedAt,
  );
}
export function event(
  s: LearningSession,
  type: string,
  metadata: Record<string, unknown> = {},
) {
  run(
    "INSERT INTO session_events VALUES(?,?,?,?,?,?)",
    randomUUID(),
    s.id,
    s.childId,
    type,
    JSON.stringify(metadata),
    now(),
  );
}
export function eventsFor(childId: string): SessionEvent[] {
  return all<{
    id: string;
    session_id: string;
    child_id: string;
    type: string;
    metadata: string;
    created_at: string;
  }>(
    "SELECT * FROM session_events WHERE child_id=? ORDER BY created_at DESC LIMIT 250",
    childId,
  ).map((e) => ({
    id: e.id,
    sessionId: e.session_id,
    childId: e.child_id,
    type: e.type,
    metadata: JSON.parse(e.metadata),
    createdAt: e.created_at,
  }));
}
