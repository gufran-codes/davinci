"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  Mic,
  MicOff,
  Keyboard,
  Volume2,
  Leaf,
  ArrowRight,
  Pause,
  LoaderCircle,
} from "lucide-react";
import type { PublicSession } from "@/server/provider";
import { api } from "./forms";
import { SharedWhiteboard } from "./shared-whiteboard";
import { TeachingCanvas } from "./teaching-canvas";
import { BrowserVoiceTransport } from "./voice/browser";
import type {
  SpeechReceipt,
  VoiceLatencyMetric,
  VoiceStatus,
  VoiceTransport,
} from "./voice/transport";
export function ConversationLesson({ initial }: { initial: PublicSession }) {
  const [session, setSession] = useState(initial),
    [status, setStatus] = useState<VoiceStatus>("idle"),
    [voice, setVoice] = useState(false),
    [typed, setTyped] = useState(""),
    [interim, setInterim] = useState(""),
    [error, setError] = useState(""),
    [words, setWords] = useState(Number.MAX_SAFE_INTEGER),
    [showText, setShowText] = useState(false),
    [busy, setBusy] = useState(false),
    [selectedChoice, setSelectedChoice] = useState({
      questionId: "",
      value: "",
    }),
    [audioLevel, setAudioLevel] = useState(0),
    [latency, setLatency] = useState<VoiceLatencyMetric[]>([]);
  const current = useRef(initial),
    transport = useRef<VoiceTransport | null>(null),
    pending = useRef(false),
    queued = useRef<{
      text: string;
      source: "voice" | "text" | "canvas";
    } | null>(null),
    heard = useRef<SpeechReceipt | undefined>(undefined),
    active = useRef(false),
    sendRef = useRef<
      (text: string, source: "voice" | "text" | "canvas") => void
    >(() => {});
  const apply = useCallback((next: PublicSession) => {
    current.current = next;
    setSession(next);
    if (next.conversation) {
      if (active.current) {
        setWords(-1);
        transport.current?.speak(next.conversation);
      } else setWords(Number.MAX_SAFE_INTEGER);
    }
  }, []);
  const send = useCallback(
    async (text: string, source: "voice" | "text" | "canvas") => {
      if (!text.trim()) return;
      if (pending.current) {
        queued.current = { text, source };
        transport.current?.interrupt();
        return;
      }
      pending.current = true;
      setBusy(true);
      setError("");
      setInterim("");
      transport.current?.interrupt();
      setStatus(active.current ? "thinking" : "idle");
      const s = current.current;
      try {
        const result = await api<{ session: PublicSession }>(
          `/api/sessions/${s.id}/conversation`,
          {
            requestId: crypto.randomUUID(),
            version: s.version,
            transcript: text.trim(),
            source,
            heard: heard.current,
          },
        );
        heard.current = undefined;
        setTyped("");
        if (queued.current) {
          current.current = result.session;
          setSession(result.session);
        } else apply(result.session);
      } catch (e) {
        setError((e as Error).message);
        try {
          const response = await fetch(`/api/sessions/${s.id}`);
          if (response.ok) {
            const latest = await response.json();
            current.current = latest.session;
            setSession(latest.session);
          }
        } catch {
          /* The saved version is recovered on reconnect. */
        }
      } finally {
        pending.current = false;
        setBusy(false);
        const next = queued.current;
        queued.current = null;
        if (next) sendRef.current(next.text, next.source);
      }
    },
    [apply],
  );
  useEffect(() => {
    sendRef.current = (text, source) => {
      void send(text, source);
    };
  }, [send]);
  useEffect(
    () => () => {
      active.current = false;
      transport.current?.disconnect();
    },
    [],
  );
  async function connect() {
    setError("");
    setStatus("connecting");
    const callbacks = {
      onTranscript: (text: string) => sendRef.current(text, "voice"),
      onInterim: setInterim,
      onStatus: setStatus,
      onBoundary: setWords,
      onReceipt: (receipt: SpeechReceipt) => {
        heard.current = receipt;
        void api(`/api/sessions/${current.current.id}/speech`, receipt).catch(
          () => {},
        );
      },
      onError: (message: string) => {
        setError(message);
        setShowText(true);
      },
      onInterrupt: () => setStatus("listening"),
      onMetric: (metric: VoiceLatencyMetric) =>
        setLatency((current) => [...current.slice(-7), metric]),
      onAudioLevel: setAudioLevel,
    };
    try {
      const config = await api<{
        provider: "browser" | "livekit";
        url?: string;
        token?: string;
      }>(`/api/sessions/${current.current.id}/voice`, {});
      if (config.provider === "livekit") {
        const { LiveKitVoiceTransport } = await import("./voice/livekit");
        transport.current = new LiveKitVoiceTransport(
          config.url!,
          config.token!,
          callbacks,
          apply,
        );
      } else transport.current = new BrowserVoiceTransport(callbacks);
      await transport.current.connect();
      active.current = true;
      setVoice(true);
      if (config.provider === "browser" && current.current.conversation) {
        setWords(-1);
        transport.current.speak(current.current.conversation);
      }
    } catch (e) {
      transport.current?.disconnect();
      setError((e as Error).message);
      setStatus("unavailable");
      setShowText(true);
    }
  }
  function disconnect() {
    active.current = false;
    transport.current?.disconnect();
    setVoice(false);
    setAudioLevel(0);
    setWords(Number.MAX_SAFE_INTEGER);
  }
  const p = session.conversation,
    complete = session.state === "COMPLETE";
  return (
    <div className="conversation-layout">
      <div className="conversation-top">
        <span>
          <Leaf size={17} /> A tutor that learns your way
        </span>
        <span>About 10–20 minutes · Your pace</span>
      </div>
      <div className="conversation-workspace">
        <div className="conversation-main">
          <div className="conversation-skill">
            <span className="eyebrow">
              {p?.returningTo ? "A HELPFUL BUILDING BLOCK" : "OUR FOCUS"}
            </span>
            <h1>{p?.currentSkill ?? "A little learning, just for you"}</h1>
            {p?.returningTo && (
              <p className="muted small">
                Then we’ll return to {p.returningTo.toLowerCase()}.
              </p>
            )}
          </div>
          <TeachingCanvas
            cues={p?.cues ?? []}
            actions={p?.canvasActions ?? []}
            words={words}
            onAnswer={(answer) => void send(answer, "canvas")}
          />
          {session.question.choices &&
            !complete &&
            !session.answerAccess.revealed && (
              <section
                className="choice-workspace"
                aria-labelledby="choice-title"
              >
                <div className="choice-workspace-heading">
                  <div>
                    <span className="eyebrow">YOUR ANSWER SPACE</span>
                    <h2 id="choice-title">Which choice fits best?</h2>
                  </div>
                  <p>
                    Compare each option with the question before you choose.
                  </p>
                </div>
                <div className="prominent-choices" role="radiogroup">
                  {session.question.choices.map((choice, index) => {
                    const selected =
                      selectedChoice.questionId === session.question.id &&
                      selectedChoice.value === choice;
                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={selected ? "selected" : ""}
                        key={choice}
                        disabled={busy}
                        onClick={() =>
                          setSelectedChoice({
                            questionId: session.question.id,
                            value: choice,
                          })
                        }
                      >
                        <strong>{String.fromCharCode(65 + index)}</strong>
                        <span>{choice}</span>
                        <i aria-hidden>{selected ? "✓" : ""}</i>
                      </button>
                    );
                  })}
                </div>
                <button
                  className="button choice-submit"
                  disabled={
                    busy ||
                    selectedChoice.questionId !== session.question.id ||
                    !selectedChoice.value
                  }
                  onClick={() => void send(selectedChoice.value, "text")}
                >
                  Choose this answer
                  <ArrowRight size={17} />
                </button>
              </section>
            )}
          <SharedWhiteboard
            sessionId={session.id}
            onAnswer={(answer) => void send(answer, "canvas")}
          />
        </div>
        <aside className="conversation-controls">
          <div
            className={`voice-orb ${status}`}
            style={{ "--audio-level": audioLevel } as CSSProperties}
            aria-hidden
          >
            <div className="orb-core">
              <Leaf size={31} />
              <span className="voice-wave">
                <b />
                <b />
                <b />
                <b />
                <b />
              </span>
            </div>
            <i />
            <i />
            <i />
          </div>
          <span className="voice-status" role="status">
            {
              {
                idle: "Ready when you are",
                connecting: "Connecting your voice…",
                listening: "I’m listening",
                speaking: "Da Vinci is speaking",
                thinking: "Thinking about your next step…",
                paused: "Take your time",
                unavailable: "Let’s use text for now",
              }[status]
            }
          </span>
          <p className="spoken-turn" aria-live={voice ? "off" : "polite"}>
            {p?.text ?? session.question.prompt}
          </p>
          {interim && <p className="child-transcript">“{interim}”</p>}
          {!complete && (
            <>
              {!voice ? (
                <button
                  className="button large-button full"
                  onClick={connect}
                  disabled={status === "connecting"}
                >
                  <Mic size={19} />
                  Start talking
                </button>
              ) : (
                <div className="voice-actions">
                  <button
                    className="button secondary"
                    onClick={() => {
                      transport.current?.interrupt();
                      void send("wait", "text");
                    }}
                  >
                    <Pause size={16} />
                    Pause
                  </button>
                  <button className="button secondary" onClick={disconnect}>
                    <MicOff size={16} />
                    Voice off
                  </button>
                </div>
              )}
              <p className="voice-guidance">
                {p?.listeningPrompt ??
                  "Answer naturally, or tell me what feels confusing."}
              </p>
              <div className="conversation-shortcuts educator-actions">
                {["I need a hint", "Show me another way"].map((text) => (
                  <button
                    key={text}
                    disabled={busy}
                    onClick={() => void send(text, "text")}
                  >
                    {text}
                  </button>
                ))}
              </div>
              {session.answerAccess.policy !== "disabled" && (
                <button
                  className="button secondary"
                  disabled={busy || !session.answerAccess.allowed}
                  onClick={() => void send("Show me the answer", "text")}
                >
                  {session.answerAccess.allowed
                    ? "Show correct answer"
                    : `Answer available after ${session.answerAccess.remaining} more ${session.answerAccess.remaining === 1 ? "attempt" : "attempts"}`}
                </button>
              )}
              {session.answerAccess.revealed && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void send("continue", "text")}
                >
                  Try a fresh question
                </button>
              )}
              <button
                className="text-button fallback-toggle"
                onClick={() => setShowText((v) => !v)}
              >
                <Keyboard size={16} />
                {showText ? "Hide text controls" : "Type an answer"}
              </button>
              {showText && (
                <div className="conversation-fallback">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send(typed, "text");
                    }}
                  >
                    <label className="sr-only" htmlFor="conversation-answer">
                      Your answer or question
                    </label>
                    <textarea
                      id="conversation-answer"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      maxLength={1500}
                      placeholder="I think it’s… or ask me a question"
                      rows={3}
                    />
                    <button
                      className="button full"
                      disabled={busy || !typed.trim()}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <>
                          Send
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </form>
                  <div className="conversation-shortcuts">
                    {[
                      "Can you explain why?",
                      "Try an easier example",
                      "Can you show me?",
                      "Continue",
                    ].map((t) => (
                      <button
                        key={t}
                        disabled={busy}
                        onClick={() => void send(t, "text")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {complete && (
            <Link
              className="button full"
              href={`/learn/${session.childId}/complete`}
            >
              See your little step forward
              <ArrowRight size={17} />
            </Link>
          )}
          {error && (
            <div className="error" role="alert">
              <p>{error}</p>
              <button
                className="text-button"
                onClick={() => window.location.reload()}
              >
                Reconnect to saved lesson
              </button>
            </div>
          )}
          <div className="conversation-foot">
            <Volume2 size={14} />
            <span>You can interrupt. You can take your time.</span>
          </div>
          {process.env.NODE_ENV === "development" && latency.length > 0 && (
            <details className="voice-debugger">
              <summary>Voice latency</summary>
              <pre>{JSON.stringify(latency, null, 2)}</pre>
            </details>
          )}
          {process.env.NODE_ENV === "development" && session.teachingDebug && (
            <details className="voice-debugger">
              <summary>Teaching decisions</summary>
              <pre>{JSON.stringify(session.teachingDebug, null, 2)}</pre>
            </details>
          )}
        </aside>
      </div>
      <div className="conversation-bottom">
        <Link href={`/learn/${session.childId}`} onClick={disconnect}>
          Take a break — your place is saved
        </Link>
        <button
          className="text-button"
          disabled={busy || complete}
          onClick={() => void send("finish for today", "text")}
        >
          Finish for today
        </button>
      </div>
    </div>
  );
}
