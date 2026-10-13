import type { LearningSession } from "../types";
import { dialogueFocus } from "./dialogue";
import { resolveSpokenChoice } from "./choice-resolution";
import {
  choiceClaim,
  requestsSessionEnd,
  spokenMath,
  understandLocally,
  type UnderstoodTurn,
} from "./intent";

export function interpretTaskUtterance(
  transcript: string,
  session: LearningSession,
  source: "voice" | "text" | "canvas" = "voice",
): UnderstoodTurn {
  const text = transcript.trim();
  if (requestsSessionEnd(text)) return { intent: "end_session" };
  const focus = dialogueFocus(session);
  const choice = resolveSpokenChoice(text, session.question);
  if (
    choice &&
    "answer" in choice &&
    (focus.kind === "answer" || choice.explicit || source === "canvas")
  )
    return {
      intent: "answer",
      answer: choice.answer,
      selectedChoice: choice.selected,
      answerTarget: "task",
      ambiguity: "clear",
    };
  if (choice && "ambiguous" in choice)
    return {
      intent: "off_topic",
      ambiguity: "ambiguous",
      needsClarification: true,
    };
  const explicit =
    source === "canvas" ||
    /^(?:(?:my|the) (?:correct )?(?:answer|option|choice) is|i choose|i pick|option)\b/i.test(
      text,
    );
  const useChoices =
    focus.kind === "answer" ||
    focus.kind === "reflection" ||
    (explicit && focus.kind !== "guided_step");
  const question = useChoices
    ? session.question
    : { ...session.question, choices: undefined };
  const norm = choiceClaim;
  const [claim, ...reason] = text.split(/\b(?:because|since)\b/i);
  const labelMatch =
    useChoices &&
    Object.entries(question.choiceLabels ?? {}).find(
      ([, label]) => norm(label) === norm(text) || norm(label) === norm(claim),
    );
  if (labelMatch)
    return {
      intent: "answer",
      answer: labelMatch[0],
      reasoning:
        norm(labelMatch[1]) !== norm(text) && reason.length ? text : undefined,
      ambiguity: "clear",
    };
  const local = understandLocally(text, question);
  if (
    !["answer", "reasoning", "correction", "off_topic"].includes(local.intent)
  )
    return local;
  const unclear = (): UnderstoodTurn => ({
    intent: "off_topic",
    ambiguity: "ambiguous",
    needsClarification: true,
  });
  if (
    /^(?:that|this|the other) (?:one|thing)|^(?:it|that|something)[.!?]*$/i.test(
      text,
    )
  )
    return unclear();
  if (/\bor\b/i.test(text) && !/\b(?:why|what|how|which)\b/i.test(text)) {
    const alternatives = text
      .split(/\bor\b/i)
      .map((part) => understandLocally(part.trim(), question));
    if (alternatives.filter((part) => part.intent === "answer").length > 1)
      return unclear();
  }
  // A choice plus an explanation is still an answer attempt. A bare observation
  // belongs to the checkpoint being discussed, not automatically to the final key.
  if (useChoices && question.choices) {
    const normalized = claim
      .trim()
      .replace(/[.!?]+$/, "")
      .toLowerCase();
    const answerPart = understandLocally(claim, question);
    const matches = question.choices.filter(
      (choice) =>
        choice.toLowerCase() === normalized ||
        answerPart.answer === choice ||
        (/^[-+]?\d+(?:\/\d+)?$/.test(choice) && spokenMath(claim) === choice),
    );
    if (matches.length === 1 && !/\b(?:not|isn't|isn’t)\b/i.test(claim))
      return {
        intent: "answer",
        answer: matches[0],
        reasoning: reason.length ? text : undefined,
        ambiguity: "clear",
        confidence: /\b(?:guess|maybe|not sure)\b/i.test(text)
          ? "low"
          : undefined,
      };
    if (matches.length > 1) return unclear();
    if (
      question.responseType !== "writing" &&
      question.subject !== "Math" &&
      local.intent === "answer"
    )
      return unclear();
  }
  if (!useChoices && /^(?:option )?[a-f][.!?]*$/i.test(text)) return unclear();
  // Unknown prose is not an ambiguous option selection. Keep it conversational
  // unless actual competing choices/unclear answer references were detected.
  if (
    local.intent === "off_topic" &&
    !/[?]|\b(?:why|what|how|explain|tell)\b/i.test(text)
  )
    return { intent: "off_topic", ambiguity: "clear" };
  return { ...local, ambiguity: "clear" };
}
