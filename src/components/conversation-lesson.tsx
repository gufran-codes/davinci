"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestsSessionEnd } from "@/lib/conversation/intent";
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
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const ending = useRef(false);
  const finishRequest = useRef<string | null>(null);
  const [session, setSession] = useState(initial),
    [status, setStatus] = useState<VoiceStatus>("idle"),
    [voice, setVoice] = useState(false),
    [playbackBlocked, setPlaybackBlocked] = useState(false),
    [typed, setTyped] = useState(""),
    [interim, setInterim] = useState(""),
    [error, setError] = useState(""),
    [words, setWords] = useState(-1),
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
    connectionEpoch = useRef(0),
    connecting = useRef(false),
    sendRef = useRef<
      (text: string, source: "voice" | "text" | "canvas") => void
    >(() => {});
  const disconnect = useCallback(() => {
    connectionEpoch.current++;
    connecting.current = false;
    active.current = false;
    transport.current?.disconnect();
    transport.current = null;
    setVoice(false);
    setPlaybackBlocked(false);
    setAudioLevel(0);
    setWords(Number.MAX_SAFE_INTEGER);
    setStatus("idle");
  }, []);
  const apply = useCallback(
    (next: PublicSession) => {
      if (
        next.version < current.current.version ||
        (ending.current && next.state !== "COMPLETE")
      )
        return;
      current.current = next;
      setSession(next);
      if (next.state === "COMPLETE") {
        ending.current = true;
        queued.current = null;
        disconnect();
        router.replace(`/learn/${next.childId}/complete`);
        return;
      }
      if (next.conversation) {
        if (active.current) {
          setWords(-1);
          transport.current?.speak(next.conversation);
        } else setWords(-1);
      }
    },
    [disconnect, router],
  );
  const finish = useCallback(async () => {
    if (ending.current || current.current.state === "COMPLETE") return;
    ending.current = true;
    setFinishing(true);
    setError("");
    queued.current = null;
    transport.current?.interrupt();
    disconnect();
    finishRequest.current ??= crypto.randomUUID();
    try {
      const response = await fetch(
        `/api/sessions/${current.current.id}/finish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: finishRequest.current,
            heard: heard.current,
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.error ?? "Please try again.");
      apply(result.session);
    } catch (e) {
      // A response can be lost after the transaction committed. Recover first;
      // retrying the same completion request never creates a second summary.
      try {
        const response = await fetch(`/api/sessions/${current.current.id}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.session.state === "COMPLETE") {
            apply(result.session);
            return;
          }
        }
      } catch {
        /* Keep the saved lesson available for an explicit retry. */
      }
      ending.current = false;
      setError(
        `Your lesson could not finish: ${(e as Error).message} Please try Finish session again.`,
      );
    } finally {
      setFinishing(false);
    }
  }, [apply, disconnect]);
  const send = useCallback(
    async (text: string, source: "voice" | "text" | "canvas") => {
      if (
        !text.trim() ||
        ending.current ||
        current.current.state === "COMPLETE"
      )
        return;
      if (requestsSessionEnd(text)) {
        await finish();
        return;
      }
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
        if (result.session.state === "COMPLETE") apply(result.session);
        else if (!ending.current && queued.current) {
          current.current = result.session;
          setSession(result.session);
        } else apply(result.session);
      } catch (e) {
        setError((e as Error).message);
        try {
          const response = await fetch(`/api/sessions/${s.id}`);
          if (response.ok) {
            const latest = await response.json();
            apply(latest.session);
          }
        } catch {
          /* The saved version is recovered on reconnect. */
        }
      } finally {
        pending.current = false;
        setBusy(false);
        const next = queued.current;
        queued.current = null;
        if (next && !ending.current && current.current.state !== "COMPLETE")
          sendRef.current(next.text, next.source);
      }
    },
    [apply, finish],
  );
  useEffect(() => {
    sendRef.current = (text, source) => {
      void send(text, source);
    };
  }, [send]);
  const connect = useCallback(async () => {
    if (
      ending.current ||
      connecting.current ||
      active.current ||
      current.current.state === "COMPLETE"
    )
      return;
    const epoch = ++connectionEpoch.current;
    connecting.current = true;
    transport.current?.disconnect();
    transport.current = null;
    setError("");
    setPlaybackBlocked(false);
    setStatus("connecting");
    const callbacks = {
      onTranscript: (text: string) => {
        if (epoch === connectionEpoch.current) sendRef.current(text, "voice");
      },
      onInterim: setInterim,
      onStatus: (next: VoiceStatus) => {
        if (epoch !== connectionEpoch.current) return;
        if (next === "listening" && current.current.state === "COMPLETE") {
          // Let the final tutor sentence finish before releasing the microphone.
          disconnect();
          return;
        }
        setStatus(next);
        if (next === "speaking") setWords((count) => Math.max(0, count));
        if (next === "unavailable") {
          active.current = false;
          setVoice(false);
        }
      },
      onPlaybackBlocked: (blocked: boolean) => {
        if (epoch === connectionEpoch.current) setPlaybackBlocked(blocked);
      },
      onBoundary: (count: number) => {
        if (epoch === connectionEpoch.current && !ending.current)
          setWords(count);
      },
      onReceipt: (receipt: SpeechReceipt) => {
        heard.current = receipt;
        void api(`/api/sessions/${current.current.id}/speech`, receipt).catch(
          () => {},
        );
      },
      onError: (message: string) => {
        if (epoch !== connectionEpoch.current) return;
        setError(message);
        setShowText(true);
      },
      onInterrupt: () => {
        if (epoch === connectionEpoch.current) setStatus("listening");
      },
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
      if (epoch !== connectionEpoch.current) return;
      if (config.provider === "livekit") {
        const { LiveKitVoiceTransport } = await import("./voice/livekit");
        if (epoch !== connectionEpoch.current) return;
        transport.current = new LiveKitVoiceTransport(
          config.url!,
          config.token!,
          callbacks,
          (next) => {
            if (epoch === connectionEpoch.current) apply(next);
          },
        );
      } else transport.current = new BrowserVoiceTransport(callbacks);
      const instance = transport.current;
      await instance.connect();
      if (epoch !== connectionEpoch.current) {
        instance.disconnect();
        return;
      }
      active.current = true;
      setVoice(true);
      if (config.provider === "browser" && current.current.conversation) {
        setWords(-1);
        transport.current.speak(current.current.conversation);
      }
    } catch (e) {
      if (epoch !== connectionEpoch.current) return;
      active.current = false;
      setVoice(false);
      transport.current?.disconnect();
      setError((e as Error).message);
      setStatus("unavailable");
      setShowText(true);
    } finally {
      if (epoch === connectionEpoch.current) connecting.current = false;
    }
  }, [apply, disconnect]);
  useEffect(() => {
    // Deferring one tick makes Strict Mode setup/cleanup safe: only the surviving
    // mount connects, and stale requests cannot reactivate an abandoned lesson.
    const start = setTimeout(() => {
      void connect();
    }, 0);
    return () => {
      clearTimeout(start);
      disconnect();
    };
  }, [connect, disconnect]);
  async function enableAudio() {
    setError("");
    try {
      await transport.current?.enableAudio?.();
    } catch {
      setError(
        "Sound is still blocked. Check this tab’s sound permission, then try again.",
      );
    }
  }
  const p = session.conversation,
    complete = session.state === "COMPLETE",
    reviewing = session.state === "SESSION_REVIEW";
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
          <section className="active-task" aria-label="Question and answer">
            <div className="conversation-skill">
              <span className="eyebrow">
                {p?.returningTo ? "A HELPFUL BUILDING BLOCK" : "OUR FOCUS"}
              </span>
              <p className="task-skill-name">
                {p?.currentSkill ?? "A little learning, just for you"}
              </p>
              {!complete && (
                <h1 className="lesson-task" aria-label="Current problem">
                  {reviewing
                    ? "How did today’s learning feel?"
                    : session.question.prompt}
                </h1>
              )}
              {p?.returningTo && (
                <p className="muted small">
                  Then we’ll return to {p.returningTo.toLowerCase()}.
                </p>
              )}
            </div>
            {reviewing && (
              <div className="review-actions">
                <p>
                  You can share how it felt, keep practising, or finish now.
                </p>
                {["A little clearer", "Ready for more", "Still tricky"].map(
                  (label) => (
                    <button
                      className="button secondary"
                      key={label}
                      disabled={busy || finishing}
                      onClick={() => void send(label, "text")}
                    >
                      {label}
                    </button>
                  ),
                )}
                <button
                  className="text-button"
                  disabled={busy || finishing}
                  onClick={() => void send("Continue", "text")}
                >
                  Keep practising
                </button>
              </div>
            )}
            {p?.assessment && !reviewing && (
              <div
                className={`answer-result ${p.assessment.correct ? "correct" : "incorrect"}`}
                role="status"
              >
                <strong>
                  {p.assessment.correct ? "Correct" : "Not quite yet"}
                </strong>
                <span>Your answer: {p.assessment.answer}</span>
                {p.assessment.prompt !== session.question.prompt && (
                  <span>
                    That was the previous question. Your next question is above.
                  </span>
                )}
              </div>
            )}
            {session.question.choices &&
              !reviewing &&
              !complete &&
              !session.answerAccess.revealed && (
                <section
                  className="choice-workspace"
                  aria-labelledby="choice-title"
                >
                  <div className="choice-workspace-heading">
                    <div>
                      <h2 id="choice-title">
                        {p?.teachingMove === "ask_reasoning"
                          ? "Explain your choice"
                          : p?.teachingMove === "guided_step"
                            ? "Choices for the full problem"
                            : session.question.choiceMode === "writing_support"
                              ? "Choose an idea to build on"
                              : "Choose your answer"}
                      </h2>
                    </div>
                    <p>
                      {p?.teachingMove === "ask_reasoning"
                        ? "Your choice is saved. Tell Da Vinci what helped you decide, or type your reasoning below."
                        : p?.teachingMove === "guided_step"
                          ? "First, work through the current step on the canvas. These choices answer the full problem."
                          : session.question.choiceMode === "writing_support"
                            ? "These are starting ideas. You will still write or say your own response."
                            : "Compare the choices. Say a letter, tap an option, or explain your answer."}
                    </p>
                  </div>
                  <div
                    className={`prominent-choices${session.question.choices.some((choice) => (session.question.choiceLabels?.[choice] ?? choice).length > 65) ? " long-choices" : ""}`}
                    role="group"
                    aria-label="Answer choices"
                  >
                    {session.question.choices.map((choice, index) => {
                      const selected =
                        selectedChoice.questionId === session.question.id &&
                        selectedChoice.value === choice;
                      const assessed =
                        p?.assessment?.prompt === session.question.prompt &&
                        p.assessment.answer === choice
                          ? p.assessment.correct
                            ? "correct"
                            : "incorrect"
                          : "";
                      return (
                        <button
                          type="button"
                          aria-pressed={selected}
                          className={`${selected ? "selected" : ""} ${assessed}`}
                          key={choice}
                          disabled={
                            busy ||
                            finishing ||
                            p?.teachingMove === "guided_step" ||
                            p?.teachingMove === "ask_reasoning"
                          }
                          onClick={() =>
                            setSelectedChoice({
                              questionId: session.question.id,
                              value: choice,
                            })
                          }
                        >
                          <strong>{String.fromCharCode(65 + index)}</strong>
                          <span>
                            {session.question.choiceLabels?.[choice] ?? choice}
                          </span>
                          <i aria-hidden>
                            {assessed === "incorrect"
                              ? "×"
                              : selected || assessed === "correct"
                                ? "✓"
                                : ""}
                          </i>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="button choice-submit"
                    disabled={
                      busy ||
                      p?.teachingMove === "guided_step" ||
                      p?.teachingMove === "ask_reasoning" ||
                      selectedChoice.questionId !== session.question.id ||
                      !selectedChoice.value
                    }
                    onClick={() => void send(selectedChoice.value, "canvas")}
                  >
                    {session.question.choiceMode === "writing_support"
                      ? "Use this starting idea"
                      : "Choose this answer"}
                    <ArrowRight size={17} />
                  </button>
                </section>
              )}
            {!complete &&
              !reviewing &&
              (showText ||
                session.question.choiceMode === "writing_support" ||
                p?.teachingMove === "ask_reasoning" ||
                !session.question.choices?.length) && (
                <div className="conversation-fallback task-response">
                  <h2>
                    {session.question.subject === "Math"
                      ? "Your answer or next step"
                      : "Your claim and evidence"}
                  </h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send(typed, "text");
                    }}
                  >
                    <label htmlFor="conversation-answer">
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
          </section>
          {!complete && !reviewing && (
            <TeachingCanvas
              key={p?.turnId ?? session.question.id}
              cues={p?.cues ?? []}
              actions={p?.canvasActions ?? []}
              words={words}
              speechDriven={voice || status === "connecting"}
              speaking={status === "speaking" && !playbackBlocked}
              blocked={busy || finishing || Boolean(p?.paused)}
              onPauseSpeech={() => {
                transport.current?.interrupt();
                setStatus("listening");
              }}
              onInspect={(label) =>
                void send(`What does “${label}” mean here?`, "text")
              }
              onAnswer={(answer) => void send(answer, "canvas")}
            />
          )}
          {!complete && !reviewing && (
            <details className="optional-working">
              <summary>Open your working board</summary>
              <SharedWhiteboard
                sessionId={session.id}
                onAnswer={(answer) => void send(answer, "canvas")}
              />
            </details>
          )}
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
            {playbackBlocked
              ? "Enable sound to hear Da Vinci"
              : {
                  idle: "Ready when you are",
                  connecting: "Connecting your voice…",
                  listening: "I’m listening",
                  speaking: "Da Vinci is speaking",
                  thinking: "Thinking about your next step…",
                  paused: "Take your time",
                  unavailable: "Let’s use text for now",
                }[status]}
          </span>
          <p className="spoken-turn" aria-live={voice ? "off" : "polite"}>
            {p?.spokenText ?? p?.text ?? session.question.prompt}
          </p>
          {interim && <p className="child-transcript">“{interim}”</p>}
          {!complete && (
            <>
              {playbackBlocked && (
                <button
                  className="button large-button full"
                  onClick={enableAudio}
                >
                  <Volume2 size={19} /> Enable sound
                </button>
              )}
              {!voice && !playbackBlocked ? (
                <button
                  className="button large-button full"
                  onClick={connect}
                  disabled={status === "connecting"}
                >
                  <Mic size={19} />
                  {status === "connecting"
                    ? "Starting your tutor…"
                    : "Reconnect voice"}
                </button>
              ) : voice ? (
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
              ) : null}
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
          disabled={finishing || complete}
          aria-busy={finishing}
          onClick={() => void finish()}
        >
          {finishing ? "Saving your lesson…" : "Finish session"}
        </button>
      </div>
    </div>
  );
}
