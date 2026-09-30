"use client";

import type { CanvasAction } from "@/lib/teaching/whiteboard";
import { FractionBar } from "./math-visuals";

function latest<T extends CanvasAction["type"]>(
  actions: CanvasAction[],
  type: T,
) {
  return [...actions].reverse().find((action) => action.type === type) as
    Extract<CanvasAction, { type: T }> | undefined;
}

function NumberLineStage({ actions }: { actions: CanvasAction[] }) {
  const line = latest(actions, "showNumberLine");
  if (!line) return null;
  const jumps = actions.filter(
    (
      action,
    ): action is Extract<CanvasAction, { type: "animateNumberLineJump" }> =>
      action.type === "animateNumberLineJump",
  );
  const count = Math.max(1, line.max - line.min);
  return (
    <figure className="action-number-line">
      {line.label && <figcaption>{line.label}</figcaption>}
      <div className="action-line-track">
        {Array.from({ length: count + 1 }, (_, index) => {
          const value = line.min + index;
          return (
            <span
              className="action-line-mark"
              key={value}
              style={{ left: `${(index / count) * 100}%` }}
            >
              <i />
              <small>{value}</small>
            </span>
          );
        })}
        {jumps.map((jump, index) => {
          const left = ((jump.from - line.min) / count) * 100;
          const width = ((jump.to - jump.from) / count) * 100;
          return (
            <span
              className="number-line-jump"
              key={jump.id}
              style={
                {
                  left: `${Math.min(left, left + width)}%`,
                  width: `${Math.abs(width)}%`,
                  "--jump-delay": `${index * 120}ms`,
                } as React.CSSProperties
              }
            >
              <b>{jump.label}</b>
            </span>
          );
        })}
      </div>
    </figure>
  );
}

function EquationStage({ actions }: { actions: CanvasAction[] }) {
  const shown = latest(actions, "showEquation");
  const step = latest(actions, "animateEquationStep");
  const highlight = latest(actions, "highlightTerm");
  const equation = step?.to ?? shown?.equation;
  if (!equation) return null;
  const parts = highlight
    ? equation.split(
        new RegExp(
          `(${highlight.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
          "i",
        ),
      )
    : [equation];
  return (
    <div className={`action-equation ${step ? "equation-stepped" : ""}`}>
      {parts.map((part, index) =>
        highlight && part.toLowerCase() === highlight.term.toLowerCase() ? (
          <mark key={index}>{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </div>
  );
}

function ArrayAndCounters({ actions }: { actions: CanvasAction[] }) {
  const array = latest(actions, "showArray");
  const counters = latest(actions, "moveCounters");
  if (array)
    return (
      <div
        className="action-array"
        role="img"
        aria-label={`${array.rows} groups of ${array.columns}`}
        style={{ gridTemplateColumns: `repeat(${array.columns}, 1fr)` }}
      >
        {Array.from({ length: array.rows * array.columns }, (_, index) => (
          <i key={index} style={{ animationDelay: `${index * 35}ms` }} />
        ))}
      </div>
    );
  if (!counters) return null;
  return (
    <div className="action-counter-groups">
      {Array.from({ length: counters.groups }, (_, group) => (
        <div key={group}>
          {Array.from(
            { length: Math.ceil(counters.total / counters.groups) },
            (_, index) => {
              const number =
                group * Math.ceil(counters.total / counters.groups) + index;
              return number < counters.total ? <i key={index} /> : null;
            },
          )}
        </div>
      ))}
    </div>
  );
}

function PlaceValueStage({ actions }: { actions: CanvasAction[] }) {
  const blocks = latest(actions, "showPlaceValueBlocks");
  if (!blocks) return null;
  return (
    <div className="place-value-stage">
      {(
        [
          ["Hundreds", blocks.hundreds, "hundred"],
          ["Tens", blocks.tens, "ten"],
          ["Ones", blocks.ones, "one"],
        ] as const
      ).map(([label, count, kind]) => (
        <section key={label}>
          <strong>{label}</strong>
          <div>
            {Array.from({ length: count }, (_, index) => (
              <i className={kind} key={index} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function GraphStage({ actions }: { actions: CanvasAction[] }) {
  const graph = latest(actions, "showCoordinateGraph");
  if (!graph) return null;
  const points = actions.filter(
    (action): action is Extract<CanvasAction, { type: "plotPoint" }> =>
      action.type === "plotPoint",
  );
  return (
    <figure className="coordinate-stage">
      <div className="coordinate-axis x-axis" />
      <div className="coordinate-axis y-axis" />
      {points.map((point) => (
        <span
          key={point.id}
          style={{
            left: `${((point.x - graph.minX) / (graph.maxX - graph.minX)) * 100}%`,
            bottom: `${((point.y - graph.minY) / (graph.maxY - graph.minY)) * 100}%`,
          }}
        >
          <i />
          <b>{point.label ?? `(${point.x}, ${point.y})`}</b>
        </span>
      ))}
    </figure>
  );
}

export function DynamicMathCanvas({ actions }: { actions: CanvasAction[] }) {
  const lastClear = actions.findLastIndex(
    (action) =>
      action.type === "clearCanvas" || action.type === "clearTutorLayer",
  );
  const visible = actions.slice(lastClear + 1);
  const bars = latest(visible, "showFractionBars");
  const legacyBar = latest(visible, "showFractionBar");
  const comparison = latest(visible, "compareFractions");
  const shape = latest(visible, "showGeometryShape");
  const text = latest(visible, "addText");
  const focus = latest(visible, "highlightCanvasElement");
  return (
    <div
      className={`dynamic-math-canvas ${focus ? "element-highlighted" : ""}`}
      aria-live="polite"
      data-highlight={focus?.targetId}
    >
      <NumberLineStage actions={visible} />
      <EquationStage actions={visible} />
      {bars && (
        <div className="action-fraction-bars">
          {bars.bars.map((bar, index) => (
            <FractionBar key={index} {...bar} />
          ))}
        </div>
      )}
      {!bars && legacyBar && (
        <div className="action-fraction-bars">
          <FractionBar
            numerator={legacyBar.numerator}
            denominator={legacyBar.denominator}
          />
        </div>
      )}
      {comparison && (
        <div className="action-fraction-bars comparison">
          <FractionBar {...comparison.left} />
          <FractionBar {...comparison.right} />
        </div>
      )}
      <ArrayAndCounters actions={visible} />
      <PlaceValueStage actions={visible} />
      <GraphStage actions={visible} />
      {shape && (
        <svg
          className="action-shape"
          viewBox="0 0 300 170"
          role="img"
          aria-label={shape.label}
        >
          {shape.shape === "circle" ? (
            <circle cx="150" cy="80" r="55" />
          ) : shape.shape === "triangle" ? (
            <path d="M65 140 L150 25 L235 140 Z" />
          ) : (
            <rect x="65" y="35" width="170" height="100" />
          )}
          <text x="150" y="160" textAnchor="middle">
            {shape.label}
          </text>
        </svg>
      )}
      {text && <p className="action-note">{text.text}</p>}
    </div>
  );
}
