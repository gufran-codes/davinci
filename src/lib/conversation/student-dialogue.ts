import type { LearningSession, Question } from "../types";
import type { UnderstoodTurn } from "./intent";
import { interpretTaskUtterance } from "./interpretation";
import type { ExplanationStructure } from "../teaching/explanation-structure";
import { materialFor } from "../teaching/content";
import {
  isSimpleDefinition,
  type ResponseDepth,
} from "../teaching/response-budget";
import { routineReply } from "./routine-turn";

/** These are student claims, not diagnoses or evidence of mastery. */
export interface StudentDialogue {
  answerEvidence?: string;
  request?: {
    kind:
      "question" | "explain" | "worked_example" | "analogy_repair" | "tangent";
    text: string;
    evidence: string;
    reference: "current" | "previous";
    gapId?: string;
  };
  gap?: { description: string; evidence: string };
  understood?: { description: string; evidence: string };
  preference?: { style: "explain" | "guide"; evidence: string };
  resolution?: { status: "resolved" | "still_confused"; evidence: string };
}

export interface DialogueMemory {
  preference: "explain" | "guide" | "default";
  responseDepth?: ResponseDepth;
  gaps: {
    id: string;
    question: Question;
    description: string;
    evidence: string;
    understood?: string;
    status: "open" | "explained" | "resolved";
    resolutionEvidence?: string;
    explanationIds: string[];
    failedApproaches?: string[];
    failedMechanisms?: string[];
  }[];
  activeGapId?: string;
  explanations: {
    id: string;
    gapId?: string;
    questionId: string;
    mode: ResponseMode;
    approach: string;
    text: string;
    deliveredText: string;
    structure?: ExplanationStructure;
    outcome: "unconfirmed" | "not_helpful" | "understood";
  }[];
  plan?: DialoguePlan;
}
export type ResponseMode =
  | "feedback"
  | "hint"
  | "direct_explanation"
  | "worked_example"
  | "clarification"
  | "analogy_repair"
  | "tangent"
  | "practice"
  | "social";
export interface DialoguePlan {
  mode: ResponseMode;
  request?: string;
  gapId?: string;
  focusQuestion: Question;
  focusStep?: { prompt: string; explanation: string };
  questionPolicy: "none" | "optional" | "required";
  reason: string;
  understood?: string;
  failedApproaches: string[];
  failedMechanisms: string[];
  approach?: string;
  example?: Question;
  fallback?: string;
  structure?: ExplanationStructure;
}

/** Offline extraction is deliberately conservative. Free-form meaning is the
 * model's job; literal claims still have to survive its interpretation intact. */
