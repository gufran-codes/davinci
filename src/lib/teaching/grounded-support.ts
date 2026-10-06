import type { Question, Strategy, Visual } from "../types";

export interface SupportPlan {
  id: string;
  strategy: Strategy;
  message: string;
  prompt: string;
  visuals: Visual[];
}

// Alternatives are concrete teaching moves, not a rotation of strategy labels.
// Every displayed quantity comes from the task or an explicitly separate example.
export function supportPlans(q: Question, example: Question): SupportPlan[] {
  const plans: SupportPlan[] = [];
  const add = (
    id: string,
    strategy: Strategy,
    message: string,
    prompt: string,
    visuals: Visual[] = [],
  ) => plans.push({ id, strategy, message, prompt, visuals });
  const comparison = q.visuals.find((v) => v.type === "comparison");
  const bar = q.visuals.find((v) => v.type === "fraction_bar");
  const array = q.visuals.find((v) => v.type === "array");
  const equation =
    q.subject === "Math"
      ? q.prompt.match(/Solve ((?:\d+)?x \+ (\d+) = (?:\d+x \+ )?\d+)/)
      : null;
  const fractions = q.subject === "Math" && (comparison || bar);
  if (equation) {
    const model: Visual[] = [{ type: "equation", equation: equation[1] }];
    add(
      "balance",
      "concrete_real_world_example",
      `The equals sign is a balance: both sides have the same value. Removing ${equation[2]} from just one side would break that balance; remove it from both.`,
      "Which term would that remove, and what would remain on each side?",
      model,
    );
    add(
      "undo",
      "symbolic_first",
      q.hint,
      "Which operation should we undo first to isolate the variable?",
      model,
    );
    add(
      "substitution-check",
      "error_analysis",
      "A candidate answer must make the original left and right sides equal. Substitute a value you want to test into each side and compare; an unequal result tells us that value does not work.",
      "What value would you like to test, and what does each side become?",
      model,
    );
  } else if (fractions) {
    const a = comparison?.a ?? bar!.numerator;
    const b = comparison?.b ?? bar!.denominator;
    const adding = /adding|subtracting/.test(q.conceptId);
    const equivalent = /equivalent|common_denominator|simplifying/.test(
      q.conceptId,
    );
    if (adding && comparison) {
      add(
        "same-unit",
        "visual_fraction_model",
        `These bars represent equally sized wholes. The pieces are ${b === comparison.d ? "already the same size" : `different sizes: ${b} pieces in one whole and ${comparison.d} in the other`}. We can only count them together after using the same unit.`,
        "Do we need to change the piece size before combining the counts?",
        [comparison],
      );
      add(
        "rename",
        "symbolic_first",
        q.hint,
        "Which denominator could name equal-sized pieces in both fractions?",
      );
      add(
        "unit-error",
        "error_analysis",
        "Adding the bottom numbers changes the unit, like calling apples and baskets the same thing. Rename the fractions first; then combine or remove pieces while keeping their size fixed.",
        "When we combine pieces of the same size, should that size change?",
      );
    } else if (equivalent) {
      add(
        "split-whole",
        "visual_fraction_model",
        `Start with ${a}/${b}. Each bar is the same-sized whole. Splitting every piece changes how many pieces we count, not how much is shaded.`,
        "If each piece is split in two, what must happen to the shaded pieces?",
        [{ type: "fraction_bar", numerator: a, denominator: b }],
      );
      add(
        "scale-both",
        "symbolic_first",
        "Multiplying the top and bottom by the same number is multiplying by one, so the value stays unchanged. Changing only the bottom would change the amount.",
        comparison
          ? "What factor connects the two denominators?"
          : "How could you check that a choice uses the same multiplier for both numbers?",
        [
          {
            type: "equation",
            equation: `${a}/${b} = (${a} × k)/(${b} × k), k ≠ 0`,
          },
        ],
      );
      add(
        "regroup",
        "concrete_real_world_example",
        `Imagine ${a} of ${b} equal chocolate pieces. Break every piece in half without eating or adding chocolate. You own twice as many smaller pieces, but the same share.`,
        "Why would changing just the total piece count describe a different share?",
      );
    } else {
      add(
        "read-model",
        "visual_fraction_model",
        `One whole is divided into ${b} equal parts, and ${a} are shaded. The bottom number names the piece size; the top counts selected pieces.`,
        "Are you being asked about the number of pieces or the size of a piece?",
        q.visuals,
      );
      add(
        "unit-fraction",
        "guided_questioning",
        q.hint,
        "What happens to each piece when the same whole is split into more equal parts?",
      );
    }
  } else if (array && q.subject === "Math") {
    add(
      "rows",
      "visual_fraction_model",
      `There are ${array.rows} equal rows with ${array.columns} objects in each. Count one row, then use that equal amount for every row.`,
      "What repeated addition would describe these rows?",
      [array],
    );
    add(
      "break-apart",
      "partial_worked_example",
      `Break ${array.rows} groups into one group and ${array.rows - 1} groups. Work out the larger part, then add one more group of ${array.columns}.`,
      "How could splitting the groups make the calculation easier?",
      [array],
    );
    add(
      "turn-array",
      "compare_contrast",
      `Turn the arrangement: ${array.columns} rows of ${array.rows}. No objects are added or removed, so both arrangements have the same total.`,
      "Which arrangement is easier for you to count?",
      [{ type: "array", rows: array.columns, columns: array.rows }],
    );
  }
  if (!plans.length && q.subject !== "Math") {
    const source = q.visuals.filter((v) =>
      ["passage", "table", "map", "timeline", "diagram"].includes(v.type),
    );
    // An explicit chain in the task is already educational source data (for
    // example grass → rabbit → fox). Draw that chain without inventing links.
    const chain = q.prompt.match(
      /(?:^|\bIn )([^?.:\n]*→[^?.:\n]*?)(?:,|[?.]|$)/i,
    )?.[1];
    const nodes = chain
      ?.replace(/^in\s+/i, "")
      .split("→")
      .map((part) => part.trim());
    if (
      !source.length &&
      nodes &&
      nodes.length >= 2 &&
      nodes.length <= 8 &&
      nodes.every((n) => n.length > 0 && n.length <= 160)
    )
      source.push({
        type: "diagram",
        title: "Follow the relationships in the question",
        nodes,
        links: nodes.slice(1).map((_, i) => [i, i + 1] as [number, number]),
      });
    const focus =
      q.subject === "Science"
        ? "observation or measurement"
        : q.subject === "English"
          ? "word or sentence"
          : "date, map label, or source detail";
    add(
      "source-evidence",
      "evidence_first",
      q.hint,
      `Which ${focus} in this task would you use as evidence?`,
      source,
    );
    add(
      "compare-claims",
      "compare_contrast",
      q.choices?.length
        ? "Test the choices against the information shown. A claim needs support from this case, not just something that might happen elsewhere."
        : "Separate what the source tells us from what we would need to find out.",
      q.choices?.length
        ? "Which choice can you rule out using a specific detail?"
        : "Which detail do we know, and which claim are we checking?",
      source,
    );
    add(
      "trace-relationship",
      q.subject === "English" ? "guided_annotation" : "diagram_first",
      q.subject === "Science"
        ? "Trace what changes and what stays the same in this case before making a prediction."
        : q.subject === "English"
          ? "Choose a short phrase from the text. Link that phrase to the inference you want to make."
          : "Locate the place or event in the source, then trace the relationship the question asks about.",
      q.subject === "Science"
        ? "What changed in the situation described?"
        : q.subject === "English"
          ? "Which phrase connects directly to your idea?"
          : "Which two details in the source need to be connected?",
      source,
    );
  }
  if (!plans.length) {
    add(
      "task-clue",
      "guided_questioning",
      q.hint,
      q.subject === "Math"
        ? "Which part of that step would you like to work through?"
        : "Which detail in the question connects to that clue?",
      q.visuals.filter((v) =>
        ["passage", "table", "map", "timeline", "geometry"].includes(v.type),
      ),
    );
    if (q.concrete && q.concrete !== q.hint)
      add(
        "context",
        "concrete_real_world_example",
        q.concrete,
        "How does this context connect to the question you are solving?",
      );
  }
  if (example.prompt !== q.prompt && example.answer !== q.answer)
    add(
      "parallel-example",
      "worked_example",
      `A separate example: ${example.prompt} ${example.explanation}`,
      "Which step from this example could you use on your original question?",
      [
        {
          type: "passage",
          text: `Separate example\n${example.prompt}\n${example.explanation}`,
          highlights: [],
        },
      ],
    );
  return plans;
}

