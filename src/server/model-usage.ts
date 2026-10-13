import { AsyncLocalStorage } from "node:async_hooks";
import type { ModelRole } from "./openai-settings";
import type { LearningSession } from "../lib/types";
import { event } from "./repository";

type Usage = {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: {
    cached_tokens?: number;
    cache_write_tokens?: number;
  };
  output_tokens_details?: { reasoning_tokens?: number };
};
const scope = new AsyncLocalStorage<{
  session: LearningSession;
  requestId: string;
}>();
export function withModelUsage<T>(
  session: LearningSession,
  requestId: string,
  work: () => Promise<T>,
) {
  return scope.run({ session, requestId }, work);
}

/** USD estimate, Standard short-context rates checked 2026-10-10. Unknown
 * models/tiers are null, never zero. This is not a provider invoice. */
export function usageEstimate(
  model: string,
  usage: Usage,
  tier?: string | null,
) {
  const rates = /^gpt-6\.1-sol(?:-|$)/.test(model)
    ? [2, 0.1, 2.5, 10]
    : /^gpt-6-luna(?:-|$)/.test(model)
      ? [0.1, 0.01, 0.125, 0.5]
      : null;
  if (
    !rates ||
    (tier && !["default", "standard", "auto"].includes(tier)) ||
    usage.input_tokens > 272000
  )
    return null;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  const writes = usage.input_tokens_details?.cache_write_tokens ?? 0;
  return (
    (Math.max(0, usage.input_tokens - cached - writes) * rates[0] +
      cached * rates[1] +
      writes * rates[2] +
      usage.output_tokens * rates[3]) /
    1_000_000
  );
}

export async function trackModelRequest<
  T extends {
    model: string;
    status?: string;
    service_tier?: string | null;
    usage?: Usage | null;
  },
>(role: ModelRole, work: () => Promise<T>): Promise<T> {
  const started = Date.now();
  const context = scope.getStore();
  const record = (metadata: Record<string, unknown>) => {
    if (!context) return;
    try {
      event(context.session, "model_usage", {
        requestId: context.requestId,
        role,
        durationMs: Date.now() - started,
        ...metadata,
      });
    } catch {
      console.warn("Unable to record model usage metadata.");
    }
  };
  try {
    const response = await work();
    const u = response.usage;
    record({
      model: response.model,
      serviceTier: response.service_tier ?? null,
      status: response.status ?? "completed",
      inputTokens: u?.input_tokens ?? null,
      outputTokens: u?.output_tokens ?? null,
      cachedInputTokens: u?.input_tokens_details?.cached_tokens ?? null,
      cacheWriteTokens: u?.input_tokens_details?.cache_write_tokens ?? null,
      reasoningTokens: u?.output_tokens_details?.reasoning_tokens ?? null,
      estimatedUsd: u
        ? usageEstimate(response.model, u, response.service_tier)
        : null,
      pricingDate: "2026-10-10",
    });
    return response;
  } catch (error) {
    record({ status: "failed", estimatedUsd: null, usageUnavailable: true });
    throw error;
  }
}
