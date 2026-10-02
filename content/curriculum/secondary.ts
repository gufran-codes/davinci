import { secondaryMath } from "./secondary-math";
import { secondaryLiteracy } from "./secondary-literacy";
import { secondaryInquiry } from "./secondary-inquiry";
import review from "./secondary-review.json";
import type { SkillContent } from "./schema";

const reviews = review as Record<
  string,
  { status: SkillContent["status"]; reviewer: string }
>;
const prerequisites: Record<string, string[]> = {
  g7_english_theme: ["g6_english_evidence"],
  g7_english_argument: ["g6_english_claims"],
  g7_english_revision: ["g6_english_claims"],
  g8_english_character: ["g7_english_theme"],
  g8_english_conflicting_sources: ["g7_english_argument"],
  g8_english_counterclaims: ["g7_english_argument"],
  g9_english_literary_evidence: ["g8_english_character"],
  g9_english_rhetoric: ["g7_english_argument"],
  g9_english_research: ["g8_english_conflicting_sources"],
  g10_english_theme_development: ["g9_english_literary_evidence"],
  g10_english_argument_validity: ["g9_english_rhetoric"],
  g10_english_synthesis: ["g9_english_research"],
  g10_english_connotation: ["g6_english_context"],
  g7_science_reactions: ["g6_science_particles"],
  g7_science_photosynthesis: ["g6_science_cells", "g6_science_ecosystems"],
  g8_science_selection: ["g6_science_ecosystems"],
  g9_science_cell_systems: ["g6_science_cells"],
  g9_science_carbon: ["g7_science_photosynthesis"],
  g9_science_evolution: ["g8_science_selection", "g9_science_genetics"],
  g10_science_atoms: ["g6_science_particles"],
  g10_science_conservation: ["g7_science_reactions", "g10_science_atoms"],
  g10_science_reaction_energy: ["g7_science_reactions"],
  g10_science_motion_energy: ["g7_science_forces"],
  g7_social_studies_trade: ["g6_social_studies_scarcity"],
  g7_social_studies_perspective: ["g6_social_studies_sources"],
  g7_social_studies_government: ["g6_social_studies_civic_rules"],
  g7_social_studies_migration: ["g6_social_studies_geography"],
  g8_social_studies_constitution: ["g7_social_studies_government"],
  g8_social_studies_historical_causes: ["g7_social_studies_perspective"],
  g8_social_studies_rights: ["g6_social_studies_civic_rules"],
  g8_social_studies_economic_change: ["g7_social_studies_trade"],
  g9_social_studies_corroboration: ["g7_social_studies_perspective"],
  g9_social_studies_revolutions: ["g8_social_studies_historical_causes"],
  g9_social_studies_markets: ["g6_social_studies_scarcity"],
  g9_social_studies_global_networks: [
    "g7_social_studies_trade",
    "g7_social_studies_migration",
  ],
  g10_social_studies_historical_argument: ["g9_social_studies_corroboration"],
  g10_social_studies_policy: ["g8_social_studies_rights"],
  g10_social_studies_externalities: ["g9_social_studies_markets"],
  g10_social_studies_data_claims: ["g9_social_studies_corroboration"],
};
export const secondaryCurriculum: SkillContent[] = [
  ...secondaryMath,
  ...secondaryLiteracy,
  ...secondaryInquiry,
]
  .map((skill) => ({
    ...skill,
    questions: skill.questions.map((q) =>
      skill.id === "g9_math_inequalities"
        ? { ...q, choices: [q.answer, q.answer.replace(">", "<")] }
        : q,
    ),
  }))
  .map((skill) => ({
    ...skill,
    sourceId: "davinci-us-secondary-v1",
    prerequisites: prerequisites[skill.id] ?? skill.prerequisites,
    courseId:
      skill.grade < 9
        ? null
        : skill.subject === "English"
          ? `english-${skill.grade - 8}`
          : skill.domain === "Algebra I"
            ? "algebra-1"
            : skill.domain === "Geometry"
              ? "geometry"
              : skill.domain === "Biology"
                ? "biology"
                : skill.domain === "Chemistry"
                  ? "chemistry"
                  : skill.domain === "Civics"
                    ? "civics"
                    : skill.domain === "World history"
                      ? "world-history"
                      : null,
    ...(reviews[skill.id] ?? {}),
    misconceptions: skill.questions.flatMap((q, i) =>
      q.choices
        ? [
            {
              id: `${skill.id}:contrast:${i}`,
              name: `${skill.name}: evidence contrast ${i + 1}`,
              wrongAnswer: q.choices.find((c) => c !== q.answer)!,
              verification: q.explanation,
              remediation: ["compare_contrast", "evidence_first"],
            },
          ]
        : [],
    ),
    questions: skill.questions.map((q, i) => ({
      ...q,
      ...(q.choices
        ? {
            misconception: {
              id: `${skill.id}:contrast:${i}`,
              answer: q.choices.find((c) => c !== q.answer)!,
            },
          }
        : {}),
    })),
  }));
