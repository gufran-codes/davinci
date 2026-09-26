// Voice I/O for lessons. Browser-native speech is the default provider (free,
// no keys): Web Speech recognition for the mic, speech synthesis for tutor
// messages. To swap in Deepgram/Cartesia later, reimplement listenOnce/speak
// behind these same signatures; all lesson wiring stays untouched.
export function voiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return (
    typeof w.SpeechRecognition !== "undefined" ||
    typeof w.webkitSpeechRecognition !== "undefined" ||
    "speechSynthesis" in window
  );
}
// Recognition alone — the mic button must use this, not voiceSupported().
// (Firefox/Safari speak but can't listen; showing a mic there just errors.)
export function micSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return (
    typeof w.SpeechRecognition !== "undefined" ||
    typeof w.webkitSpeechRecognition !== "undefined"
  );
}
export function listenOnce(lang = "en-US"): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    const Ctor =
      (w.SpeechRecognition as new () => SpeechRecognizer) ??
      (w.webkitSpeechRecognition as new () => SpeechRecognizer);
    if (!Ctor) {
      reject(new Error("Voice input is not supported in this browser."));
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    const done = (fn: () => void) => {
      try {
        rec.abort();
      } catch {
        /* already finished */
      }
      fn();
    };
    rec.onresult = (e: SpeechResultEvent) =>
      done(() => resolve(e.results[0]?.[0]?.transcript.trim() ?? ""));
    rec.onerror = (e: SpeechErrorEvent) =>
      done(() =>
        reject(new Error(`Voice input hiccup (${e.error}). Try again.`)),
      );
    rec.onnomatch = () =>
      done(() => reject(new Error("Didn't catch that. Try again.")));
    try {
      rec.start();
    } catch {
      reject(new Error("Voice input is busy. Try again."));
    }
  });
}
interface SpeechRecognizer {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onnomatch: (() => void) | null;
  start(): void;
  abort(): void;
}
interface SpeechResultEvent {
  results: { [index: number]: { transcript: string } }[];
}
interface SpeechErrorEvent {
  error: string;
}
export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const voice = synth
    .getVoices()
    .find(
      (v) =>
        v.lang.startsWith("en") &&
        /female|samantha|zira|google us english/i.test(v.name),
    );
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window)
    window.speechSynthesis.cancel();
}
// Match a transcript to one of the visible answer choices. Returns null when
// nothing matches so the child always confirms before submitting.
export function matchChoice(
  transcript: string,
  choices: string[],
): string | null {
  const said = transcript.trim().toLowerCase();
  if (!said) return null;
  const words = (s: string) =>
    s
      .toLowerCase()
      .split(/[^a-z0-9/]+/)
      .filter(Boolean);
  const saidWords = new Set(words(said));
  let best: string | null = null;
  let bestScore = 0;
  for (const choice of choices) {
    const parts = words(choice);
    if (!parts.length) continue;
    const hit = parts.filter((w) => saidWords.has(w)).length / parts.length;
    if (hit > bestScore) {
      bestScore = hit;
      best = choice;
    }
  }
  return bestScore >= 0.5 ? best : null;
}
