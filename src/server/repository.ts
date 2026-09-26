import { randomUUID } from "node:crypto";
import {
  Child,
  Learner,
  LearningSession,
  RecentLearningMemory,
  SessionEvent,
  Subject,
} from "../lib/types";
import { strengthsFor } from "../lib/learning";
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
const subjectsOf = (row: { subjects?: string }): Subject[] => {
  try {
    const parsed = JSON.parse(row.subjects ?? '["Math"]');
    return Array.isArray(parsed) && parsed.length ? parsed : ["Math"];
  } catch {
    return ["Math"];
  }
};
export function childrenFor(parentId: string) {
  return all<Child & { subjects: string }>(
    "SELECT id,parent_id AS parentId,nickname,age,grade,goal,subjects,diagnostic_complete AS diagnosticComplete,created_at AS createdAt FROM children WHERE parent_id=? ORDER BY created_at",
    parentId,
  ).map((c) => ({
    ...c,
    subjects: subjectsOf(c),
    diagnosticComplete: !!c.diagnosticComplete,
  }));
}
export function ownedChild(parentId: string, id: string): Child {
  const c = childrenFor(parentId).find((c) => c.id === id);
  if (!c) throw new HttpError(404, "Child profile not found.");
  return c;
}
export function createChild(
  parentId: string,
  data: {
    nickname: string;
    age: number;
    grade: number;
    goal: string;
    subjects?: Subject[];
  },
) {
  const id = randomUUID();
  run(
    "INSERT INTO children(id,parent_id,nickname,age,grade,goal,subjects,created_at) VALUES(?,?,?,?,?,?,?,?)",
    id,
    parentId,
    data.nickname,
    data.age,
    data.grade,
    data.goal,
    JSON.stringify(data.subjects?.length ? data.subjects : ["Math"]),
    now(),
  );
  return ownedChild(parentId, id);
}
export function learnerFor(childId: string): Learner {
  const states = all<{ data: string }>(
    "SELECT data FROM learner_concept_states WHERE child_id=?",
    childId,
  ).map((r) => JSON.parse(r.data));
  const learner: Learner = {
    states: Object.fromEntries(
      states.map((s) => [
        s.conceptId,
        {
          ...s,
          lastDemonstratedAt: s.lastDemonstratedAt ?? s.lastMasteredAt ?? null,
          evidence: s.evidence ?? [],
        },
      ]),
    ),
    strategies: all<{ data: string }>(
      "SELECT data FROM teaching_strategy_evidence WHERE child_id=?",
      childId,
    ).map((r) => {
      const value = JSON.parse(r.data);
      return {
        ...value,
        skillOutcomes: value.skillOutcomes ?? {},
        evidence: value.evidence ?? [],
      };
    }),
    misconceptions: all<{ data: string }>(
      "SELECT data FROM learner_misconception_states WHERE child_id=?",
      childId,
    ).map((r) => {
      const value = JSON.parse(r.data);
      return {
        ...value,
        status: value.status ?? (value.confirmed ? "confirmed" : "suspected"),
        lastObservedAt: value.lastObservedAt ?? null,
        resolvedAt: value.resolvedAt ?? null,
        evidence: value.evidence ?? [],
      };
    }),
    strengths: all<{ data: string }>(
      "SELECT data FROM learner_strengths WHERE child_id=?",
      childId,
    ).map((r) => JSON.parse(r.data)),
    recentLearning: all<{
      id: string;
      child_id: string;
      session_id: string;
      skill_id: string;
      kind: RecentLearningMemory["kind"];
      summary: string;
      evidence: string;
      created_at: string;
    }>(
      "SELECT * FROM recent_learning_memory WHERE child_id=? ORDER BY created_at DESC LIMIT 30",
      childId,
    ).map((row) => ({
      id: row.id,
      childId: row.child_id,
      sessionId: row.session_id,
      skillId: row.skill_id,
      kind: row.kind,
      summary: row.summary,
      evidence: JSON.parse(row.evidence),
      createdAt: row.created_at,
    })),
  };
  if (!learner.strengths.length) learner.strengths = strengthsFor(learner);
  return learner;
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
      "INSERT INTO teaching_strategy_evidence VALUES(?,?,?,?,?,?) ON CONFLICT(child_id,strategy_id,subject,domain) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
      childId,
      e.strategyId,
      e.subject ?? "",
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
  l.strengths = strengthsFor(l);
  // Strengths are derived from current evidence, so remove records that no
  // longer meet the threshold before writing the new snapshot.
  run("DELETE FROM learner_strengths WHERE child_id=?", childId);
  for (const strength of l.strengths)
    run(
      "INSERT INTO learner_strengths VALUES(?,?,?,?) ON CONFLICT(child_id,skill_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
      childId,
      strength.skillId,
      JSON.stringify(strength),
      now(),
    );
}
function normalizedSession(value: LearningSession): LearningSession {
  const decision = value.decision as LearningSession["decision"] & {
    difficulty?: number | "introduce" | "practice" | "transfer";
  };
  const band =
    decision.difficultyBand ??
    (typeof decision.difficulty === "string"
      ? decision.difficulty
      : decision.nextAssessmentType === "transfer" ||
          decision.nextAssessmentType === "teachback"
        ? "transfer"
        : decision.nextAssessmentType === "probe"
          ? "introduce"
          : "practice");
  return {
    ...value,
    decision: {
      ...decision,
      targetSkillId: decision.targetSkillId ?? decision.targetConceptId,
      strategyId: decision.strategyId ?? decision.strategy,
      pedagogicalMove:
        decision.pedagogicalMove ??
        (decision.shouldProbePrerequisite
          ? "review_prerequisite"
          : decision.misconceptionToTest
            ? "probe"
            : band === "transfer"
              ? "check_understanding"
              : "explain"),
      misconceptionToProbe:
        decision.misconceptionToProbe ?? decision.misconceptionToTest,
      difficulty:
        typeof decision.difficulty === "number"
          ? decision.difficulty
          : band === "introduce"
            ? 1
            : band === "practice"
              ? 2
              : 3,
      difficultyBand: band,
      alternativesConsidered: decision.alternativesConsidered ?? [],
    },
  };
}
export function recordLearningMemory(
  s: LearningSession,
  kind: RecentLearningMemory["kind"],
  summary: string,
  evidence: Record<string, unknown>,
) {
  run(
    "INSERT INTO recent_learning_memory VALUES(?,?,?,?,?,?,?,?)",
    randomUUID(),
    s.childId,
    s.id,
    s.question.conceptId,
    kind,
    summary,
    JSON.stringify(evidence),
    now(),
  );
}
export function sessionsFor(childId: string): LearningSession[] {
  return all<{ data: string }>(
    "SELECT data FROM learning_sessions WHERE child_id=? ORDER BY created_at DESC",
    childId,
  ).map((r) => normalizedSession(JSON.parse(r.data)));
}
export function sessionById(id: string): LearningSession {
  const row = one<{ data: string }>(
    "SELECT data FROM learning_sessions WHERE id=?",
    id,
  );
  if (!row) throw new HttpError(404, "Lesson not found.");
  return normalizedSession(JSON.parse(row.data));
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
