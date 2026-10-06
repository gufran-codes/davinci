import { Room, RoomEvent, Track } from "livekit-client";
import type { PublicSession } from "@/server/provider";
import type { ConversationPresentation } from "@/lib/teaching/types";
import type { VoiceCallbacks, VoiceTransport } from "./transport";
import { SpeechProgress } from "./speech-progress";
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
  private progress = new SpeechProgress();
  private intentionalDisconnect = false;
  private agentReady: (() => void) | undefined;
  private rejectReady: ((error: Error) => void) | undefined;
  private levelTimer: ReturnType<typeof setInterval> | undefined;
  constructor(
    private url: string,
    private token: string,
    private callbacks: VoiceCallbacks,
    private onSession: (s: PublicSession) => void,
  ) {}
  async connect() {
    this.callbacks.onStatus("connecting");
    const ready = new Promise<void>((resolve, reject) => {
      this.agentReady = resolve;
      this.rejectReady = reject;
    });
    void ready.catch(() => {});
    this.room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      this.callbacks.onPlaybackBlocked?.(!this.room.canPlaybackAudio);
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
          this.callbacks.onPlaybackBlocked?.(true);
        });
      }
    });
    this.room.on(RoomEvent.TrackUnsubscribed, (track) => {
      for (const element of track.detach()) {
        element.remove();
        this.elements = this.elements.filter((item) => item !== element);
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
        if (data.type === "error") {
          this.callbacks.onStatus("unavailable");
          this.callbacks.onError(
            "The tutor audio service stopped responding. Reconnect to continue, or type your answer.",
          );
          this.rejectReady?.(
            Error("The tutor audio service is unavailable. Please reconnect."),
          );
        }
        if (data.type === "session" && data.session?.conversation) {
          this.current = data.session.conversation;
          this.progress.reset(
            this.current!.turnId,
            this.current!.spokenText ?? this.current!.text,
            true,
          );
          this.callbacks.onBoundary(-1);
          this.lastServerTurn = this.current!.turnId;
          this.onSession(data.session);
          this.agentReady?.();
          this.agentReady = undefined;
          this.rejectReady = undefined;
        }
        if (
          data.type === "status" &&
          ["listening", "speaking", "thinking", "paused"].includes(data.status)
        ) {
          if (data.turnId && data.turnId !== this.current?.turnId) return;
          if (data.status === "speaking") this.progress.start();
          else this.progress.stop();
          this.callbacks.onStatus(data.status);
        }
        if (data.type === "speech_progress" && this.room.canPlaybackAudio) {
          const count = this.progress.finish(data.turnId, data.words);
          if (count !== null) this.callbacks.onBoundary(count);
        }
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
      this.callbacks.onStatus("connecting");
      void this.room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "sync" })),
        { reliable: true },
      );
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
      if (
        this.current &&
        this.room.canPlaybackAudio &&
        (participant?.identity.startsWith("agent-") || participant?.kind === 4)
      ) {
        const count = this.progress.update(segments);
        if (count !== null) this.callbacks.onBoundary(count);
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
    if (this.intentionalDisconnect) {
      await this.room.disconnect();
      return;
    }
    await this.room
      .startAudio()
      .catch(() => this.callbacks.onPlaybackBlocked?.(true));
    await this.room.localParticipant.setMicrophoneEnabled(true);
    if (this.intentionalDisconnect) {
      await this.room.disconnect();
      return;
    }
    // A newly mounted page may be joining an existing tutor. Its onEnter hook
    // will not run again; request the saved turn without duplicating a new job's greeting.
    await this.room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "join" })),
      { reliable: true },
    );
    this.levelTimer = setInterval(
      () =>
        this.callbacks.onAudioLevel?.(
          Math.min(1, this.room.localParticipant.audioLevel ?? 0),
        ),
      80,
    );
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        ready,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                Error(
                  "Da Vinci couldn’t connect to voice. Ask a grown-up to check the connection, then try again. You can keep typing.",
                ),
              ),
            30_000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }
  async enableAudio() {
    await this.room.startAudio();
    await Promise.all(this.elements.map((element) => element.play()));
    this.callbacks.onPlaybackBlocked?.(false);
    // Replay the saved turn: the initial greeting may have played while blocked.
    await this.room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "sync" })),
      { reliable: true },
    );
  }
  speak(p: ConversationPresentation) {
    this.current = p;
    this.progress.reset(p.turnId, p.spokenText ?? p.text);
    if (p.turnId !== this.lastServerTurn)
      void this.room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "sync" })),
        { reliable: true },
      );
  }
  interrupt() {
    this.progress.stop(true);
    this.callbacks.onInterrupt();
    void this.room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "interrupt" })),
      { reliable: true },
    );
  }
  disconnect() {
    this.progress.stop(true);
    this.intentionalDisconnect = true;
    this.rejectReady?.(Error("Voice connection cancelled."));
    this.rejectReady = undefined;
    this.agentReady = undefined;
    this.elements.forEach((e) => {
      e.pause();
      e.srcObject = null;
      e.remove();
    });
    this.elements = [];
    clearInterval(this.levelTimer);
    this.callbacks.onAudioLevel?.(0);
    void this.room.disconnect();
  }
}
