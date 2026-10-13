/** Keep pause detection adjustable for learners who need more thinking time. */
export function voiceEndDelay(raw?: string) {
  const value = raw?.trim() ? Number(raw) : 1200;
  return Number.isFinite(value) ? Math.min(4000, Math.max(800, value)) : 1200;
}

/** A contextual detector can finish a complete thought sooner while holding
 * an unfinished one. VAD fallback keeps the original thinking-time default. */
export function voiceTurnHandling(raw: string | undefined, contextual: boolean) {
  const configured = raw?.trim() ? Number(raw) : NaN;
  return {
    endpointing: {
      mode: "fixed" as const,
      minDelay: contextual
        ? Number.isFinite(configured) ? Math.min(4000, Math.max(600, configured)) : 600
        : voiceEndDelay(raw),
      maxDelay: 6000,
    },
    interruption: {
      enabled: true,
      mode: "vad" as const,
      minDuration: 500,
      minWords: 0,
      resumeFalseInterruption: true,
      falseInterruptionTimeout: 1500,
    },
    // Grading and progression have side effects; never speculate on a draft transcript.
    preemptiveGeneration: { enabled: false },
  };
}

/** AgentSession emits initializing before onEnter has fetched the lesson. */
export function voiceStatusPacket(
  status: string,
  session?: { conversation?: { turnId: string } },
) {
  return {
    type: "status" as const,
    status,
    ...(session?.conversation ? { turnId: session.conversation.turnId } : {}),
  };
}

/** Untargeted syncs are explicit reconnect/playback recovery. Ordinary canvas
 * updates identify a turn and must neither replay it twice nor replay a stale one. */
export function shouldSyncSpeech(
  requested: unknown,
  current: string | undefined,
  lastSpoken: string | undefined,
) {
  return (
    requested === undefined ||
    (typeof requested === "string" &&
      requested === current &&
      requested !== lastSpoken)
  );
}
