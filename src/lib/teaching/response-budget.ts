export type ResponseDepth = "brief" | "standard" | "detailed";

export const speechWords = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

/** Only explicit length requests affect depth. A request for this answer is
 * temporary; “from now on” or “your answers” also updates session preference. */
export function responseDepthRequest(utterance: string) {
  const text = utterance.toLowerCase().replace(/[’]/g, "'");
  const negatedDetail =
    /\b(?:don't|do not|no need to|without|not|no)\s+(?:(?:explain|go|give|me|us|the|a|an|any|into|it|this|that|please|need|want|to|answer|with)\s+){0,5}(?:in detail|in depth|full explanation|detailed explanation|more details?|explain more|go deeper|elaborate)\b/g;
  const negatedBrief =
    /\b(?:don't|do not|not)\s+(?:(?:be|keep|make|it|that|this|too|so|your|answers|replies|answer|want|need|give|me|a|to)\s+){0,5}(?:briefly|concisely|brief|short|concise)\b/g;
  const lessDetail = negatedDetail.test(text);
  negatedDetail.lastIndex = 0;
  const normal = negatedBrief.test(text);
  negatedBrief.lastIndex = 0;
  const positive = text.replace(negatedDetail, " ").replace(negatedBrief, " ");
  const brief =
    /\b(?:keep|make)\s+(?:\w+\s+){0,4}(?:brief|short|concise)\b|\b(?:briefly|concisely|short answer|shorter answers?|shorter replies|less detail|too (?:long|wordy)|one sentence|a single sentence)\b|\b(?:be|answer|explain) (?:brief|short|concise)\b/.test(
      positive,
    );
  const detailed =
    /\b(?:in depth|in detail|full explanation|detailed explanation|explain more|more detail|go deeper|elaborate)\b/.test(
      positive,
    );
  const depth: ResponseDepth | undefined =
    brief || lessDetail
      ? "brief"
      : detailed
        ? "detailed"
        : normal
          ? "standard"
          : undefined;
  return {
    depth,
    persistent:
      !!depth &&
      /\b(?:from now on|always|usually|by default|your (?:answers|replies|responses|explanations))\b/.test(
        text,
      ),
  };
}

/** Restrict the one-call route to standalone definitions with an explicit
 * referent. Compound turns, comparisons and references need interpretation. */
export function isSimpleDefinition(utterance: string) {
  const match = utterance
    .trim()
    .match(
      /^(?:please\s+)?(?:what (?:is|are)\s+(.+?)|what does\s+(.+?)\s+mean|define\s+(.+?))\s*[?.!]*$/i,
    );
  if (!match) return false;
  const term = (match[1] || match[2] || match[3]).trim().replace(/[?.!]+$/, "");
  return (
    /^[a-z][a-z\s-]*$/i.test(term) &&
    speechWords(term) <= 6 &&
    !/\b(?:it|this|that|these|those|they|them|we|you|my|your|earlier|previous|last|answer|option|choice|and|but|or|why|how|not|step|example|difference)\b/i.test(
      term,
    )
  );
}

export interface SpeechBudget {
  depth: ResponseDepth;
  maxWords: number;
  explanationWords: number;
  instruction: string;
}

/** The same budget is used by the author, quality guard and offline delivery.
 * A required curriculum question has its own allowance, never enlarging an
 * unrelated definition or social reply. */
export function tutorSpeechBudget(input: {
  intent: string;
  utterance?: string;
  mode?: string;
  grade?: number;
  preference?: ResponseDepth;
  requiredQuestion?: string;
}): SpeechBudget {
  const depth =
    responseDepthRequest(input.utterance ?? "").depth ??
    input.preference ??
    "standard";
  const simple =
    (input.intent === "define" && !input.utterance?.trim()) ||
    isSimpleDefinition(input.utterance ?? "");
  const explanation =
    ["why", "define"].includes(input.intent) ||
    [
      "direct_explanation",
      "worked_example",
      "analogy_repair",
      "tangent",
    ].includes(input.mode ?? "");
  let words = simple ? 35 : explanation ? 70 : 35;
  if (input.mode === "social" || input.intent === "rapport") words = 30;
  if (input.intent === "wait") words = 12;
  if (["answer", "correction", "resume"].includes(input.intent) && !explanation)
    words = 25;
  if (depth === "detailed" && explanation) words = 180;
  if (depth === "brief") words = Math.min(words, 35);
  if (input.grade !== undefined && input.grade <= 3 && words > 35)
    words = depth === "detailed" ? 120 : 50;
  return {
    depth,
    maxWords: words + speechWords(input.requiredQuestion ?? ""),
    explanationWords: words,
    instruction:
      depth === "detailed"
        ? "Explain the requested mechanism in short paragraphs. Stay below the limit; it is not a target."
        : simple
          ? "Answer the definition in one or two short sentences, then stop. No example or follow-up question unless requested."
          : depth === "brief"
            ? "Give the essential answer or next step in one or two short sentences, then stop."
            : "Make one useful teaching move. Use only the words needed; do not add a recap, generic praise, or an unsolicited quiz.",
  };
}

/** Compact authored fallback prose at sentence boundaries, retaining the exact
 * required task. Never cut a sentence, numeric expression or answer choice.
 * Full authored content remains available in the teaching context/board. */
export function boundedFallback(
  text: string,
  budget: SpeechBudget,
  requiredQuestion?: string,
) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (speechWords(normalized) <= budget.maxWords) return normalized;
  const body =
    requiredQuestion && normalized.includes(requiredQuestion)
      ? normalized.replace(requiredQuestion, "").trim()
      : normalized;
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  const sentences: string[] = [];
  let words = 0;
  for (const { segment } of segmenter.segment(body)) {
    const sentence = segment.trim();
    const count = speechWords(sentence);
    if (words + count > budget.explanationWords) break;
    sentences.push(sentence);
    words += count;
  }
  return [...sentences, ...(requiredQuestion ? [requiredQuestion] : [])].join(
    " ",
  );
}