export function interpretStudentTurn(
  text: string,
  s: LearningSession,
  source: "voice" | "text" | "canvas" = "voice",
): UnderstoodTurn {
  const local = interpretTaskUtterance(text, s, source);
  // A complete displayed choice is an answer, even when its content contains
  // phrases such as “does not understand”. Those describe the option, not the
  // learner's state. Compound answer + question messages are handled below.
  if (
    local.intent === "answer" &&
    local.answerTarget === "task" &&
    !local.reasoning
  )
    return local;
  if (
    source === "canvas" ||
    ["end_session", "finish", "wait", "repeat", "reveal"].includes(local.intent)
  )
    return local;
  if (routineReply(text) && !local.answer)
    return { intent: "rapport", ambiguity: "clear" };
  const dialogue: StudentDialogue = {};
  const explainOnly =
    /(?:don['’]t|do not|stop|instead of|without|no more).{0,35}(?:ask|question|quiz)|(?:explain|teach|tell me).{0,25}(?:directly|instead)|just explain/i.test(
      text,
    );
  const guide =
    /(?:ask me|guide me).{0,30}(?:question|step)|let me (?:work|figure|try).{0,20}(?:myself|out)/i.test(
      text,
    );
  if (explainOnly || guide)
    dialogue.preference = {
      style: explainOnly ? "explain" : "guide",
      evidence: text,
    };
  const resolved =
    /^(?:okay[, ]*|ok[, ]*)?(?:i (?:get|understand) it now|that makes sense(?: now)?|now i understand)[.!]*$/i.test(
      text.trim(),
    );
  const confused =
    /(?:still|don['’]t|do not|not).{0,20}(?:understand|get it|clear)|i (?:don['’]t|do not) know|not helping|keep repeating|(?:another|different) way|different explanation/i.test(
      text,
    );
  if (resolved || confused)
    dialogue.resolution = {
      status: resolved ? "resolved" : "still_confused",
      evidence: text,
    };
  const split = text.match(
    /^(.+?)(?:[.!;]\s+|,?\s+but\s+|,?\s+and\s+(?=why|how|what|can you|could you))((?:but\s+)?(?:why|how|what|can you|could you|please|i (?:still|don['’]t|do not)|explain|completely different).+)$/i,
  );
  let answer = local;
  if (split) {
    const claim = interpretTaskUtterance(split[1], s, source);
    if (
      ["answer", "correction"].includes(claim.intent) &&
      !claim.needsClarification
    ) {
      answer = claim;
      dialogue.answerEvidence = split[1];
    }
  }
  const requestText = dialogue.answerEvidence ? split![2] : text;
  const repair =
    /(?:earlier|previous|story|analogy|example).*(?:what|which|mean|represent|understand)|(?:what|which).*(?:earlier|story|analogy|represent)/i.test(
      requestText,
    );
  const worked =
    /(?:worked|separate|another).{0,12}example|show.{0,15}example/i.test(
      requestText,
    );
  const asks =
    /^(?:please |but |wait[, ]+)?(?:why|how|what|can you explain|could you explain|explain|teach me why)\b/i.test(
      requestText,
    );
  const topicSwitch =
    /(?:random|different|unrelated) question|by the way/i.test(requestText);
  const commonWords = new Set([
    "what",
    "which",
    "with",
    "from",
    "does",
    "have",
    "that",
    "this",
    "there",
    "when",
    "then",
    "about",
  ]);
  const taskWords = new Set(
    `${s.question.prompt} ${s.question.hint} ${s.question.explanation} ${s.question.conceptId} ${JSON.stringify(materialFor(s.question, s.question).glossary)}`
      .toLowerCase()
      .match(/[a-z]{4,}/g)
      ?.filter((word) => !commonWords.has(word)) ?? [],
  );
  const related =
    Boolean(dialogue.answerEvidence) ||
    repair ||
    /\b(?:this|that|it|we|step|answer|example|question|problem)\b/i.test(
      requestText,
    ) ||
    (requestText.toLowerCase().match(/[a-z]{4,}/g) ?? []).some((word) =>
      taskWords.has(word),
    );
  if (
    (asks && !["rapport", "hint", "show"].includes(local.intent)) ||
    dialogue.answerEvidence ||
    explainOnly ||
    worked ||
    repair ||
    topicSwitch
  ) {
    dialogue.request = {
      kind:
        topicSwitch || (asks && !related && requestText.split(/\s+/).length > 3)
          ? "tangent"
          : repair
            ? "analogy_repair"
            : worked
              ? "worked_example"
              : explainOnly
                ? "explain"
                : "question",
      text: requestText,
      evidence: requestText,
      reference:
        repair ||
        /(?:earlier|previous|last) (?:example|question|problem|explanation)/i.test(
          requestText,
        )
          ? "previous"
          : "current",
    };
  }
  if (confused || repair)
    dialogue.gap = { description: requestText, evidence: requestText };
  if (!Object.keys(dialogue).length) return local;
  // Do not manufacture an attempt from prose such as a preference or a gap.
  const intent = dialogue.answerEvidence
    ? answer.intent
    : resolved
      ? "resume"
      : dialogue.request
        ? local.intent === "show" || local.intent === "hint"
          ? local.intent
          : local.intent === "define"
            ? "define"
            : "why"
        : local.intent;
  return {
    ...answer,
    intent,
    dialogue,
    answer: ["answer", "correction"].includes(intent)
      ? answer.answer
      : undefined,
  };
}

/** Ignore unsupported semantic annotations rather than persisting invented
 * learner facts. Exact source spans are also a barrier against answer invention. */
export function validateDialogue(
  value: StudentDialogue | undefined,
  transcript: string,
): StudentDialogue | undefined {
  if (!value) return undefined;
  const has = (evidence: string | undefined) =>
    !!evidence?.trim() &&
    transcript.toLowerCase().includes(evidence.toLowerCase());
  return {
    answerEvidence: has(value.answerEvidence)
      ? value.answerEvidence
      : undefined,
    request:
      value.request && has(value.request.evidence)
        ? { ...value.request, text: value.request.text.slice(0, 700) }
        : undefined,
    gap:
      value.gap && has(value.gap.evidence)
        ? { ...value.gap, description: value.gap.description.slice(0, 400) }
        : undefined,
    understood:
      value.understood && has(value.understood.evidence)
        ? {
            ...value.understood,
            description: value.understood.description.slice(0, 400),
          }
        : undefined,
    preference:
      value.preference && has(value.preference.evidence)
        ? value.preference
        : undefined,
    resolution:
      value.resolution && has(value.resolution.evidence)
        ? value.resolution
        : undefined,
  };
}

export function needsSemanticUnderstanding(
  turn: UnderstoodTurn,
  source: string,
  transcript = "",
) {
  if (
    source === "canvas" ||
    ["end_session", "finish", "wait", "resume", "repeat", "reveal"].includes(
      turn.intent,
    )
  )
    return false;
  if (
    !turn.needsClarification &&
    !turn.answer &&
    !turn.reasoning &&
    ((turn.intent === "rapport" && routineReply(transcript)) ||
      (turn.intent === "define" &&
        isSimpleDefinition(transcript) &&
        !turn.dialogue?.answerEvidence &&
        !turn.dialogue?.gap &&
        !turn.dialogue?.resolution &&
        !turn.dialogue?.understood &&
        turn.dialogue?.request?.reference !== "previous"))
  )
    return false;
  return (
    Boolean(turn.dialogue) ||
    !["answer", "correction"].includes(turn.intent) ||
    Boolean(turn.reasoning) ||
    turn.needsClarification
  );
}
