import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { cli, defineAgent, ServerOptions, voice, llm, inference } from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as cartesia from "@livekit/agents-plugin-cartesia";
import * as silero from "@livekit/agents-plugin-silero";
import { RoomEvent } from "@livekit/rtc-node";
import type { PublicSession } from "../src/server/provider";
import { voiceStatusPacket, shouldSyncSpeech, voiceEndDelay, voiceTurnHandling } from "./protocol";
import { VoicePersistence } from "./persistence";
import { VoiceTurnStreams } from "./turn-stream";
import { readVoiceTurn } from "../src/lib/voice-stream";

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
    const persistence = new VoicePersistence((kind, error) => {
      console.warn(
        `Voice ${kind} was not saved:`,
        error instanceof Error ? error.message : "unknown",
      );
    });
    let latestTranscript = "";
    let lastSpokenTurnId: string | undefined;
    let initialSpeechStarted = false;
    const turns = new VoiceTurnStreams();
    const presentations = new Map<
      string,
      NonNullable<PublicSession["conversation"]>
    >();
    async function call(data: Record<string, unknown>, timeoutMs = 60000) {
      const r = await fetch(`${origin}/api/voice/worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${metadata.token}`,
        },
        body: JSON.stringify(data),
        // A Sol turn may interpret (15s), speak (20s), then repair once (20s).
        // Keep the transport alive until those bounded server stages finish.
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error ?? "Da Vinci connection failed");
      return body;
    }
    async function publish(session: PublicSession, progressive = false) {
      if (state && session.version < state.version) return;
      state = session;
      if (session.conversation)
        presentations.set(session.conversation.turnId, session.conversation);
      await ctx.room.localParticipant?.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "session", session, progressive })),
        { reliable: true },
      );
    }
    async function reportMetric(metric: LatencyMetric) {
      persistence.metric(() => call({ action: "metric", metric }, 3000));
      try {
        await ctx.room.localParticipant?.publishData(
          new TextEncoder().encode(JSON.stringify({ type: "latency", metric })),
          { reliable: true },
        );
      } catch {
        // A telemetry packet must never fail speech or produce an unhandled rejection.
      }
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
        lastSpokenTurnId = state.conversation!.turnId;
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
        turns.cancel();
        latestTranscript = message.textContent ?? "";
      }
      async llmNode() {
        const transcript = latestTranscript;
        const requestId = randomUUID();
        return turns.create(async (signal, emit) => {
          const startedAt = performance.now();
          await persistence.beforeTurn();
          signal.throwIfAborted();
          const response = await fetch(`${origin}/api/voice/worker`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/x-ndjson",
              Authorization: `Bearer ${metadata.token}`,
            },
            body: JSON.stringify({ action: "turn", requestId, version: state.version, transcript }),
            signal,
          });
          if (!response.ok || !response.body) throw Error("Da Vinci connection failed");
          let prefix = "";
          let turnId: string | undefined;
          let firstTextMs: number | undefined;
          await readVoiceTurn(response.body, requestId, signal, async (packet) => {
            signal.throwIfAborted();
            if (packet.type === "error") throw Error(packet.message);
            if (packet.type === "done") return;
            const incoming = packet.session;
            if (incoming.version < state.version) throw new DOMException("Superseded turn", "AbortError");
            if (packet.type === "state") {
              // Keep the committed version even if the student interrupts the
              // renderer. The deterministic draft is not audio permission.
              state = incoming;
              if (incoming.state === "COMPLETE") await publish(incoming, true);
              return;
            }
            const presentation = incoming.conversation!;
            if ((turnId && presentation.turnId !== turnId) ||
                (presentation.spokenText ?? presentation.text) !== prefix + packet.delta)
              throw Error("Voice speech prefix changed");
            turnId = presentation.turnId;
            prefix += packet.delta;
            await publish(incoming, true);
            signal.throwIfAborted();
            if (incoming.state === "COMPLETE") return;
            lastSpokenTurnId = turnId;
            if (packet.delta && firstTextMs === undefined) firstTextMs = Math.round(performance.now() - startedAt);
            emit(packet.delta);
          });
          void reportMetric({
            type: "orchestration",
            durationMs: Math.round(performance.now() - startedAt),
            ttfbMs: firstTextMs,
            at: Date.now(),
          });
        }, () => {
          void ctx.room.localParticipant?.publishData(
            new TextEncoder().encode(JSON.stringify({ type: "error" })),
            { reliable: true },
          );
        });
      }
    }
    const session = new voice.AgentSession({
      stt: new deepgram.STT({
        model: process.env.DEEPGRAM_MODEL ?? "nova-3",
        fillerWords: true,
        endpointing: 500,
        utteranceEndMs: Math.max(
          1000,
          voiceEndDelay(process.env.PRIMER_VOICE_END_DELAY_MS),
        ),
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
        ...voiceTurnHandling(process.env.PRIMER_VOICE_END_DELAY_MS, process.env.PRIMER_VOICE_TURN_DETECTION !== "vad"),
        turnDetection: process.env.PRIMER_VOICE_TURN_DETECTION === "vad"
          ? "vad" : new inference.TurnDetector({ version: "v1-mini" }),
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
      persistence.receipt(() =>
        call(
          {
            action: "speech",
            turnId: p.turnId,
            spokenText: text,
            interrupted,
          },
          5000,
        ),
      );
    });
    ctx.room.on(RoomEvent.DataReceived, (bytes, participant) => {
      if (!participant?.identity.startsWith("child-")) return;
      try {
        const message = JSON.parse(new TextDecoder().decode(bytes));
        if (message.type === "interrupt") {
          turns.cancel();
          session.interrupt({ force: true });
        }
        if (
          (message.type === "sync" || message.type === "join") &&
          initialSpeechStarted
        ) {
          const epoch = turns.epoch;
          void call({ action: "greet" })
            .then(async (result) => {
              if (epoch !== turns.epoch) return;
              if (state && result.session.version < state.version) return;
              const turnId = result.session.conversation?.turnId;
              // Delayed or duplicate canvas sync must not restart newer speech.
              if (!shouldSyncSpeech(message.turnId, turnId, lastSpokenTurnId))
                return;
              lastSpokenTurnId = turnId;
              turns.cancel();
              session.interrupt({ force: true });
              await publish(result.session);
              if (
                state.state === "COMPLETE" ||
                state.conversation?.turnId !== turnId
              )
                return;
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
        }
      } catch {
        /* Invalid control messages have no effect. */
      }
    });
    ctx.room.on(RoomEvent.Disconnected, () => turns.cancel());
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
