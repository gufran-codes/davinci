export type ModelRole = "interpreter" | "tutor" | "lesson" | "homework";

/** Sol's output budget includes reasoning, not just the visible JSON response.
 * Keep its settings separate from the existing non-reasoning fallback. */
export function openAISettings(role: ModelRole) {
  const override =
    role === "interpreter"
      ? process.env.OPENAI_INTERPRETER_MODEL
      : role === "tutor" || role === "lesson"
        ? process.env.OPENAI_TUTOR_MODEL
        : undefined;
  const model = override || process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const sol = /^gpt-6\.1-sol(?:-|$)/.test(model);
  const luna = /^gpt-6-luna(?:-|$)/.test(model);
  const limits = {
    interpreter: {
      tokens: sol ? 4096 : luna ? 2048 : 1100,
      timeout: sol ? 15000 : luna ? 8000 : 6000,
    },
    tutor: { tokens: sol ? 6144 : 1800, timeout: sol ? 20000 : 12000 },
    lesson: { tokens: sol ? 2048 : 250, timeout: sol ? 15000 : 8000 },
    homework: { tokens: sol ? 2048 : 100, timeout: sol ? 20000 : 8000 },
  }[role];
  return {
    request: {
      model,
      ...(sol
        ? { reasoning: { effort: "low" as const } }
        : luna
          ? {
              reasoning: {
                effort:
                  role === "interpreter" ? ("none" as const) : ("low" as const),
              },
            }
          : {}),
      max_output_tokens: limits.tokens,
    },
    options: { timeout: limits.timeout, maxRetries: 0 },
  };
}
