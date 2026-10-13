import type { Question } from "../types";
import { parseMath } from "../math";

/** Checked relationships supplied to the language model, not a model-generated
 * proof. Mappings describe an imagined representation, never a visible diagram. */
export interface ExplanationStructure {
  mechanism: string;
  relationship: string;
  mappings: { representation: string; meaning: string }[];
  steps: string[];
  boundary: string;
}

export function explanationStructure(
  q: Question,
  approach: string,
): ExplanationStructure {
  const bar = q.visuals.find((v) => v.type === "fraction_bar");
  const comparison = q.visuals.find((v) => v.type === "comparison");
  if (
    q.subject === "Math" &&
    (bar || comparison) &&
    /equivalent|generate_equivalent|common_denominator|simplifying/.test(
      q.conceptId,
    )
  ) {
    const a = bar?.numerator ?? comparison!.a;
    const b = bar?.denominator ?? comparison!.b;
    const algebraic = approach === "scale-both";
    const concrete = approach === "regroup";
    return {
      mechanism: algebraic
        ? "multiplicative-identity"
        : concrete
          ? "conservation-of-quantity"
          : "partition-and-count",
      relationship:
        "The selected share is unchanged when every part of the same whole is subdivided equally.",
      mappings: [
        {
          representation: concrete
            ? "one entire chocolate bar"
            : "one entire bar",
          meaning: "the fixed whole, not one small piece",
        },
        {
          representation: `${b} equal pieces`,
          meaning: "the denominator counts all equal pieces in that whole",
        },
        {
          representation: `${a} selected ${a === 1 ? "piece" : "pieces"}`,
          meaning: "the numerator counts the selected pieces of that size",
        },
        {
          representation: "splitting every piece by the same factor",
          meaning: "both counts change together; the amount selected does not",
        },
      ],
      steps: algebraic
        ? [
            "A nonzero factor divided by itself equals one.",
            "Multiplying the numerator and denominator by that factor multiplies the fraction by one, leaving its value unchanged.",
          ]
        : concrete
          ? [
              "Imagine breaking the chocolate without eating or adding any.",
              "Each owned piece breaks just as the unowned pieces do. There are more, smaller pieces, but the same chocolate is yours.",
            ]
          : [
              "Keep the outside boundary and the selected area fixed.",
              "Split every part equally, including each selected part. Count pieces, not a newly enlarged whole.",
            ],
      boundary:
        "This requires equal subdivisions and the same-sized whole. Changing only one count does not preserve the share.",
    };
  }
  const equation =
    q.subject === "Math" && q.prompt.match(/^Solve (\d*)x \+ (\d+) = (\d+)\./);
  if (equation) {
    const coefficient = Number(equation[1] || 1),
      constant = Number(equation[2]),
      total = Number(equation[3]);
    if (
      coefficient > 0 &&
      (total - constant) / coefficient === parseMath(q.answer)
    ) {
      return {
        mechanism:
          approach === "undo"
            ? "inverse-operations"
            : approach === "substitution-check"
              ? "test-equality"
              : "equal-totals-mapping",
        relationship:
          "Both expressions name the same total; the same reversible operation preserves that equality.",
        mappings: [
          {
            representation: "x",
            meaning:
              "the unknown number of items in one equal group, not the entire total",
          },
          {
            representation: `${coefficient}x`,
            meaning: `${coefficient} equal groups, each containing that unknown amount`,
          },
          {
            representation: `+ ${constant}`,
            meaning: `${constant} extra known items outside those groups`,
          },
          {
            representation: `= ${total}`,
            meaning: `the groups and extra items together equal the known total ${total}`,
          },
        ],
        steps:
          approach === "substitution-check"
            ? [
                "Replace x with a proposed value in the original expression.",
                "Compare the resulting left total with the right total; equality is the test, not which side a symbol appears on.",
              ]
            : [
                `Remove the ${constant} extra items from both equal totals. This cancels the added items while keeping the totals equal.`,
                coefficient > 1
                  ? `The remaining total contains ${coefficient} equal unknown groups. Dividing both sides by ${coefficient} gives the amount in one group.`
                  : "The remaining left side is the unknown group itself.",
              ],
        boundary:
          "The representation assumes equal-sized groups. Do not compute or disclose the active answer; use a separate example for a full solution.",
      };
    }
  }
  const array =
    q.subject === "Math" && q.visuals.find((v) => v.type === "array");
  if (array)
    return {
      mechanism:
        approach === "turn-array"
          ? "rearrangement-invariance"
          : approach === "break-apart"
            ? "decomposition"
            : "equal-groups",
      relationship:
        "Equal groups can be counted, decomposed or rearranged without changing which objects belong to the total.",
      mappings: [
        {
          representation: `${array.rows} rows`,
          meaning: "the number of equal groups",
        },
        {
          representation: `${array.columns} objects per row`,
          meaning: "the equal amount in each group",
        },
      ],
      steps:
        approach === "turn-array"
          ? ["Exchange rows and columns without adding or removing objects."]
          : approach === "break-apart"
            ? [
                "Separate one group from the others, then join the two counts again.",
              ]
            : [
                "Count one group; repeated addition counts each equal group once.",
              ],
      boundary:
        "Equal group size matters. This does not justify multiplying counts of unequal groups.",
    };
  return {
    mechanism: approach,
    relationship: q.hint,
    mappings: [],
    steps: [q.hint],
    boundary:
      "Use the supplied task and source only. No checked analogy mapping is available; do not invent one or claim a diagram is visible.",
  };
}
