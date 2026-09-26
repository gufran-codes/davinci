import type { Learner, Question, Strategy, Subject } from "../types";
import type { ConversationSignals } from "./types";
export type Representation =
  | "symbols"
  | "quantity"
  | "objects"
  | "language"
  | "diagram"
  | "evidence"
  | "recall";
export interface StrategyDefinition {
  id: Strategy;
  representation: Representation;
  abstraction: 0 | 1 | 2;
  participation: "explain" | "explore" | "solve" | "listen";
  subjects: Subject[];
  support: number;
}
const all: Subject[] = ["Math", "English", "Science", "Social Studies"];
const make = (
  id: Strategy,
  representation: Representation,
  abstraction: 0 | 1 | 2,
  participation: StrategyDefinition["participation"],
  support: number,
  subjects = all,
): StrategyDefinition => ({
  id,
  representation,
  abstraction,
  participation,
  subjects,
  support,
});
export const strategyLibrary: StrategyDefinition[] = [
  make("symbolic_first", "symbols", 2, "solve", 0, ["Math"]),
  make("visual_fraction_model", "quantity", 1, "explore", 1, ["Math"]),
  make("guided_questioning", "language", 1, "explain", 1),
  make("concrete_real_world_example", "objects", 0, "explore", 2),
  make("worked_example", "symbols", 1, "listen", 4),
  make("pattern_discovery", "symbols", 1, "explore", 1),
  make("prerequisite_review", "objects", 0, "solve", 5),
  make("step_by_step_scaffold", "language", 1, "solve", 3),
  make("partial_worked_example", "symbols", 1, "solve", 3),
  make("analogy", "objects", 0, "explain", 2),
  make("compare_contrast", "evidence", 1, "explore", 1),
  make("error_analysis", "evidence", 2, "explain", 1),
  make("teach_back", "recall", 2, "explain", 0),
  make("simplified_case", "objects", 0, "solve", 2),
  make("progressive_complexity", "symbols", 1, "solve", 1),
  make("manipulative", "objects", 0, "explore", 2, ["Math", "Science"]),
  make("story_context", "language", 0, "explore", 2),
  make("diagram_first", "diagram", 1, "explore", 1, [
    "Math",
    "Science",
    "Social Studies",
  ]),
  make("evidence_first", "evidence", 1, "explain", 1, [
    "English",
    "Science",
    "Social Studies",
  ]),
  make("guided_annotation", "evidence", 1, "explore", 2, [
    "English",
    "Science",
    "Social Studies",
  ]),
  make("retrieval_practice", "recall", 2, "solve", 0),
  make("transfer_problem", "recall", 2, "solve", 0),
  make("example_non_example", "evidence", 1, "explore", 2),
  make("concrete_to_abstract", "objects", 0, "explore", 2),
];
export function rankStrategies({
  learner,
  subject,
  domain,
  current,
  signals,
  question,
  mastery,
  age = 9,
}: {
  learner: Learner;
  subject: Subject;
  domain: string;
  current: Strategy;
  signals: ConversationSignals;
  question: Question;
  mastery: number;
  age?: number;
}) {
  const prior = strategyLibrary.find((s) => s.id === current)!;
  return strategyLibrary
    .filter(
      (s) =>
        s.subjects.includes(subject) &&
        s.id !== current &&
        !((signals.strategyFailures[s.id] ?? 0) > 0) &&
        !(
          s.id === "visual_fraction_model" &&
          !question.visuals.some((v) =>
            [
              "fraction_bar",
              "comparison",
              "array",
              "number_line",
              "counters",
            ].includes(v.type),
          )
        ),
    )
    .map((s) => {
      const e = learner.strategies.find(
        (e) =>
          e.strategyId === s.id &&
          (!e.subject || e.subject === subject) &&
          e.conceptDomain === domain,
      );
      const rate = e ? (e.successfulOutcomes + 1) / (e.attempts + 2) : 0.5;
      let score =
        rate * 4 +
        (s.representation !== prior.representation ? 2 : 0) +
        (s.participation !== prior.participation ? 0.5 : 0) -
        (signals.attemptedStrategies.includes(s.id) ? 4 : 0) -
        (signals.strategyFailures[s.id] ?? 0) * 3;
      if (mastery < 0.4) score += s.abstraction === 0 ? 1 : 0;
      if (age <= 8 && s.abstraction === 0) score += 0.4;
      if (signals.frustration >= 2 && s.support >= 2) score += 1;
      if (signals.confidence === "low" && s.participation === "explore")
        score += 0.4;
      if (signals.paceMs > 15000 && s.support >= 2) score += 0.5;
      if (signals.supportSuccesses >= 2 && s.support === 0) score += 3;
      if (mastery < 0.65 && s.support === 0) score -= 3;
      if (s.id === "prerequisite_review") score -= 2; // Traversal is selected explicitly after repeated confusion.
      if (current === "symbolic_first" && s.id === "visual_fraction_model")
        score += 2;
      if (
        current === "visual_fraction_model" &&
        s.id === "concrete_real_world_example"
      )
        score += 1;
      return {
        ...s,
        score,
        evidenceAttempts: e?.attempts ?? 0,
        reason: e
          ? `${e.successfulOutcomes}/${e.attempts} successful recent outcomes; changes ${prior.representation} to ${s.representation}.`
          : `Changes ${prior.representation} to ${s.representation}, with ${s.participation} participation.`,
      };
    })
    .sort((a, b) => b.score - a.score);
}
export function freshSignals(): ConversationSignals {
  return {
    confusion: 0,
    frustration: 0,
    confidence: "unknown",
    hintCount: 0,
    paceMs: 0,
    attemptedStrategies: [],
    strategyFailures: {},
    supportSuccesses: 0,
    independentSuccesses: 0,
  };
}
