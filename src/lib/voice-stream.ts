import type { PublicSession } from "../server/provider";

export type VoiceTurnPacket = { requestId: string; sequence: number } & (
  | { type: "state"; session: PublicSession }
  | { type: "speech"; session: PublicSession; delta: string }
  | { type: "done" }
  | { type: "error"; message: string; status: number }
);

/** Bounded NDJSON framing, independent of HTTP chunk/UTF-8 boundaries. */
export async function readVoiceTurn(
  body: ReadableStream<Uint8Array>,
  requestId: string,
  signal: AbortSignal,
  onPacket: (packet: VoiceTurnPacket) => Promise<void>,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let sequence = 0;
  let ended = false;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  const packet = async (line: string) => {
    if (line.length > 1_000_000) throw Error("Voice packet too large");
    const value = JSON.parse(line) as VoiceTurnPacket;
    if (!value || ended || value.requestId !== requestId || value.sequence !== sequence++)
      throw Error("Out-of-order voice stream");
    if (!["state", "speech", "done", "error"].includes(value.type))
      throw Error("Unknown voice packet");
    if (value.type === "state" || value.type === "speech") {
      if (!value.session || !Number.isInteger(value.session.version))
        throw Error("Invalid voice state");
      if (value.type === "speech" && (typeof value.delta !== "string" || !value.session.conversation))
        throw Error("Invalid voice speech");
    }
    if (value.type === "done" || value.type === "error") ended = true;
    await onPacket(value);
  };
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (line.trim()) await packet(line);
      }
      if (buffer.length > 1_000_000) throw Error("Voice packet too large");
      if (done) break;
    }
    if (buffer.trim()) await packet(buffer);
    if (!ended) throw Error("Voice stream ended before completion");
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
