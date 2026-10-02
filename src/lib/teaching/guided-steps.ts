import type { Question } from "../types";
import { parseMath } from "../math";
import { spokenMath } from "../conversation/intent";
import type { CanvasAction } from "./whiteboard";

export interface GuidedStep {
  id: string;
  prompt: string;
  expected: number;
  explanation: string;
  equation: string;
  check: (proposed: number) => string;
}
export interface GuidedPractice {
  questionId: string;
  stepIndex: number;
  failures: number;
}

// Only curriculum-backed templates with checked arithmetic are supported.
// Functions/answer keys are derived server-side, never stored in student memory.
export function guidedSteps(q: Question): GuidedStep[] {
  if (q.subject !== "Math") return [];
  const equation = q.prompt.match(/^Solve (\d*)x \+ (\d+) = (\d+)\./);
  if (equation) {
    const coefficient = Number(equation[1] || 1),
      constant = Number(equation[2]),
      total = Number(equation[3]);
    if (
      coefficient > 1 &&
      (total - constant) / coefficient === parseMath(q.answer)
    )
      return [
        {
          id: "subtract-constant",
          expected: total - constant,
          prompt: `Subtract ${constant} from both sides. What is the new right-hand side?`,
          explanation: `Subtracting ${constant} undoes the addition while preserving equality. We are finding the remaining total, not x yet.`,
          equation: `${coefficient}x = ${total} - ${constant}`,
          check: (n) =>
            `${total} - ${constant} is not ${n}. Take away ${constant} from ${total} and check by adding it back.`,
        },
        {
          id: "isolate-operation",
          expected: coefficient,
          prompt: `We now have ${coefficient}x = ${total - constant}. What number should we divide both sides by?`,
          explanation: `The coefficient multiplies x. Dividing both sides by that coefficient undoes the multiplication.`,
          equation: `${coefficient}x ÷ ? = ${total - constant} ÷ ?`,
          check: (n) =>
            `Dividing by ${n} does not cancel the coefficient ${coefficient}. We need the coefficient of x to become 1.`,
        },
      ];
  }
  const array = q.visuals.find((v) => v.type === "array");
  if (
    array?.type === "array" &&
    /^(equal_groups|multiplication_)/.test(q.conceptId)
  ) {
    const { rows, columns } = array;
    if (
      !Number.isSafeInteger(rows) ||
      !Number.isSafeInteger(columns) ||
      rows < 2 ||
      rows > 12 ||
      columns < 1 ||
      columns > 12 ||
      parseMath(q.answer) !== rows * columns
    )
      return [];
    return [
      {
        id: "one-group",
        prompt: "How many objects are in one group?",
        expected: columns,
        equation: `${rows} groups × ? in each`,
        explanation: "Count one row. Each row represents one equal group.",
        check: (n) =>
          `Your count gives ${n} objects per group, but each row shows ${columns}. Check one row first.`,
      },
      {
        id: "two-groups",
        prompt: "How many objects are there in the first two groups together?",
        expected: 2 * columns,
        equation: `${columns} + ${columns} = ?`,
        explanation:
          "Join two equal groups by adding the number in each group.",
        check: (n) =>
          `${columns} + ${columns} does not equal ${n}. Count the two rows together once more.`,
      },
    ];
  }
  const supported = [
    "equivalent_fractions",
    "generate_equivalent",
    "common_denominators",
    "adding_unlike",
  ];
  if (!supported.includes(q.conceptId)) return [];
  const bar = q.visuals.find((v) => v.type === "fraction_bar");
  const comparison = q.visuals.find((v) => v.type === "comparison");
  const a =
    bar?.type === "fraction_bar"
      ? bar.numerator
      : comparison?.type === "comparison"
        ? comparison.a
        : 0;
  const b =
    bar?.type === "fraction_bar"
      ? bar.denominator
      : comparison?.type === "comparison"
        ? comparison.b
        : 0;
  const answer = q.answer.match(/^(\d+)\/(\d+)$/);
  const target =
    q.conceptId === "equivalent_fractions"
      ? Number(answer?.[2])
      : comparison?.type === "comparison"
        ? comparison.d
        : 0;
  const factor = target / b;
  if (
    ![a, b, target, factor].every(Number.isSafeInteger) ||
    a < 1 ||
    b < 2 ||
    target > 80 ||
    factor < 2
  )
    return [];
  const expected =
    q.conceptId === "generate_equivalent"
      ? a * factor
      : q.conceptId === "adding_unlike" && comparison?.type === "comparison"
        ? (a * factor + comparison.c) / target
        : a / b;
  if (parseMath(q.answer) !== expected) return [];
  return [
    {
      id: "scale-factor",
      prompt: `What number multiplies ${b} to make ${target}?`,
      expected: factor,
      equation: `${b} × ? = ${target}`,
      explanation:
        "Find how many smaller equal pieces replace each original piece.",
      check: (n) =>
        `Using ${n} would give ${b} × ${n} = ${b * n}, but we need ${target}. Try another factor.`,
    },
    {
      id: "scaled-numerator",
      prompt: `Multiply the numerator ${a} by the same factor ${factor}. How many shaded pieces does that give?`,
      expected: a * factor,
      equation: `${a} × ${factor} = ?`,
      explanation:
        "Every piece is split in the same way, including the shaded pieces. The amount stays unchanged.",
      check: (n) =>
        `${n}/${target} would not match ${a}/${b}: the cross-products ${n} × ${b} and ${a} × ${target} are different. Count the shaded pieces after splitting.`,
    },
  ];
}

export function guidedValue(text: string): number | null {
  const normalized = spokenMath(
    text
      .replace(
        /^(?:i (?:would |will )?)?(?:multiply(?: it)? by|times|there are|it would be)\s+/i,
        "",
      )
      .replace(/\s+(?:pieces|objects|counters|parts|groups)[.!]?$/i, ""),
  );
  const value = parseMath(normalized);
  return value !== null &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : null;
}

export function guidedActions(
  step: GuidedStep,
  question?: Question,
): CanvasAction[] {
  const actions: CanvasAction[] = [
    { type: "clearCanvas", id: "guided-clear", owner: "tutor", atWord: 0 },
    {
      type: "showEquation",
      id: "guided-equation",
      owner: "tutor",
      atWord: 0,
      equation: step.equation,
    },
  ];
  const array = question?.visuals.find((v) => v.type === "array");
  const bar = question?.visuals.find((v) => v.type === "fraction_bar");
  const comparison = question?.visuals.find((v) => v.type === "comparison");
  if (array?.type === "array")
    actions.push({
      type: "showArray",
      id: "guided-source",
      owner: "tutor",
      atWord: 0,
      rows: array.rows,
      columns: array.columns,
    });
  else if (bar?.type === "fraction_bar" || comparison?.type === "comparison")
    actions.push({
      type: "showFractionBars",
      id: "guided-source",
      owner: "tutor",
      atWord: 0,
      bars: [
        {
          numerator:
            bar?.type === "fraction_bar" ? bar.numerator : comparison!.a,
          denominator:
            bar?.type === "fraction_bar" ? bar.denominator : comparison!.b,
          label: "Original amount",
        },
      ],
    });
  return actions;
}

export const requestsGuidedSteps = (text: string) =>
  /\b(step by step|one step at a time|walk me through|help me with (?:the )?steps)\b/i.test(
    text,
  );