export function selectSupportPlan(
  plans: SupportPlan[],
  used: string[],
  preferVisual = false,
  rankedStrategies: Strategy[] = [],
): SupportPlan {
  const rank = (strategy: Strategy) =>
    rankedStrategies.includes(strategy)
      ? rankedStrategies.indexOf(strategy)
      : rankedStrategies.length;
  const fresh = plans
    .filter((p) => !used.includes(p.id))
    .sort((a, b) => rank(a.strategy) - rank(b.strategy));
  return (
    (preferVisual ? fresh.find((p) => p.visuals.length) : undefined) ??
    fresh[0] ?? {
      id: "locate-gap",
      strategy: "guided_questioning",
      message:
        "Those explanations haven’t helped yet. Let’s locate the exact sticking point instead of repeating them.",
      prompt:
        "Is it the meaning of a word, choosing a step, or carrying out the calculation?",
      visuals: [],
    }
  );
}

export function answerLessonQuestion(
  q: Question,
  utterance: string,
  glossary: Record<string, string>,
) {
  const text = utterance.toLowerCase();
  // Why is not a dictionary lookup: answer the relationship being questioned.
  if (/why|how come/.test(text)) {
    if (
      /both|multiply|divide|equivalent/.test(text) &&
      /equivalent|common_denominator|simplifying/.test(q.conceptId)
    )
      return "Both counts must change together because every piece is being split or regrouped, including the selected pieces. Multiplying or dividing the top and bottom by the same nonzero number keeps the share unchanged.";
    if (
      /denominator|bottom|pieces|parts/.test(text) &&
      /fraction|denominator|numerator|adding_like|adding_unlike|subtracting_like|subtracting_unlike/.test(
        q.conceptId,
      )
    ) {
      if (/add|subtract|same|change/.test(text))
        return "The denominator names the size of the pieces. Adding or removing pieces does not change their size. If the sizes differ, we first rename both fractions using equal-sized pieces.";
      return "A denominator counts equal parts of one whole. More equal parts in the same whole means each part is smaller, not that you have more of the whole.";
    }
    if (/both sides|balance|equation/.test(text))
      return "An equation says two expressions have the same value. Applying the same reversible operation to both keeps them equal. Changing only one side generally breaks that equality.";
  }
  const entry = Object.entries(glossary)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) =>
      new RegExp(
        `\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      ).test(text),
    );
  if (entry) return entry[1];
  if (/what.*(?:do|start)|how.*(?:start|solve)|first step/.test(text))
    return q.hint;
  return null;
}
