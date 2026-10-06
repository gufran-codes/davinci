"use client";
import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import type { CanvasCue } from "@/lib/teaching/types";
import type { CanvasAction } from "@/lib/teaching/whiteboard";
import type { Visual } from "@/lib/types";
import { MathVisual } from "./math-visuals";
import { DynamicMathCanvas } from "./dynamic-math-canvas";
import { LiveWhiteboard } from "./live-whiteboard";
import { visibleWhiteboardActions } from "@/lib/teaching/whiteboard-playback";
function CanvasVisual({
  visual,
  onAnswer,
}: {
  visual: Visual;
  onAnswer: (answer: string) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  switch (visual.type) {
    case "passage":
      return (
        <div className="canvas-passage">
          {visual.text.split(/(\s+)/).map((word, i) =>
            !word.trim() ? (
              <span key={i}>{word}</span>
            ) : (
              <button
                key={i}
                className={
                  visual.highlights.some((h) => h.includes(word)) ||
                  selected.includes(i)
                    ? "highlighted-word"
                    : ""
                }
                onClick={() =>
                  setSelected((v) =>
                    v.includes(i) ? v.filter((n) => n !== i) : [...v, i],
                  )
                }
                aria-pressed={selected.includes(i)}
              >
                {word}
              </button>
            ),
          )}
          <p className="visual-caption">
            Tap words that support your thinking.
          </p>
        </div>
      );
    case "diagram":
      return (
        <figure className="canvas-diagram">
          <figcaption>{visual.title}</figcaption>
          <div>
            {visual.nodes.map((n, i) => (
              <span key={i}>
                {n}
                {visual.links
                  .filter(([from]) => from === i)
                  .map(([, to]) => (
                    <small key={to}> → {visual.nodes[to]}</small>
                  ))}
              </span>
            ))}
          </div>
        </figure>
      );
    case "table":
      return (
        <table className="canvas-table">
          <thead>
            <tr>
              {visual.headers.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "timeline":
      return (
        <ol className="canvas-timeline">
          {visual.events.map((e, i) => (
            <li key={i}>
              <strong>{e.date}</strong>
              <span>{e.label}</span>
            </li>
          ))}
        </ol>
      );
    case "map":
      return (
        <figure>
          <figcaption>{visual.prompt}</figcaption>
          <p className="visual-caption">North ↑ · East → · South ↓ · West ←</p>
          <div
            className="canvas-map"
            style={{
              gridTemplateColumns: `repeat(${visual.grid[0]?.length ?? 1},1fr)`,
            }}
          >
            {visual.grid.flat().map((c, i) => (
              <span key={i}>{c || "·"}</span>
            ))}
          </div>
        </figure>
      );
    case "manipulative":
      return (
        <div>
          <p>{visual.label}</p>
          <div className="canvas-counters">
            {Array.from({ length: visual.total }, (_, i) => (
              <button
                aria-label={`Counter ${i + 1}`}
                aria-pressed={selected.includes(i)}
                className={selected.includes(i) ? "selected" : ""}
                key={i}
                onClick={() =>
                  setSelected((v) =>
                    v.includes(i) ? v.filter((n) => n !== i) : [...v, i],
                  )
                }
              />
            ))}
          </div>
          <button
            className="button secondary"
            disabled={!selected.length}
            onClick={() => onAnswer(String(selected.length))}
          >
            Use {selected.length} as my answer
          </button>
        </div>
      );
    case "geometry":
      return (
        <figure className="canvas-geometry">
          <svg viewBox="0 0 300 170" role="img" aria-label={visual.label}>
            {visual.shape === "circle" ? (
              <circle cx="150" cy="80" r="55" />
            ) : visual.shape === "triangle" ? (
              <path d="M65 140 L150 25 L235 140 Z" />
            ) : (
              <rect x="65" y="35" width="170" height="100" />
            )}
            <text x="150" y="158" textAnchor="middle">
              {visual.width} units
            </text>
            <text x="245" y="88">
              {visual.height}
            </text>
          </svg>
          <figcaption>{visual.label}</figcaption>
        </figure>
      );
    default:
      return <MathVisual visual={visual} />;
  }
}
export function TeachingCanvas({
  cues,
  words,
  onAnswer,
  actions = [],
  speechDriven = false,
  speaking = false,
  blocked = false,
  onPauseSpeech,
  onInspect,
}: {
  cues: CanvasCue[];
  words: number;
  onAnswer: (answer: string) => void;
  actions?: CanvasAction[];
  speechDriven?: boolean;
  speaking?: boolean;
  blocked?: boolean;
  onPauseSpeech?: () => void;
  onInspect?: (label: string) => void;
}) {
  const steps = [
    ...new Set([
      0,
      ...actions.map((a) => a.atWord),
      ...cues.map((c) => c.atWord),
    ]),
  ].sort((a, b) => a - b);
  const [playback, setPlayback] = useState({
    step: 0,
    playing: true,
    manual: false,
  });
  const followingSpeech = speechDriven && !playback.manual;
  const cursor = followingSpeech
    ? words
    : (steps[Math.min(playback.step, steps.length - 1)] ?? 0);
  const step = Math.max(
    0,
    steps.findLastIndex((value) => value <= cursor),
  );
  const playing = followingSpeech
    ? speaking
    : playback.playing && step < steps.length - 1;
  useEffect(() => {
    if (
      followingSpeech ||
      blocked ||
      !playback.playing ||
      playback.step >= steps.length - 1
    )
      return;
    const timer = setTimeout(
      () => setPlayback((state) => ({ ...state, step: state.step + 1 })),
      1600,
    );
    return () => clearTimeout(timer);
  }, [followingSpeech, blocked, playback.playing, playback.step, steps.length]);
  function control(nextStep: number, play: boolean) {
    if (followingSpeech && speaking) onPauseSpeech?.();
    setPlayback({ step: nextStep, playing: play, manual: true });
  }
  const active = cues.filter((c) => c.atWord <= cursor),
    activeActions = visibleWhiteboardActions(actions, cursor),
    model = [...active]
      .reverse()
      .find((c) => c.action === "show" || c.action === "clear"),
    focus = [...active].reverse().find((c) => c.action === "highlight"),
    question = [...active].reverse().find((c) => c.action === "question");
  const fallbackVisuals = (model?.visuals ?? []).filter((v) => {
    // Check representation in the full plan, not just already-visible actions:
    // this preserves older mixed scenes without revealing future visuals early.
    if (v.type === "diagram")
      return !actions.some(
        (a) => a.type === "drawDiagramNode" && a.title === v.title,
      );
    if (v.type === "passage")
      return !actions.some((a) => a.type === "writeText" && a.text === v.text);
    const kinds: Partial<Record<Visual["type"], CanvasAction["type"][]>> = {
      equation: ["showEquation", "animateEquationStep"],
      fraction_bar: ["showFractionBar", "showFractionBars"],
      comparison: ["compareFractions"],
      number_line: ["showNumberLine"],
      array: ["showArray"],
      counters: ["moveCounters"],
      geometry: ["showGeometryShape"],
    };
    return !actions.some((a) => kinds[v.type]?.includes(a.type));
  });
  if (
    !actions.length &&
    !cues.some((c) => c.visuals.length || c.action === "question")
  )
    return null;
  return (
    <section
      className={`teaching-canvas ${focus ? "canvas-focused" : ""}`}
      aria-label="Teaching canvas"
      data-whiteboard-paused={
        blocked || (followingSpeech ? !speaking : !playback.playing)
      }
    >
      <div className="whiteboard-heading">
        <div>
          <span className="eyebrow">OUR WHITEBOARD</span>
          <p>
            {followingSpeech
              ? speaking
                ? "Drawing along with Da Vinci"
                : "Take a moment to look"
              : "Explore one step at a time"}
          </p>
        </div>
        {actions.length > 0 && (
          <div
            className="whiteboard-playback"
            role="group"
            aria-label="Whiteboard playback"
          >
            <button
              aria-label="Replay visuals"
              title="Replay visuals"
              disabled={blocked}
              onClick={() => control(0, true)}
            >
              <RotateCcw size={17} />
            </button>
            <button
              aria-label={playing ? "Pause visuals" : "Play visuals"}
              title={playing ? "Pause visuals" : "Play visuals"}
              disabled={blocked}
              onClick={() =>
                control(step >= steps.length - 1 ? 0 : step, !playing)
              }
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <button
              aria-label="Next visual step"
              title="Next visual step"
              disabled={blocked || step >= steps.length - 1}
              onClick={() =>
                control(Math.min(step + 1, steps.length - 1), false)
              }
            >
              <StepForward size={17} />
            </button>
            <span aria-label="Visual step">
              {step + 1} / {steps.length}
            </span>
          </div>
        )}
      </div>
      {activeActions.some(
        (a) =>
          ![
            "writeText",
            "drawDiagramNode",
            "connectDiagramNodes",
            "highlightText",
          ].includes(a.type),
      ) && <DynamicMathCanvas actions={activeActions} />}
      <LiveWhiteboard
        actions={activeActions}
        plan={actions}
        onInspect={onInspect}
      />
      {fallbackVisuals.length > 0 && (
        <div className="canvas-models">
          {fallbackVisuals.map((v, i) => (
            <CanvasVisual
              key={`${model?.label}-${JSON.stringify(v)}-${i}`}
              visual={v}
              onAnswer={onAnswer}
            />
          ))}
        </div>
      )}
      {focus && <p className="canvas-focus-label">{focus.highlight}</p>}
      {question && <h2 className="canvas-question">{question.label}</h2>}
    </section>
  );
}
