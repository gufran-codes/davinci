import type { Child } from "../../lib/types";
import type { ConversationInput } from "../conversation";
import type { VoiceTurnPacket } from "../../lib/voice-stream";
import { conversationTurn } from "../understanding";
import { HttpError, learnerFor } from "../repository";
import { publicSession } from "../provider";
import type { SpeechDelivery } from "./streaming-speech";

/** Authentication and rate limiting are performed by the route before this
 * response is created. Every speech event follows a checked SQLite commit. */
export function voiceTurnResponse(
  requestSignal: AbortSignal,
  child: Child,
  id: string,
  input: ConversationInput,
  run = (delivery: SpeechDelivery) => conversationTurn(child, id, input, undefined, undefined, delivery),
) {
  const cancelled = new AbortController();
  const signal = AbortSignal.any([requestSignal, cancelled.signal, AbortSignal.timeout(55_000)]);
  let sequence = 0;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (packet: VoiceTurnPacket extends infer T ? T extends VoiceTurnPacket ? Omit<T, "requestId" | "sequence"> : never : never) => {
        if (requestSignal.aborted || cancelled.signal.aborted) return;
        controller.enqueue(new TextEncoder().encode(JSON.stringify({
          ...packet, requestId: input.requestId, sequence: sequence++,
        }) + "\n"));
      };
      const snapshot = async (session: Parameters<typeof publicSession>[0]) => {
        signal.throwIfAborted();
        const result = await publicSession(session, learnerFor(child.id), { grade: child.grade, age: child.age });
        signal.throwIfAborted();
        return result;
      };
      void (async () => {
        try {
          await run({
            signal,
            async onState(session) { send({ type: "state", session: await snapshot(session) }); },
            async onSpeech(session, delta) { send({ type: "speech", session: await snapshot(session), delta }); },
          });
          signal.throwIfAborted();
          send({ type: "done" });
        } catch (error) {
          send({
            type: "error",
            status: error instanceof HttpError ? error.status : 503,
            message: error instanceof HttpError ? error.message : "The tutor connection was interrupted. Please try again.",
          });
        } finally {
          if (!cancelled.signal.aborted) controller.close();
        }
      })();
    },
    cancel() { cancelled.abort(); },
  });
  return new Response(body, { headers: {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
