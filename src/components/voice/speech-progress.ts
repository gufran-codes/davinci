/** LiveKit can send multiple partial/final segments for one utterance. Count a
 * contiguous prefix of the current turn, never each packet independently. */
export class SpeechProgress {
  private turnId = "";
  private speech = "";
  private segments = new Map<string, string>();
  private retired = new Set<string>();
  private count = 0;
  private accepting = false;
  private cancelled = false;
  reset(turnId: string, speech: string, replay = false) {
    if (turnId === this.turnId && !replay) return;
    for (const id of this.segments.keys()) this.retired.add(id);
    this.retired = new Set([...this.retired].slice(-200));
    this.turnId = turnId;
    this.speech = speech;
    this.segments.clear();
    this.count = 0;
    this.accepting = false;
    this.cancelled = false;
  }
  start() {
    if (!this.cancelled) this.accepting = true;
  }
  stop(cancelled = false) {
    this.accepting = false;
    this.cancelled ||= cancelled;
  }
  update(segments: { id: string; text: string }[]) {
    if (!this.accepting) return null;
    for (const segment of segments)
      if (!this.retired.has(segment.id))
        this.segments.set(segment.id, segment.text);
    const normalize = (text: string) =>
      text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const expected = this.speech.trim().split(/\s+/).filter(Boolean);
    const delivered = normalize([...this.segments.values()].join(" "));
    let prefix = "",
      count = 0;
    for (const word of expected) {
      prefix += normalize(word);
      if (!delivered.startsWith(prefix)) break;
      count++;
    }
    this.count = Math.max(this.count, count);
    return this.count;
  }
  finish(turnId: string, count: number) {
    if (turnId !== this.turnId) return null;
    if (this.cancelled || !Number.isFinite(count)) return null;
    this.accepting = false;
    this.count = Math.min(
      this.speech.trim().split(/\s+/).length,
      Math.max(this.count, count),
    );
    return this.count;
  }
}
