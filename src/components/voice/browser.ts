import {
  childTurnTiming,
  looksLikeThinking,
  VoiceCallbacks,
  VoiceTransport,
} from "./transport";
import type { ConversationPresentation } from "@/lib/teaching/types";
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((e: {
        resultIndex: number;
        results: { isFinal: boolean; [n: number]: { transcript: string } }[];
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export class BrowserVoiceTransport implements VoiceTransport {
  private recognition: Recognition | null = null;
  private active = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private restartTimer: ReturnType<typeof setTimeout> | undefined;
  private finalText = "";
  private current: ConversationPresentation | null = null;
  private heardChars = 0;
  private speaking = false;
  private speechGeneration = 0;
  constructor(private callbacks: VoiceCallbacks) {}
  async connect() {
    const w = window as unknown as Record<string, unknown>,
      Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
        (new () => Recognition) | undefined;
    if (!Ctor || !("speechSynthesis" in window))
      throw Error(
        "Voice isn’t available in this browser. You can type or use the answer cards.",
      );
    this.callbacks.onStatus("connecting");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    stream.getTracks().forEach((t) => t.stop());
    this.recognition = new Ctor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.active = true;
    this.recognition.onresult = (e) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i],
          text = result[0].transcript.trim();
        if (this.isEcho(text)) continue;
        if (result.isFinal) this.finalText = `${this.finalText} ${text}`.trim();
        else partial += text;
      }
      const text = `${this.finalText} ${partial}`.trim();
      if (!text) return;
      if (this.speaking) {
        this.interrupt();
        this.callbacks.onInterrupt();
      }
      this.callbacks.onInterim(text);
      clearTimeout(this.timer);
      this.timer = setTimeout(
        () => {
          const final = `${this.finalText} ${partial}`.trim();
          this.finalText = "";
          if (final && this.active) this.callbacks.onTranscript(final);
        },
        looksLikeThinking(text)
          ? childTurnTiming.thinkingMs
          : childTurnTiming.silenceMs,
      );
    };
    this.recognition.onend = () => {
      if (this.active)
        this.restartTimer = setTimeout(() => {
          try {
            this.recognition?.start();
          } catch {
            /* already active */
          }
        }, 250);
    };
    this.recognition.onerror = (e) => {
      if (
        ["not-allowed", "service-not-allowed", "audio-capture"].includes(
          e.error,
        )
      ) {
        this.disconnect();
        this.callbacks.onStatus("unavailable");
        this.callbacks.onError(
          "Microphone access wasn’t available. You can keep going by typing.",
        );
      } else if (e.error !== "no-speech" && e.error !== "aborted")
        this.callbacks.onError(
          "Voice had a connection hiccup. Try again, or type your thought.",
        );
    };
    this.recognition.start();
    this.callbacks.onStatus("listening");
  }
  private isEcho(text: string) {
    if (!this.speaking || !this.current || !text) return false;
    const normalize = (t: string) =>
      t
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const t = normalize(text);
    return (
      t.length > 5 &&
      normalize(this.current.spokenText ?? this.current.text).includes(t)
    );
  }
  speak(p: ConversationPresentation) {
    if (!this.active) return;
    this.interrupt();
    this.current = p;
    this.heardChars = 0;
    this.speaking = true;
    const spoken = p.spokenText ?? p.text,
      generation = ++this.speechGeneration,
      utterance = new SpeechSynthesisUtterance(spoken);
    utterance.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          /samantha|zira|google us english/i.test(v.name),
      ) ?? voices.find((v) => v.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (generation === this.speechGeneration) {
        this.callbacks.onStatus("speaking");
        this.callbacks.onBoundary(0);
      }
    };
    utterance.onboundary = (e) => {
      if (generation !== this.speechGeneration) return;
      this.heardChars = e.charIndex;
      this.callbacks.onBoundary(
        spoken.slice(0, e.charIndex).trim().split(/\s+/).filter(Boolean).length,
      );
    };
    utterance.onend = () => {
      if (generation !== this.speechGeneration) return;
      this.heardChars = spoken.length;
      this.callbacks.onBoundary(spoken.split(/\s+/).length);
      this.callbacks.onReceipt({
        turnId: p.turnId,
        spokenText: spoken,
        interrupted: false,
      });
      this.speaking = false;
      this.current = null;
      this.callbacks.onStatus(p.paused ? "paused" : "listening");
    };
    utterance.onerror = () => {
      if (generation !== this.speechGeneration) return;
      this.interrupt();
      this.callbacks.onStatus("listening");
    };
    window.speechSynthesis.speak(utterance);
  }
  interrupt() {
    this.speechGeneration++;
    if (this.current && this.speaking)
      this.callbacks.onReceipt({
        turnId: this.current.turnId,
        spokenText: (this.current.spokenText ?? this.current.text)
          .slice(0, this.heardChars)
          .trimEnd(),
        interrupted: true,
      });
    this.current = null;
    this.speaking = false;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }
  disconnect() {
    this.active = false;
    clearTimeout(this.timer);
    clearTimeout(this.restartTimer);
    this.interrupt();
    this.recognition?.abort();
    this.recognition = null;
    this.finalText = "";
    this.callbacks.onStatus("idle");
  }
}
