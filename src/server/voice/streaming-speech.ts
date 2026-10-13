import type { Child, LearningSession } from "../../lib/types";
import { completeSpeechChunk } from "../../lib/conversation/speech-chunks";
import { responsePlan, responseQuality } from "../../lib/conversation/grounding";
import { replaceTutorSpeech } from "../conversation";
import { HttpError, sessionById } from "../repository";

export interface SpeechDelivery {
  signal: AbortSignal;
  /** A committed state update, without permission to speak the draft. */
  onState(session: LearningSession): Promise<void>;
  /** Only persisted, checked text; delta extends the last approved prefix. */
  onSpeech(session: LearningSession, delta: string): Promise<void>;
}

export async function streamTutorSpeech(
  child: Child,
  next: LearningSession,
  delivery: SpeechDelivery,
  generate: (onChunk: (chunk: string) => Promise<void>) => Promise<string>,
) {
  const presentation = next.conversation!;
  const draft = presentation.spokenText ?? presentation.text;
  const requiredQuestion = responsePlan(next).requiredQuestion;
  let prefix = "";
  let current = next;
  const failures: string[] = [];
  const commit = async (
    text: string,
    status: "streaming" | "complete" | "interrupted",
    publish = true,
  ) => {
    if (publish) delivery.signal.throwIfAborted();
    const delta = text.slice(prefix.length);
    current = replaceTutorSpeech(child, next.id, {
      turnId: presentation.turnId,
      version: next.version,
      spokenText: text,
      quality: { attempts: 1, checks: [...failures], usedFallback: failures.length > 0 },
      stream: { expectedText: prefix || draft, first: !prefix, status, draft },
    });
    prefix = text;
    if (publish) await delivery.onSpeech(current, delta);
  };
  try {
    const final = await generate(async (chunk) => {
      delivery.signal.throwIfAborted();
      if (!completeSpeechChunk(chunk, requiredQuestion))
        throw Error("incomplete_speech_chunk");
      const candidate = prefix ? `${prefix} ${chunk}` : chunk;
      const checks = responseQuality(next, candidate, { partial: true });
      if (checks.length) {
        failures.push(...checks);
        throw Error("stream_quality_failed");
      }
      await commit(candidate, "streaming");
    });
    if (!prefix || final !== prefix) throw Error("stream_final_mismatch");
    const checks = responseQuality(next, prefix);
    if (checks.length) {
      failures.push(...checks);
      throw Error("stream_final_quality_failed");
    }
    await commit(prefix, "complete");
    return current;
  } catch (error) {
    // Cancellation and concurrent turns must never append a fallback, replay
    // earlier text, or mutate whichever task is active now.
    if (delivery.signal.aborted || (error instanceof HttpError && error.status === 409)) {
      if (prefix) {
        try { await commit(prefix, "interrupted", false); } catch { /* Superseded. */ }
      }
      throw error;
    }
    failures.push("stream_incomplete");
    if (!prefix) {
      delivery.signal.throwIfAborted();
      // Nothing was emitted. Keep the already verified authored draft.
      current = sessionById(next.id);
      if (current.version !== next.version || current.conversation?.turnId !== presentation.turnId)
        throw new HttpError(409, "Speech turn is no longer active.");
      return current;
    }
    // A prefix cannot be repaired in place. Retain it and, if needed, append
    // only the exact approved task prompt. No second model call after speech.
    const finished = requiredQuestion && !prefix.includes(requiredQuestion)
      ? `${prefix} ${requiredQuestion}` : prefix;
    if (!responseQuality(next, finished).length) await commit(finished, "complete");
    else await commit(prefix, "interrupted");
    return current;
  }
}
