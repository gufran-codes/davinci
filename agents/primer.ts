import { ReadableStream } from "node:stream/web";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { cli, defineAgent, ServerOptions, voice, llm } from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as cartesia from "@livekit/agents-plugin-cartesia";
import * as silero from "@livekit/agents-plugin-silero";
import { RoomEvent } from "@livekit/rtc-node";
import type { PublicSession } from "../src/server/provider";
import { voiceStatusPacket } from "./protocol";

type LatencyMetric = {
  type: "orchestration" | "stt" | "turn" | "tts";
  durationMs?: number;
  ttfbMs?: number;
  endOfUtteranceDelayMs?: number;
  transcriptionDelayMs?: number;
  at: number;
};
// The pipeline identifies this as an LLM stage, but all decisions are supplied
// by Da Vinci's authenticated orchestrator. No generic model can bypass it.
class PrimerPolicyStage extends llm.LLM {
  label() {
    return "primer-policy";
  }
  chat(): llm.LLMStream {
    throw Error("Use the Da Vinci agent llmNode.");
  }
}
export default defineAgent({
  entry: async (ctx) => {
    const metadata = JSON.parse(ctx.job.metadata || "{}") as {
      sessionId: string;
      token: string;
    };
    if (!metadata.sessionId || !metadata.token)
      throw Error("Missing authenticated Da Vinci session");
    const origin = process.env.PRIMER_SERVER_URL;
    if (!origin)
      throw Error(
        "Set PRIMER_SERVER_URL to the private Da Vinci server origin.",
      );
    let state: PublicSession;
    let receiptQueue: Promise<unknown> = Promise.resolve();
    let latestTranscript = "";
    let initialSpeechStarted = false;
    const presentations = new Map<
      string,
      NonNullable<PublicSession["conversation"]>
    >();
    async function call(data: Record<string, unknown>) {
      const r = await fetch(`${origin}/api/voice/worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${metadata.token}`,
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(30000),
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error ?? "Da Vinci connection failed");
      return body;
    }
    async function publish(session: PublicSession) {
      if (state && session.version < state.version) return;
      state = session;
      if (session.conversation)
        presentations.set(session.conversation.turnId, session.conversation);
      await ctx.room.localParticipant?.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "session", session })),
        { reliable: true },
      );
    }
    async function reportMetric(metric: LatencyMetric) {
      await ctx.room.localParticipant?.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "latency", metric })),
        { reliable: true },
      );
      receiptQueue = receiptQueue
        .then(() => call({ action: "metric", metric }))
        .catch((error) =>
          console.warn(
            "Voice metric was not saved:",
            error instanceof Error ? error.message : "unknown",
          ),
        );
    }
    class PrimerAgent extends voice.Agent {
      constructor() {
        super({
          instructions:
            "Speak only the educational text returned by the Da Vinci orchestrator.",
          llm: new PrimerPolicyStage(),
        });
      }
      async onEnter() {
        const result = await call({ action: "greet" });
        await publish(result.session);
        if (state.state === "COMPLETE") return;
        this.session.say(
          state.conversation!.spokenText ?? state.conversation!.text,
          {
            allowInterruptions: true,
          },
        );
        initialSpeechStarted = true;
      }
      async onUserTurnCompleted(
        _context: llm.ChatContext,
        message: llm.ChatMessage,
      ) {
        latestTranscript = message.textContent ?? "";
      }
      async llmNode() {
        await receiptQueue;
        const startedAt = performance.now();
        const result = await call({
          action: "turn",
          requestId: randomUUID(),
          version: state.version,
          transcript: latestTranscript,
        });
        void reportMetric({
          type: "orchestration",
          durationMs: Math.round(performance.now() - startedAt),
          at: Date.now(),
        });
        await publish(result.session);
        const text =
          state.state === "COMPLETE"
            ? ""
            : (state.conversation!.spokenText ?? state.conversation!.text);
        return new ReadableStream<string>({
          start(controller) {
            if (text) controller.enqueue(text);
            controller.close();
          },
        });
      }
    }
    const session = new voice.AgentSession({
      stt: new deepgram.STT({
        model: process.env.DEEPGRAM_MODEL ?? "nova-3",
        fillerWords: true,
        endpointing: 500,
        utteranceEndMs: 2500,
        mipOptOut: true,
      }),
      tts: new cartesia.TTS({
        model: process.env.CARTESIA_MODEL ?? "sonic-3",
        ...(process.env.CARTESIA_VOICE_ID
          ? { voice: process.env.CARTESIA_VOICE_ID }
          : {}),
      }),
      vad: await silero.VAD.load(),
      turnHandling: {
        turnDetection: "vad",
        endpointing: { mode: "fixed", minDelay: 2200, maxDelay: 6000 },
        interruption: {
          enabled: true,
          mode: "vad",
          minDuration: 180,
          minWords: 0,
          resumeFalseInterruption: false,
        },
        preemptiveGeneration: { enabled: false },
      },
      useTtsAlignedTranscript: true,
      userAwayTimeout: null,
    });
    session.on(voice.AgentSessionEventTypes.Error, () => {
      void ctx.room.localParticipant?.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "error" })),
        { reliable: true },
      );
    });
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, (e) => {
      void ctx.room.localParticipant?.publishData(
        new TextEncoder().encode(
          JSON.stringify(voiceStatusPacket(e.newState, state)),
        ),
        { reliable: true },
      );
    });
    session.on(voice.AgentSessionEventTypes.MetricsCollected, (e) => {
      const metric = e.metrics;
      if (metric.type === "eou_metrics") {
        void reportMetric({
          type: "turn",
          endOfUtteranceDelayMs: metric.endOfUtteranceDelayMs,
          transcriptionDelayMs: metric.transcriptionDelayMs,
          at: Date.now(),
        });
      } else if (metric.type === "tts_metrics") {
        void reportMetric({
          type: "tts",
          durationMs: metric.durationMs,
          ttfbMs: metric.ttfbMs,
          at: Date.now(),
        });
      } else if (metric.type === "stt_metrics") {
        void reportMetric({
          type: "stt",
          durationMs: metric.audioDurationMs,
          at: Date.now(),
        });
      }
    });
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (e) => {
      if (e.item.type !== "message" || e.item.role !== "assistant") return;
      const text = e.item.textContent ?? "";
      const p = [...presentations.values()]
        .reverse()
        .find((p) => (p.spokenText ?? p.text).startsWith(text));
      if (!p) return;
      const interrupted = e.item.interrupted;
      void ctx.room.localParticipant?.publishData(
        new TextEncoder().encode(
          JSON.stringify({
            type: "speech_progress",
            turnId: p.turnId,
            words: text.trim().split(/\s+/).filter(Boolean).length,
            interrupted,
          }),
        ),
        { reliable: true },
      );
      receiptQueue = receiptQueue
        .then(() =>
          call({
            action: "speech",
            turnId: p.turnId,
            spokenText: text,
            interrupted,
          }),
        )
        .catch((error) =>
          console.warn(
            "Speech receipt was not saved:",
            error instanceof Error ? error.message : "unknown",
          ),
        );
    });
    ctx.room.on(RoomEvent.DataReceived, (bytes, participant) => {
      if (!participant?.identity.startsWith("child-")) return;
      try {
        const message = JSON.parse(new TextDecoder().decode(bytes));
        if (message.type === "interrupt") session.interrupt({ force: true });
        if (
          (message.type === "sync" || message.type === "join") &&
          initialSpeechStarted
        )
          void call({ action: "greet" })
            .then(async (result) => {
              session.interrupt({ force: true });
              await publish(result.session);
              if (state.state === "COMPLETE") return;
              session.say(
                state.conversation!.spokenText ?? state.conversation!.text,
                { allowInterruptions: true },
              );
            })
            .catch(() => {
              void ctx.room.localParticipant?.publishData(
                new TextEncoder().encode(JSON.stringify({ type: "error" })),
                { reliable: true },
              );
            });
      } catch {
        /* Invalid control messages have no effect. */
      }
    });
    await ctx.connect();
    await ctx.waitForParticipant();
    await session.start({
      agent: new PrimerAgent(),
      room: ctx.room,
      record: false,
    });
  },
});
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "primer-tutor",
  }),
);
