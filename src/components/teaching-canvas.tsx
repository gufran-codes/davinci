"use client";
import { useState } from "react";
import type { CanvasCue } from "@/lib/teaching/types";
import type { Visual } from "@/lib/types";
import { MathVisual } from "./math-visuals";
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
                {i < visual.nodes.length - 1 && <b aria-hidden>→</b>}
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
}: {
  cues: CanvasCue[];
  words: number;
  onAnswer: (answer: string) => void;
}) {
  const active = cues.filter((c) => c.atWord <= words),
    upcomingModel = cues.find(
      (c) => c.action === "show" && c.visuals.length > 0,
    ),
    model =
      [...active]
        .reverse()
        .find((c) => c.action === "show" || c.action === "clear") ??
      upcomingModel,
    focus = [...active].reverse().find((c) => c.action === "highlight"),
    question =
      [...active].reverse().find((c) => c.action === "question") ??
      cues.find((c) => c.action === "question");
  return (
    <section
      className={`teaching-canvas ${focus ? "canvas-focused" : ""}`}
      aria-label="Teaching canvas"
    >
      <span className="eyebrow">LET’S LOOK AT IT TOGETHER</span>
      {model?.visuals.length ? (
        <div className="canvas-models">
          {model.visuals.map((v, i) => (
            <CanvasVisual
              key={`${model.label}-${JSON.stringify(v)}-${i}`}
              visual={v}
              onAnswer={onAnswer}
            />
          ))}
        </div>
      ) : (
        <div className="canvas-rest">
          <span aria-hidden>✳</span>
          <p>A little space to think.</p>
        </div>
      )}
      {focus && <p className="canvas-focus-label">{focus.highlight}</p>}
      {question && <h2 className="canvas-question">{question.label}</h2>}
    </section>
  );
}
