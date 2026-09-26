import type { Question } from "../types";
// Original parameterized items. Integers/cents are used to avoid floating
// answer-key drift. Grade boundaries constrain the arithmetic range.
export function arithmeticQuestion(
  id: string,
  seed: number,
  transfer: boolean,
): Question | null {
  const match = id.match(
    /^g([1-5])_math_(addition|subtraction|multiplication|division)$/,
  );
  if (!match) return null;
  const grade = Number(match[1]),
    operation = match[2],
    n = Math.abs(seed) % 97;
  let a = 0,
    b = 0,
    result = 0,
    symbol = "",
    reason = "",
    context = "",
    wrong: number[] = [];
  const decimal =
    grade === 5 && ["addition", "subtraction"].includes(operation);
  const format = (v: number) => (decimal ? (v / 100).toFixed(2) : String(v));
  if (operation === "addition" || operation === "subtraction") {
    const values =
      grade === 1
        ? [7 + (n % 5), 2 + (n % 4)]
        : grade === 2
          ? [28 + (n % 27), 13 + (n % 18)]
          : grade === 3
            ? [237 + n * 3, 126 + n]
            : grade === 4
              ? [18425 + n * 103, 7296 + n * 17]
              : [425 + n * 3, 135 + n];
    [a, b] = values;
    symbol = operation === "addition" ? "+" : "−";
    result = operation === "addition" ? a + b : a - b;
    context = decimal
      ? `A container holds ${format(a)} liters. ${format(b)} liters are ${operation === "addition" ? "added" : "poured out"}. How many liters are in the container now?`
      : `A library has ${a} books. ${b} books are ${operation === "addition" ? "donated" : "borrowed"}. How many books are in the library now?`;
    reason =
      grade === 1
        ? `${a} ${symbol} ${b} = ${result}. ${operation === "addition" ? "Count on" : "Count back"} ${b} from ${a} to check.`
        : `Keep matching place values together${decimal ? ", including tenths and hundredths" : ""}. ${format(a)} ${symbol} ${format(b)} = ${format(result)}. Check with the inverse: ${operation === "addition" ? `${format(result)} − ${format(b)} = ${format(a)}` : `${format(result)} + ${format(b)} = ${format(a)}`}.`;
    wrong = [
      operation === "addition" ? a - b : a + b,
      result + (decimal ? 10 : grade === 1 ? 1 : 10),
      result - (decimal ? 10 : grade === 1 ? 1 : 10),
    ];
  } else if (operation === "multiplication") {
    a =
      grade <= 2
        ? 2 + (n % 3)
        : grade === 3
          ? 3 + (n % 7)
          : grade === 4
            ? 23 + n
            : 23 + n;
    b =
      grade <= 2
        ? 2 + (Math.floor(n / 4) % 2)
        : grade === 3
          ? 3 + (n % 6)
          : grade === 4
            ? 3 + (n % 6)
            : 12 + (n % 17);
    result = a * b;
    symbol = "×";
    context = `There are ${a} trays with ${b} seedlings on each tray. How many seedlings are there altogether?`;
    reason =
      a < 10
        ? `${a} groups of ${b} contain ${result} altogether. Add ${b} once for each group to check.`
        : `Split ${a} into ${Math.floor(a / 10) * 10} and ${a % 10}. Multiply each part by ${b}, then add: ${Math.floor(a / 10) * 10 * b} + ${(a % 10) * b} = ${result}.`;
    wrong = [a + b, (a - 1) * b, a * (b + 1)];
  } else {
    b =
      grade <= 2
        ? 2 + (Math.floor(n / 4) % 2)
        : grade === 3
          ? 3 + (n % 6)
          : grade === 4
            ? 3 + (n % 6)
            : 12 + (n % 17);
    result = grade <= 2 ? 2 + (n % 4) : grade === 3 ? 3 + (n % 7) : 13 + n;
    a = b * result;
    symbol = "÷";
    context = `Share ${a} counters equally among ${b} groups. How many counters belong in each group?`;
    reason = `Each group contains ${result}. Check by multiplying the number of groups by the amount in each: ${b} × ${result} = ${a}.`;
    wrong = [a - b, result + 1, b];
  }
  const correct = format(result),
    misconceptionId = `${id}_hypothesis`;
  const options = [
    {
      content: correct,
      correct: true,
      diagnosticMeaning:
        "Consistent with the intended operation and place value.",
    },
    ...wrong.map((v, i) => ({
      content: format(v),
      correct: false,
      misconceptionId: i === 0 ? misconceptionId : undefined,
      diagnosticMeaning:
        i === 0
          ? "Uses the wrong operation; ask what changes or how groups relate."
          : i === 1
            ? "Possible regrouping or one-group error; ask for the intermediate step."
            : "Possible place-value or group-count confusion; verify with a model.",
    })),
  ].filter((v, i, all) => all.findIndex((o) => o.content === v.content) === i);
  const rotated = [
    ...options.slice(n % options.length),
    ...options.slice(0, n % options.length),
  ].map((o, i) => ({ ...o, id: String.fromCharCode(65 + i) }));
  const prompt =
    transfer || grade <= 2
      ? context
      : `Calculate ${format(a)} ${symbol} ${format(b)}. Use place value or equal groups to check your result.`;
  return {
    id: `${id}:${seed}`,
    assessmentKey: `${id}:${a}:${b}:${transfer ? "transfer" : "practice"}`,
    conceptId: id,
    subject: "Math",
    prompt,
    answer: correct,
    transfer,
    choices: transfer ? undefined : rotated.map((o) => o.content),
    options: transfer ? undefined : rotated,
    explanation: reason,
    concrete: context,
    hint:
      operation === "division"
        ? "What multiplication would undo the sharing?"
        : operation === "multiplication"
          ? "Separate the number of groups from the amount in each."
          : grade === 1
            ? "Notice whether the amount is growing or shrinking."
            : "Start with matching place values. What happens in the ones column?",
    visuals: [],
    misconception: { id: misconceptionId, answer: format(wrong[0]) },
    qualityStatus: "authored",
  };
}
