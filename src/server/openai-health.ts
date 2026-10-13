import { createHash } from "node:crypto";

let unavailableUntil = 0;
let lastWarningAt = 0;
let reason:
  | "credentials"
  | "quota"
  | "timeout"
  | "configuration"
  | "response"
  | "temporary" = "temporary";
let lastRequestFailed = false;
let configuration = "";

function syncConfiguration() {
  // A hot-reloaded key/model must not inherit the previous configuration's
  // cooldown. The fingerprint is private and never returned or logged.
  const next = createHash("sha256")
    .update(
      JSON.stringify([
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_BASE_URL,
        process.env.OPENAI_MODEL,
        process.env.OPENAI_INTERPRETER_MODEL,
        process.env.OPENAI_TUTOR_MODEL,
      ]),
    )
    .digest("hex");
  if (configuration === next) return;
  configuration = next;
  lastRequestFailed = false;
  unavailableUntil = 0;
  lastWarningAt = 0;
}

export function noteOpenAISuccess() {
  syncConfiguration();
  lastRequestFailed = false;
  unavailableUntil = 0;
}

export function conversationServiceStatus() {
  syncConfiguration();
  return !process.env.OPENAI_API_KEY
    ? { mode: "limited" as const, reason: "not_configured" }
    : lastRequestFailed
      ? { mode: "limited" as const, reason }
      : { mode: "available" as const, reason: null };
}

function failureMetadata(error: unknown) {
  const value = error as {
    status?: number;
    code?: string;
    error?: { type?: string; code?: string };
    constructor?: { name?: string };
  };
  const rawCode = value?.code ?? value?.error?.code ?? value?.error?.type;
  return {
    status: value?.status,
    code:
      typeof rawCode === "string" && /^[a-zA-Z0-9_]{1,60}$/.test(rawCode)
        ? rawCode
        : undefined,
    type: value?.constructor?.name,
  };
}

export function openAIAvailable() {
  syncConfiguration();
  return Boolean(process.env.OPENAI_API_KEY) && Date.now() >= unavailableUntil;
}

export function noteOpenAIFailure(error: unknown, task: string) {
  syncConfiguration();
  lastRequestFailed = true;
  const { status, code, type } = failureMetadata(error);
  const quotaFailure =
    status === 429 ||
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted";
  const delayMs = quotaFailure ? 5 * 60_000 : 30_000;
  reason =
    status === 401 || status === 403
      ? "credentials"
      : quotaFailure
        ? "quota"
        : type === "APIConnectionTimeoutError" || code === "ETIMEDOUT"
          ? "timeout"
          : status === 400 || status === 404
            ? "configuration"
            : type === "ZodError" ||
                type === "SyntaxError" ||
                type === "LengthFinishReasonError"
              ? "response"
              : "temporary";
  unavailableUntil = Math.max(unavailableUntil, Date.now() + delayMs);
  if (Date.now() - lastWarningAt < 30_000) return;
  lastWarningAt = Date.now();
  const detail = [status, code].filter(Boolean).join("/") || reason;
  console.warn(
    `OpenAI ${task} unavailable (${detail}); using Da Vinci's deterministic fallback for ${Math.round(delayMs / 1000)} seconds.`,
  );
}
