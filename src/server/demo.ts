import { concepts } from "../lib/curriculum";
import {
  emptyLearner,
  initialState,
  updateMastery,
  updateStrategy,
} from "../lib/learning";
import { createChild, saveLearner } from "./repository";
import { run, transaction } from "./db";
export function seedChildren(parentId: string) {
  return transaction(() =>
    ["Maya", "Adam", "Sofia"].map((nickname, index) => {
      const child = createChild(parentId, {
          nickname,
          age: 9,
          grade: 4,
          goal: "Build confidence",
        }),
        learner = emptyLearner();
      for (const concept of concepts.filter(
        (c) =>
          c.domain !== "Fractions" ||
          [
            "equal_parts",
            "fraction_meaning",
            "numerator",
            "denominator",
            "unit_fractions",
          ].includes(c.id),
      )) {
        let s = initialState(child.id, concept.id);
        for (let i = 0; i < 7; i++)
          s = updateMastery(
            s,
            true,
            0,
            false,
            "symbolic_first",
            `${concept.id}:demo-${i}`,
            "seed-history",
            new Date(Date.now() - 86400000 * (8 - i)),
          );
        learner.states[concept.id] = s;
      }
      let target = initialState(child.id, "equivalent_fractions");
      target = updateMastery(
        target,
        true,
        1,
        false,
        "symbolic_first",
        "equivalent_fractions:demo",
        "seed-history",
      );
      target.masteryScore = 0.42;
      learner.states.equivalent_fractions = target;
      if (index === 0) {
        for (let i = 0; i < 5; i++) {
          const idx = learner.strategies.findIndex(
            (e) => e.strategyId === "visual_fraction_model",
          );
          const e = updateStrategy(
            idx < 0 ? undefined : learner.strategies[idx],
            child.id,
            "visual_fraction_model",
            "Fractions",
            true,
            0.04,
          );
          if (idx < 0) learner.strategies.push(e);
          else learner.strategies[idx] = e;
        }
        learner.strategies.push(
          updateStrategy(
            undefined,
            child.id,
            "symbolic_first",
            "Fractions",
            false,
            -0.04,
          ),
        );
      }
      if (index === 2)
        learner.misconceptions.push({
          childId: child.id,
          id: "different_means_unequal",
          conceptId: "equivalent_fractions",
          matches: 1,
          checks: 1,
          confidence: 0.45,
          confirmed: false,
          questionIds: ["equivalent_fractions:demo"],
        });
      saveLearner(child.id, learner);
      run("UPDATE children SET diagnostic_complete=1 WHERE id=?", child.id);
      return child;
    }),
  );
}
