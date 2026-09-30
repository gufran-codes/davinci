import { concepts, conceptById } from "./curriculum";
import type { Child, Learner, LearnerConceptState } from "./types";
import { strategyNames } from "./types";
export const parentLevels = [
  "Not started",
  "Starting",
  "Developing",
  "Secure",
  "Strong",
] as const;
export type ParentLevel = (typeof parentLevels)[number];
export function parentSkillLevel(state?: LearnerConceptState): ParentLevel {
  if (!state?.evidence.length) return "Not started";
  const recent = state.evidence.slice(-3);
  if (
    state.masteryScore >= 0.9 &&
    state.successfulIndependentAttempts >= 5 &&
    recent.every((e) => e.correct && e.assistance === 0) &&
    state.evidence.some((e) => e.outcome === "transfer_success")
  )
    return "Strong";
  if (state.masteryScore >= 0.75 && state.successfulIndependentAttempts >= 3)
    return "Secure";
  return state.masteryScore >= 0.4 ? "Developing" : "Starting";
}
export function parentSkills(child: Child, learner: Learner) {
  return concepts.filter(
    (c) =>
      Boolean(learner.states[c.id]?.evidence.length) ||
      ((child.subjects ?? ["Math"]).includes(c.subject) &&
        c.gradeBand[0] <= child.grade &&
        c.gradeBand[1] >= child.grade),
  );
}
export function parentObservations(child: Child, learner: Learner) {
  const observations: {
    id: string;
    text: string;
    evidence: string[];
    implication: string;
  }[] = [];
  for (const state of Object.values(learner.states)) {
    const skill = conceptById[state.conceptId];
    if (!skill) continue;
    const recent = state.evidence.slice(-3);
    const supported = state.evidence
      .slice(0, -3)
      .filter((e) => e.correct && e.assistance > 0);
    if (
      supported.length &&
      recent.length >= 2 &&
      recent.filter((e) => e.correct && e.assistance === 0).length >= 2
    ) {
      observations.push({
        id: `fade:${skill.id}`,
        text: `${child.nickname} previously needed help with ${skill.name.toLowerCase()} and has now answered at least two of the last three questions independently.`,
        evidence: [...supported.slice(-1), ...recent].map(
          (e) =>
            `${e.at.slice(0, 10)} · ${e.questionId} · ${e.correct ? "correct" : "still practicing"} ${e.assistance ? "with help" : "without help"}`,
        ),
        implication:
          "Da Vinci will check this again with less support and a fresh example.",
      });
    }
  }
  for (const strategy of learner.strategies
    .filter(
      (s) =>
        s.attempts >= 3 &&
        s.successfulOutcomes / s.attempts >= 0.65 &&
        s.evidence.length >= 3,
    )
    .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))) {
    observations.push({
      id: `strategy:${strategy.strategyId}:${strategy.subject}:${strategy.conceptDomain}`,
      text: `${strategyNames[strategy.strategyId]} have recently been followed by successful responses in ${strategy.conceptDomain.toLowerCase()}.`,
      evidence: strategy.evidence
        .slice(-4)
        .map(
          (e) =>
            `${e.at.slice(0, 10)} · ${conceptById[e.skillId ?? ""]?.name ?? strategy.conceptDomain} · ${e.correct ? "successful response" : "needs more practice"}`,
        ),
      implication:
        "This is a useful approach to try again; independent checks will show whether the learning lasts.",
    });
  }
  return observations.slice(0, 3);
}
export function progressDays(learner: Learner) {
  const days = new Map<
    string,
    {
      day: string;
      independent: number;
      assisted: number;
      needsPractice: number;
    }
  >();
  for (const state of Object.values(learner.states))
    for (const e of state.evidence) {
      const day = e.at.slice(0, 10);
      const row = days.get(day) ?? {
        day,
        independent: 0,
        assisted: 0,
        needsPractice: 0,
      };
      if (!e.correct) row.needsPractice++;
      else if (e.assistance > 0) row.assisted++;
      else row.independent++;
      days.set(day, row);
    }
  return [...days.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-7);
}
