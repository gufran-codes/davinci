import { gradeAnswer } from "../../../src/lib/math";
import { alternatives, binaryClaims } from "./contrasts";

type Item = {
  prompt: string;
  answer: string;
  choices?: string[];
  choiceLabels?: Record<string, string>;
  choiceMode?: "answer" | "writing_support";
  responseType?: "short" | "writing";
  misconception?: { answer: string };
  explanation: string;
  hint: string;
  context?: string;
};
export function cleanQuestion<T extends Item>(item: T): T {
  const q = { ...item };
  const marker = "What key idea does it support? ";
  if (
    q.prompt.startsWith("Consider this explanation:") &&
    q.prompt.includes(marker)
  )
    q.prompt = q.prompt.slice(q.prompt.indexOf(marker) + marker.length);
  // Earlier generated starter content embedded the full solution in hint/context.
  if (q.explanation && q.hint.endsWith(q.explanation))
    q.hint =
      q.hint.slice(0, -q.explanation.length).trim() ||
      "Compare each choice with the information in the question.";
  if (q.context === q.explanation) q.context = q.prompt;
  return q;
}
function labelFor(value: string, q: Item, subject: string) {
  if (q.choiceLabels?.[value]) return q.choiceLabels[value];
  if (/^(yes|no)$/i.test(value)) {
    const claim = binaryClaims.find(([match]) =>
      q.prompt.toLowerCase().includes(match),
    );
    if (claim)
      return `${value.toLowerCase() === "yes" ? "Yes" : "No"} — ${claim[value.toLowerCase() === "yes" ? 1 : 2]}`;
    if (/equivalent|same amount|same value/i.test(q.prompt))
      return /^yes$/i.test(value)
        ? "Yes — both fractions represent the same amount."
        : "No — the fractions represent different amounts.";
    return /^yes$/i.test(value)
      ? "Yes — the relationship in the question is true."
      : "No — the relationship in the question is not true.";
  }
  if (/^-?\d+(?:\.\d+)?(?:\/\d+)?$/.test(value)) {
    if (value.includes("/")) return `The fraction is ${value} of one whole.`;
    if (/numerator/i.test(q.prompt)) return `The numerator would be ${value}.`;
    if (/denominator/i.test(q.prompt))
      return `The denominator would be ${value}.`;
    if (/how many (?:equal )?(?:groups|trays)\b/i.test(q.prompt))
      return `There would be ${value} equal groups.`;
    if (
      /how many[^?]*(?:in each|per group)|each[^?]*(?:get|receive)/i.test(
        q.prompt,
      )
    )
      return `Each group would contain ${value}.`;
    if (/year|comes earlier/i.test(q.prompt))
      return `The earlier year would be ${value}.`;
    if (/visitor/i.test(q.prompt))
      return `The count would be ${value} visitors.`;
    if (/centimetres|in cm/i.test(q.prompt))
      return `The measurement would be ${value} centimetres.`;
    if (/mass.*grams|in grams/i.test(q.prompt))
      return `The mass would be ${value} grams.`;
    if (/liters|litres/i.test(q.prompt))
      return `The amount would be ${value} litres.`;
    if (/books/i.test(q.prompt)) return `There would be ${value} books in all.`;
    if (/seedlings/i.test(q.prompt))
      return `There would be ${value} seedlings in all.`;
    if (/x|equation|solve/i.test(q.prompt))
      return `The value that fits would be ${value}.`;
    return `The result would be ${value}.`;
  }
  if (value.length >= 38 || /[.!?]$/.test(value)) return value;
  if (/^x [<>]/.test(value)) return `The solution values satisfy ${value}.`;
  if (
    /which word|what prefix|what.*root|tense|choose:|in .*which/i.test(q.prompt)
  )
    return `Use “${value}” to complete the language task.`;
  if (/mean|opposite/i.test(q.prompt))
    return `The meaning that fits here is “${value}”.`;
  if (/sense|body part|organs|system|structure/i.test(q.prompt))
    return `The part or system involved is ${value}.`;
  if (/main idea|mainly|main topic/i.test(q.prompt))
    return `The main idea is about ${value}.`;
  if (
    /what happens first|what comes after|before cooling|brief pause/i.test(
      q.prompt,
    )
  )
    return `The point in the sequence is “${value}”.`;
  if (subject === "Math") return `The description that fits is “${value}”.`;
  if (subject === "English")
    return `The text supports this interpretation: ${value}.`;
  if (subject === "Science")
    return `The explanation I would choose is: ${value}.`;
  return `The evidence supports this choice: ${value}.`;
}

/** Prepared data only: no live LLM invents distractors or changes answer keys.
 * Unknown nonnumeric items fail the audit instead of receiving random options. */
export function prepareChoices<T extends Item>(
  item: T,
  subject: string,
  seed: number,
): T {
  const q = cleanQuestion(item);
  let choices = q.choices?.length ? [...q.choices] : undefined;
  if (subject === "Math" && q.answer === "full") {
    choices = ["full", "half-full"];
    q.choiceLabels = {
      full: "The full bottle contains more water and has more mass.",
      "half-full":
        "The half-full bottle contains less water but has more mass.",
    };
  }
  if (!choices && q.responseType === "writing") {
    choices = /garden/i.test(q.prompt)
      ? [
          q.answer,
          "A garden gives us a place to measure how plants change over time.",
          "Students can compare plants in different conditions and record their observations.",
        ]
      : /reading/i.test(q.prompt)
        ? [
            q.answer,
            "Partners can ask each other questions about a story and listen to different ideas.",
            "Reading with someone can help us discuss evidence for a character's feelings.",
          ]
        : [
            q.answer,
            "Clear labels let everyone find the right materials without opening every box.",
            "Names on boxes show where materials belong when we put them away.",
          ];
  }
  if (!choices && /^(yes|no)$/i.test(q.answer))
    choices = [q.answer, /^yes$/i.test(q.answer) ? "no" : "yes"];
  if (!choices && alternatives[q.answer])
    choices = [q.answer, ...alternatives[q.answer]];
  if (!choices && /^-?\d+(?:\.\d+)?(?:\/\d+)?$/.test(q.answer)) {
    const [a, b = 1] = q.answer.split("/").map(Number);
    const value = a / b;
    const delta = q.answer.includes(".") ? 0.1 : 1;
    const candidates = [
      q.misconception?.answer,
      ...(q.answer.includes("/")
        ? [`${a + 1}/${b}`, `${a}/${b + 1}`, `${a + 2}/${b}`]
        : [value + delta, value - delta, value * 2, value + 2 * delta]
            .filter((n) => value < 0 || n >= 0)
            .map((n) => String(Number(n.toFixed(8))))),
    ];
    const wrong = [
      ...new Set(candidates.filter((x): x is string => Boolean(x))),
    ].filter((x) => !gradeAnswer(x, q.answer));
    choices = [q.answer, ...wrong.slice(0, 3)];
  }
  if (!choices || choices.length < 2)
    throw Error(`Author answer choices for: ${q.prompt}`);
  // Rotate newly authored sets, preserving authored ordering and saved meanings.
  if (!q.choices) {
    const offset = Math.abs(seed) % choices.length;
    choices = [...choices.slice(offset), ...choices.slice(0, offset)];
  }
  const choiceLabels = Object.fromEntries(
    choices.map((value) => [value, labelFor(value, q, subject)]),
  );
  return {
    ...q,
    choices,
    choiceLabels,
    choiceMode: q.responseType === "writing" ? "writing_support" : "answer",
  };
}
