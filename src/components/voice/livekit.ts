import { Room, RoomEvent, Track } from "livekit-client";
import type { PublicSession } from "@/server/provider";
import type { ConversationPresentation } from "@/lib/teaching/types";
import type { VoiceCallbacks, VoiceTransport } from "./transport";
export class LiveKitVoiceTransport implements VoiceTransport {
  private room = new Room({
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  private elements: HTMLMediaElement[] = [];
  private current: ConversationPresentation | undefined;
  private lastServerTurn = "";
  private intentionalDisconnect = false;
  private agentReady: (() => void) | undefined;
  constructor(
    private url: string,
    private token: string,
    private callbacks: VoiceCallbacks,
    private onSession: (s: PublicSession) => void,
  ) {}
  async connect() {
    this.callbacks.onStatus("connecting");
    const ready = new Promise<void>((resolve) => {
      this.agentReady = resolve;
    });
    this.room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.autoplay = true;
        el.muted = false;
        el.setAttribute("playsinline", "true");
        document.body.appendChild(el);
        this.elements.push(el);
        void el.play().catch(() => {
          this.callbacks.onError(
            "Your browser paused tutor audio. Press Start talking again to enable sound.",
          );
        });
      }
    });
    this.room.on(RoomEvent.DataReceived, (bytes, participant) => {
      if (
        !participant?.identity.startsWith("agent-") &&
        participant?.kind !== 4
      )
        return;
      try {
        const data = JSON.parse(new TextDecoder().decode(bytes));
        if (data.type === "session" && data.session?.conversation) {
          this.current = data.session.conversation;
          this.lastServerTurn = this.current!.turnId;
          this.onSession(data.session);
          this.agentReady?.();
          this.agentReady = undefined;
        }
        if (
          data.type === "status" &&
          ["listening", "speaking", "thinking", "paused"].includes(data.status)
        )
          this.callbacks.onStatus(data.status);
        if (data.type === "latency" && data.metric)
          this.callbacks.onMetric(data.metric);
      } catch {
        /* Ignore unrelated room packets. */
      }
    });
    this.room.on(RoomEvent.Reconnecting, () => {
      this.callbacks.onStatus("connecting");
    });
    this.room.on(RoomEvent.Reconnected, () => {
      this.callbacks.onStatus("listening");
    });
    this.room.on(RoomEvent.MediaDevicesError, () => {
      this.callbacks.onStatus("unavailable");
      this.callbacks.onError(
        "Microphone access wasn’t available. Your lesson is saved; type to continue.",
      );
    });
    this.room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      if (participant?.identity === this.room.localParticipant.identity) {
        const text = segments.map((s) => s.text).join(" ");
        this.callbacks.onInterim(text);
        return;
      }
      const text = segments.map((s) => s.text).join(" ");
      if (this.current) {
        const count = text.trim().split(/\s+/).filter(Boolean).length;
        this.callbacks.onBoundary(count);
      }
    });
    this.room.on(RoomEvent.Disconnected, () => {
      if (this.intentionalDisconnect) return;
      this.callbacks.onStatus("unavailable");
      this.callbacks.onError(
        "The voice connection ended. Your lesson is saved; reconnect or type to continue.",
      );
    });
    await this.room.connect(this.url, this.token);
    await this.room.startAudio();
    await this.room.localParticipant.setMicrophoneEnabled(true);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        ready,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                Error(
                  "The tutor voice worker did not join. Start it with npm run voice:dev, then reconnect.",
                ),
              ),
            15_000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }
  speak(p: ConversationPresentation) {
    this.current = p;
    if (p.turnId !== this.lastServerTurn)
      void this.room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "sync" })),
        { reliable: true },
      );
  }
  interrupt() {
    void this.room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "interrupt" })),
      { reliable: true },
    );
  }
  disconnect() {
    this.intentionalDisconnect = true;
    this.elements.forEach((e) => e.remove());
    this.elements = [];
    void this.room.disconnect();
  }
}
