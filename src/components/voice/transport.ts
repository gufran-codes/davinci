import type { ConversationPresentation } from "@/lib/teaching/types";
export type VoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "thinking"
  | "paused"
  | "unavailable";
export interface SpeechReceipt {
  turnId: string;
  spokenText: string;
  interrupted: boolean;
}
export interface VoiceLatencyMetric {
  type: "orchestration" | "stt" | "turn" | "tts";
  durationMs?: number;
  ttfbMs?: number;
  endOfUtteranceDelayMs?: number;
  transcriptionDelayMs?: number;
  at: number;
}
export interface VoiceCallbacks {
  onTranscript(text: string): void;
  onInterim(text: string): void;
  onStatus(status: VoiceStatus): void;
  onBoundary(words: number): void;
  onReceipt(receipt: SpeechReceipt): void;
  onError(message: string): void;
  onInterrupt(): void;
  onMetric(metric: VoiceLatencyMetric): void;
  onAudioLevel?(level: number): void;
}
export interface VoiceTransport {
  connect(): Promise<void>;
  speak(presentation: ConversationPresentation): void;
  interrupt(): void;
  disconnect(): void;
}
export const childTurnTiming = {
  silenceMs: 2100,
  thinkingMs: 3600,
  minInterruptionMs: 180,
  reminderMs: 45000,
};
export function looksLikeThinking(text: string) {
  return /(?:\b(?:um|umm|uh|well|maybe|think|it's|is|and)|\.\.\.)[ .?!]*$/i.test(
    text.trim(),
  );
}
