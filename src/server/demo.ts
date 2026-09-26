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
          subjects: ["Math", "English", "Science", "Social Studies"],
        }),
        learner = emptyLearner();
      const secured = concepts.filter(
        (c) =>
          !c.id.startsWith("g") &&
          (c.domain !== "Fractions" ||
            [
              "equal_parts",
              "fraction_meaning",
              "numerator",
              "denominator",
              "unit_fractions",
            ].includes(c.id)),
      );
      for (const [order, concept] of secured.entries()) {
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
        // Stagger reviews into the future in curriculum order. The loop
        // above otherwise leaves every mastered concept due within the same
        // millisecond, so the first lesson target would depend on seed
        // timing instead of opening on the in-progress concept.
        s.nextReviewAt = new Date(
          Date.now() + (order + 2) * 86400000,
        ).toISOString();
        // The main demo opens on Math. Other subject evidence is deliberately
        // newer so the existing "stale subject first" planner chooses Math,
        // while the explicit subject tiles still demonstrate all four areas.
        if (concept.subject === "Math")
          s.lastPracticedAt = new Date(
            Date.now() - 30 * 86400000,
          ).toISOString();
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
      target.lastPracticedAt = new Date(
        Date.now() - 20 * 86400000,
      ).toISOString();
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
          id: "denominator_magnitude",
          conceptId: "compare_same_numerator",
          matches: 1,
          checks: 1,
          confidence: 0.45,
          confirmed: false,
          questionIds: ["compare_same_numerator:demo"],
          status: "suspected",
          lastObservedAt: new Date().toISOString(),
          resolvedAt: null,
          evidence: [],
        });
      // Every demo child has real footholds outside Math so the subjects,
      // debugger, and parent views have something honest to show. Evidence
      // stays subject-specific: Maya's Science wins use guided questions,
      // deliberately different from her Math visual preference.
      for (const [skillId, strategy, assistance] of [
        ["ela_reading_inference", "guided_questioning", 1],
        ["science_energy_forms", "guided_questioning", 1],
      ] as const) {
        let s = initialState(child.id, skillId);
        for (let i = 0; i < 3; i++)
          s = updateMastery(
            s,
            true,
            assistance,
            false,
            strategy,
            `${skillId}:demo-${i}`,
            "seed-history",
            new Date(Date.now() - 86400000 * (3 - i)),
          );
        learner.states[skillId] = s;
      }
      if (index === 0) {
        let e = updateStrategy(
          undefined,
          child.id,
          "guided_questioning",
          "Energy",
          true,
          0.04,
          new Date(),
          "Science",
        );
        for (let i = 0; i < 3; i++)
          e = updateStrategy(
            e,
            child.id,
            e.strategyId,
            e.conceptDomain,
            true,
            0.04,
          );
        learner.strategies.push(e);
      }
      if (index === 1) {
        learner.states.multiplication_by_4.masteryScore = 0.92;
        let s = initialState(child.id, "social_map_skills");
        for (let i = 0; i < 3; i++)
          s = updateMastery(
            s,
            true,
            0,
            false,
            "symbolic_first",
            `social_map_skills:demo-${i}`,
            "seed-history",
            new Date(Date.now() - 86400000 * (3 - i)),
          );
        learner.states.social_map_skills = s;
      }
      if (index === 2)
        learner.misconceptions.push({
          childId: child.id,
          id: "energy_used_up",
          conceptId: "science_energy_forms",
          matches: 1,
          checks: 1,
          confidence: 0.45,
          confirmed: false,
          questionIds: ["science_energy_forms:demo"],
          status: "suspected",
          lastObservedAt: new Date().toISOString(),
          resolvedAt: null,
          evidence: [],
        });
      saveLearner(child.id, learner);
      run("UPDATE children SET diagnostic_complete=1 WHERE id=?", child.id);
      return child;
    }),
  );
}
