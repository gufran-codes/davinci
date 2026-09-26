import raw from "../../../content/curriculum/grades-1-5.json";
import { skillContentSchema } from "../../../content/curriculum/schema";
import type { Concept, Question, Visual } from "../types";
import type { Rubric, TeachingMaterial } from "./types";
export const curriculumContent = skillContentSchema.array().parse(raw);
export const expandedMisconceptions = curriculumContent.flatMap((c) =>
  c.misconceptions.map((m) => ({
    id: m.id,
    subject: c.subject,
    name: m.name,
    description: m.verification,
    conceptIds: [c.id],
    detectionPatterns: [m.wrongAnswer],
    verificationQuestions: [m.verification],
    remediationStrategies: m.remediation,
  })),
);
export const contentById = Object.fromEntries(
  curriculumContent.map((s) => [s.id, s]),
);
export const expandedConcepts: Concept[] = curriculumContent.map((s) => ({
  id: s.id,
  name: s.name,
  subject: s.subject,
  domain: s.domain,
  topic: s.topic,
  description: s.objective,
  gradeBand: [s.grade, s.grade],
  gradeRange: [s.grade, s.grade],
  prerequisites: s.prerequisites,
  learningObjectives: [s.objective],
  misconceptionIds: s.misconceptions.map((m) => m.id),
  teachingStrategyIds: [
    "guided_questioning",
    "concrete_real_world_example",
    "compare_contrast",
    "partial_worked_example",
    s.subject === "Math" ? "symbolic_first" : "evidence_first",
  ],
  diagnosticItems: [`${s.id}:0`],
  practiceItems: [`${s.id}:1`],
  masteryItems: [`${s.id}:2`],
}));
export function contentQuestion(
  id: string,
  seed: number,
  transfer: boolean,
): Question | null {
  const c = contentById[id];
  if (!c) return null;
  const item = c.questions[Math.abs(seed) % c.questions.length];
  return {
    id: `${id}:${seed}`,
    conceptId: id,
    subject: c.subject,
    prompt: item.prompt,
    answer: item.answer,
    choices: item.choices,
    hint: item.hint,
    explanation: item.explanation,
    concrete: item.context,
    visuals: item.visuals as Visual[],
    transfer,
    rubricId: c.id,
    responseType: item.responseType,
    misconception: item.misconception,
    assessmentKey: `${id}:item${Math.abs(seed) % c.questions.length}`,
  };
}
export function rubricFor(q: Question): Rubric {
  const c = contentById[q.conceptId];
  if (c) {
    const rubric = structuredClone(c.rubric);
    if (q.responseType === "writing")
      rubric.criteria[0].terms = /garden/.test(q.prompt)
        ? ["garden", "plant", "grow"]
        : /reading/.test(q.prompt)
          ? ["read", "reading", "story", "word"]
          : ["label", "boxes", "names"];
    return rubric;
  }
  const fractions =
    q.conceptId.includes("fraction") ||
    ["numerator", "denominator", "common_denominators"].includes(q.conceptId);
  return {
    criteria: fractions
      ? [
          {
            id: "quantity",
            description: "Fractions represent a share of the same whole.",
            terms: [
              "same amount",
              "same whole",
              "equal amount",
              "equal parts",
              "same size",
            ],
            weight: 1,
          },
          {
            id: "relationship",
            description:
              "Explains a valid relationship between numerator and denominator.",
            terms: ["both", "multiply", "divide", "split", "twice", "double"],
            weight: 1,
          },
        ]
      : [
          {
            id: "concept",
            description: "Names a relevant mathematical relationship.",
            terms: [
              "groups",
              "each",
              "share",
              "times",
              "multiply",
              "divide",
              "total",
              "parts",
            ],
            weight: 1,
          },
          {
            id: "reason",
            description: "Connects the answer to its reasoning.",
            terms: ["because", "so", "means", "shows", "for example"],
            weight: 1,
          },
        ],
    minScore: 0.75,
    counterEvidence: [
      "add both denominators",
      "bigger denominator means bigger fraction",
      "larger denominator means larger fraction",
    ],
    sampleExplanation: q.explanation,
  };
}
export function assessReasoning(text: string, rubric: Rubric) {
  const normalized = text.toLowerCase().replace(/[’]/g, "'");
  const contradicted = rubric.counterEvidence.some((s) =>
    normalized.includes(s),
  );
  const matches = rubric.criteria
    .filter((c) =>
      c.terms.some((t) =>
        new RegExp(
          `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i",
        ).test(normalized),
      ),
    )
    .map((c) => c.id);
  const score = contradicted
    ? 0
    : rubric.criteria
        .filter((c) => matches.includes(c.id))
        .reduce((n, c) => n + c.weight, 0) /
      rubric.criteria.reduce((n, c) => n + c.weight, 0);
  return {
    score,
    matches,
    contradicted,
    sufficient:
      !contradicted &&
      score >= rubric.minScore &&
      normalized.split(/\s+/).length >= 6,
  };
}
export function materialFor(q: Question, example: Question): TeachingMaterial {
  const c = contentById[q.conceptId],
    fraction =
      q.conceptId.includes("fraction") ||
      [
        "numerator",
        "denominator",
        "generate_equivalent",
        "common_denominators",
      ].includes(q.conceptId);
  const attention = fraction
    ? "Look at what the bottom number is counting."
    : q.subject === "Math"
      ? "Look at the quantities and what is changing."
      : q.subject === "English"
        ? "Look back at the words that support your idea."
        : q.subject === "Science"
          ? "Look at what you can observe, and what changed."
          : "Look at the evidence, labels, and order of events.";
  const glossary = {
    denominator: "The denominator tells how many equal parts make one whole.",
    numerator: "The numerator counts the parts we are talking about.",
    equivalent:
      "Equivalent means the same amount, even if the names look different.",
    fraction: "A fraction names equal parts of a whole.",
    ...c?.glossary,
  };
  return {
    attention,
    guidingQuestion:
      q.subject === "Math"
        ? fraction
          ? "How many equal pieces make one whole? Which pieces are we counting?"
          : "What needs to be combined, compared, or shared?"
        : `Which detail would help you decide? ${attention}`,
    strategyHint: fraction
      ? "Keep the whole the same. When you split the pieces, both counts must change together."
      : q.subject === "Math"
        ? "Work with one group or one place value first, then build up."
        : "Make a claim, point to a detail, and explain how the detail supports it.",
    partialStep: fraction
      ? "For a different example, split each third in two. Three times two gives six pieces in the whole. What must happen to the selected pieces?"
      : `Let’s begin with a different example. ${example.prompt} Identify the information you need before calculating.`,
    workedSupport: fraction
      ? "Suppose one of three equal pieces is yours. Cut every piece into two smaller pieces. The whole now has six pieces. Count how many of those pieces are yours, then use that approach on your question."
      : q.responseType === "writing"
        ? "For a different topic: A quiet reading corner helps us concentrate because there are fewer interruptions. Notice the idea and its reason. Now develop your own idea."
        : example.answer === q.answer
          ? `For a different example: ${example.prompt} ${attention} Explain the first step before choosing an answer.`
          : `For a different example: ${example.prompt} ${example.explanation} Now use that approach on your question.`,
    analogy: fraction
      ? "Think of a sandwich. Cutting your share into smaller pieces changes the number of pieces, but not how much sandwich you have."
      : q.concrete,
    errorExample: fraction
      ? "A student changes the number of pieces but forgets that the piece size also changes."
      : "A student chooses an answer before checking the information in the question.",
    errorQuestion: "What should they check before deciding?",
    glossary,
    rubric: rubricFor(q),
    visuals: q.visuals,
    example,
  };
}
