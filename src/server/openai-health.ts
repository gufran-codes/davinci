let unavailableUntil = 0;
let lastWarningAt = 0;

function failureMetadata(error: unknown) {
  const value = error as {
    status?: number;
    code?: string;
    error?: { type?: string; code?: string };
  };
  return {
    status: value?.status,
    code: value?.code ?? value?.error?.code ?? value?.error?.type,
  };
}

export function openAIAvailable() {
  return Boolean(process.env.OPENAI_API_KEY) && Date.now() >= unavailableUntil;
}

export function noteOpenAIFailure(error: unknown, task: string) {
  const { status, code } = failureMetadata(error);
  const quotaFailure =
    status === 429 ||
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted";
  const delayMs = quotaFailure ? 5 * 60_000 : 30_000;
  unavailableUntil = Math.max(unavailableUntil, Date.now() + delayMs);
  if (Date.now() - lastWarningAt < 30_000) return;
  lastWarningAt = Date.now();
  const detail = [status, code].filter(Boolean).join("/") || "request error";
  console.warn(
    `OpenAI ${task} unavailable (${detail}); using Da Vinci's deterministic fallback for ${Math.round(delayMs / 1000)} seconds.`,
  );
}
