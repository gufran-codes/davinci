import { getQuestion } from "../curriculum";
import type { LearningSession } from "../types";

export function freshQuestion(
  s: LearningSession,
  skillId: string,
  seed: number,
  transfer = false,
) {
  const seen = new Set([
    s.question.prompt,
    ...(s.teaching?.introducedPrompts ?? []),
    ...(s.teaching?.servedQuestions ?? []).map((q) => q.prompt),
  ]);
  for (let offset = 0; offset < 96; offset++) {
    const q = getQuestion(skillId, seed + offset, transfer);
    if (!seen.has(q.prompt)) return q;
  }
  return null;
}

export function successBridge(
  s: LearningSession,
  supportLevel = 0,
  selectedOption?: string,
) {
  const recent = (s.teaching?.recentTutorTurns ?? [])
    .slice(-4)
    .map((t) => t.text);
  const assisted = supportLevel > 0;
  const options = selectedOption
    ? [
        `Yes, option ${selectedOption} is right. Here’s the next question.`,
        `That’s the right choice—${selectedOption}. Try this next one.`,
      ]
    : assisted
      ? [
          "That’s correct. Try the next one with a fresh start.",
          "Yes, that answer works. Here’s a new problem.",
        ]
      : [
          "That’s right. Let’s try the next one.",
          "Correct—here’s a new challenge.",
          "Yes, you’ve got this answer. On to the next question.",
          "That’s correct. Try this next one.",
        ];
  return (
    options.find((line) => !recent.some((text) => text.startsWith(line))) ??
    options[s.correct % options.length]
  );
}
