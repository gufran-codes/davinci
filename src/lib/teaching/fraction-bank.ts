import type { Question } from "../types";
// Independently authored template aligned to CCSS 4.NF.A.1. All bars refer
// to equal-sized wholes; variant arithmetic and distractors are deterministic.
export function equivalenceQuestion(seed: number, transfer: boolean): Question {
  const denominators = [2, 3, 4, 5, 6, 8],
    d = denominators[Math.abs(seed) % denominators.length],
    factor = transfer ? 3 : 2;
  const numerator = 1,
    scaled = numerator * factor,
    denominator = d * factor;
  const wrongOne = `1/${denominator}`,
    correct = `${scaled}/${denominator}`,
    additive = `${1 + factor}/${d + factor}`,
    wrongAmount = `${scaled + 1}/${denominator}`;
  const choices = [wrongOne, correct, additive, wrongAmount];
  // For 1/2, keep the exact diagnostic choices from the product scenario.
  if (d === 2 && !transfer) choices.splice(0, 4, "1/4", "2/4", "2/3", "3/4");
  return {
    id: `equivalent_fractions:${seed}`,
    assessmentKey: `equivalent_fractions:d${d}:f${factor}`,
    conceptId: "equivalent_fractions",
    subject: "Math",
    prompt: transfer
      ? `A ribbon has 1/${d} of its length colored. Each of its ${d} equal sections is split into ${factor} equal pieces. What fraction of the ribbon is colored now?`
      : `Which fraction is equal to 1/${d}?`,
    answer: correct,
    choices,
    transfer,
    explanation: `Split each of the ${d} equal parts into ${factor}. The whole has ${denominator} smaller parts, and the colored part becomes ${scaled} parts. So 1/${d} = ${correct}; the amount has not changed.`,
    hint: "Compare equal-sized wholes. What changes when each part is split?",
    concrete:
      "Fold the same strip of paper into smaller equal parts without changing the colored amount.",
    visuals: [{ type: "fraction_bar", numerator: 1, denominator: d }],
    misconception: { id: "scale_only_one", answer: wrongOne },
    options: choices.map((content, i) => ({
      id: String.fromCharCode(65 + i),
      content,
      correct: i === 1,
      misconceptionId:
        i === 0
          ? "scale_only_one"
          : i === 2
            ? "different_means_unequal"
            : undefined,
      diagnosticMeaning:
        i === 0
          ? "Changes the denominator without preserving the selected quantity."
          : i === 2
            ? "Changes numerator and denominator additively instead of scaling both."
            : i === 3
              ? "Counts an extra colored part; probe the whole and selected parts."
              : "Preserves the amount by scaling both counts.",
    })),
    qualityStatus: "authored",
  };
}
