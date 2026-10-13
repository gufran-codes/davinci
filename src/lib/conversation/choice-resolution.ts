import type { Question } from "../types";
import { choiceClaim, spokenMath } from "./intent";
import { choiceLabel } from "./choice-label";

/** Resolve against every displayed option, never against the correct key alone.
 * A keyword is a selection only when it identifies exactly one option. */
export function resolveSpokenChoice(
  text: string,
  q: Question,
):
  | { answer: string; selected: boolean; explicit: boolean }
  | { ambiguous: true }
  | undefined {
  if (!q.choices?.length) return;
  const raw = text.trim().replace(/^(?:(?:um|uh|okay|ok)[, ]+)+/i, "");
  const claim = choiceClaim(raw)
    .replace(/[,;:]$/g, "")
    .trim();
  const normalize = (s: string) =>
    spokenMath(choiceClaim(s))
      .replace(/[“”"'!?;:]/g, "")
      .replace(/(?<=\d),(?=\d{3}\b)/g, "")
      .replace(/(?<!\d)[.,]|[.,](?!\d)/g, " ")
      .replace(/−/g, "-")
      .replace(/[—–]/g, " ")
      .replace(/(?<=[a-z])-(?=[a-z])/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const exact = q.choices.filter(
    (c) =>
      normalize(c) === normalize(claim) ||
      normalize(q.choiceLabels?.[c] ?? "") === normalize(claim) ||
      normalize(choiceLabel(c, q.choiceLabels?.[c])) === normalize(claim),
  );
  if (exact.length === 1)
    return {
      answer: exact[0],
      selected: !/^[-+\d./ ]+$/.test(spokenMath(claim)),
      explicit:
        !/^[-+\d./ ]+$/.test(spokenMath(claim)) ||
        /\b(?:answer|option|choice)\b/i.test(raw),
    };
  // A letter plus a read-out must name the same option, not competing choices.
  const prefixed = /^(?:option\s+|choice\s+)?([a-f])[,.:]+\s*(.+)$/i.exec(
    claim,
  );
  if (prefixed && !/^(?:because|since)\b/i.test(prefixed[2])) {
    const named = q.choices[prefixed[1].toLowerCase().charCodeAt(0) - 97];
    const detail = resolveSpokenChoice(prefixed[2], q);
    if (named && detail && "answer" in detail && detail.answer === named)
      return { answer: named, selected: true, explicit: true };
    return { ambiguous: true };
  }
  // Negation and alternatives in an option itself are legitimate. Only reject
  // them after full-label matching so “does not change” can be selected safely.
  if (/\b(?:not|isn't|isn’t|is not|don't|do not|or)\b/i.test(raw)) return;
  const spokenNumber = spokenMath(claim);
  const numeric = q.choices.filter(
    (c) => /^[-+]?\d+(?:\.\d+)?(?:\/\d+)?$/.test(c) && c === spokenNumber,
  );
  if (numeric.length === 1)
    return {
      answer: numeric[0],
      selected: false,
      explicit: /\b(?:answer|option|choice)\b/i.test(raw),
    };
  if (/^(?:why|what|how|when|where|can|could|explain)\b/i.test(raw)) return;
  const spokenLetter: Record<string, string> = {
    ay: "a",
    bee: "b",
    be: "b",
    see: "c",
    sea: "c",
    dee: "d",
    ee: "e",
    eff: "f",
  };
  const optionNumber =
    /\b(?:option|choice)\s+(?:number\s+)?(one|two|three|four|five|six|[1-6])[.!]*$/i.exec(
      raw,
    )?.[1];
  const letterClaim = claim.replace(/^(?:the )?letter\s+/i, "");
  const letter = /^[a-f]$/.test(letterClaim)
    ? letterClaim
    : spokenLetter[letterClaim];
  const ordinal =
    /^(?:the )?(first|second|third|fourth|fifth|sixth)(?: (?:one|choice|option))?$/.exec(
      claim,
    )?.[1];
  const index = optionNumber
    ? Number(spokenMath(optionNumber)) - 1
    : letter
      ? letter.charCodeAt(0) - 97
      : ordinal
        ? ["first", "second", "third", "fourth", "fifth", "sixth"].indexOf(
            ordinal,
          )
        : -1;
  if (index >= 0 && q.choices[index])
    return {
      answer: q.choices[index],
      selected: true,
      explicit: true,
    };
  // Match shortened readings in order; reordering can reverse the meaning.
  const stop = new Set([
    "a",
    "an",
    "the",
    "is",
    "are",
    "it",
    "that",
    "this",
    "to",
    "of",
    "and",
    "in",
    "with",
    "would",
    "be",
    "i",
    "think",
    "because",
    "answer",
    "choice",
    "option",
  ]);
  const tokens = (s: string) =>
    normalize(s)
      .match(/[a-z0-9]+/g)
      ?.filter((t) => !stop.has(t)) ?? [];
  const words = tokens(claim);
  // Prose containing extra claims is left to semantic understanding.
  if (
    !words.some((w) => /[a-z]/.test(w)) ||
    words.length > 60 ||
    /\b(?:because|since)\b/i.test(raw)
  )
    return;
  const matches = q.choices.filter((c) => {
    return [c, q.choiceLabels?.[c] ?? ""].some((candidate) => {
      const option = tokens(candidate);
      let position = 0;
      return words.every((word) => {
        const index = option.indexOf(word, position);
        if (index < 0) return false;
        position = index + 1;
        return true;
      });
    });
  });
  if (matches.length === 1)
    return {
      answer: matches[0],
      selected: true,
      explicit: true,
    };
  if (matches.length > 1) return { ambiguous: true };
}
