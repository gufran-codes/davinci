"use client";
import { useState } from "react";
import { Visual } from "@/lib/types";
export function FractionBar({
  numerator,
  denominator,
  label,
  interactive = false,
}: {
  numerator: number;
  denominator: number;
  label?: string;
  interactive?: boolean;
}) {
  const [selected, setSelected] = useState(numerator);
  return (
    <div className="fraction-model">
      <div className="fraction-label">
        {label ?? `${interactive ? selected : numerator}/${denominator}`}
      </div>
      <div
        className="fraction-bar"
        role="group"
        aria-label={`${numerator} of ${denominator} equal parts`}
        style={{ gridTemplateColumns: `repeat(${denominator},1fr)` }}
      >
        {Array.from({ length: denominator }, (_, i) =>
          interactive ? (
            <button
              key={i}
              className={i < selected ? "filled" : ""}
              aria-label={`Select ${i + 1} parts`}
              aria-pressed={i < selected}
              onClick={() => setSelected(i + 1)}
            />
          ) : (
            <span key={i} className={i < numerator ? "filled" : ""} />
          ),
        )}
      </div>
    </div>
  );
}
export function FractionComparison({
  a,
  b,
  c,
  d,
}: {
  a: number;
  b: number;
  c: number;
  d: number;
}) {
  return (
    <div className="fraction-comparison">
      <FractionBar numerator={a} denominator={b} />
      <FractionBar numerator={c} denominator={d} />
      <p className="visual-caption">
        Same-sized wholes. Look at the shaded amounts.
      </p>
    </div>
  );
}
export function NumberLine({
  numerator,
  denominator,
}: {
  numerator: number;
  denominator: number;
}) {
  return (
    <div
      className="number-line"
      role="img"
      aria-label={`Number line from zero to one, with ${denominator} equal intervals and a point at ${numerator}/${denominator}`}
    >
      <div className="line-track">
        {Array.from({ length: denominator + 1 }, (_, i) => (
          <span
            className="line-tick"
            key={i}
            style={{ left: `${(i / denominator) * 100}%` }}
          >
            {i === numerator && <i />}
            <small>
              {i === 0 ? "0" : i === denominator ? "1" : `${i}/${denominator}`}
            </small>
          </span>
        ))}
      </div>
    </div>
  );
}
export function ArrayModel({
  rows,
  columns,
}: {
  rows: number;
  columns: number;
}) {
  return (
    <div
      className="array-model"
      role="img"
      aria-label={`${rows} rows with ${columns} counters in each`}
      style={{ gridTemplateColumns: `repeat(${columns},1fr)` }}
    >
      {Array.from({ length: rows * columns }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
export function CounterGroup({
  total,
  groups,
}: {
  total: number;
  groups: number;
}) {
  return (
    <div
      className="counter-groups"
      role="img"
      aria-label={`${total} counters in ${groups} equal groups`}
    >
      {Array.from({ length: groups }, (_, g) => (
        <div key={g}>
          {Array.from({ length: total / groups }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      ))}
    </div>
  );
}
export function MathVisual({ visual }: { visual: Visual }) {
  switch (visual.type) {
    case "fraction_bar":
      return <FractionBar {...visual} />;
    case "comparison":
      return <FractionComparison {...visual} />;
    case "number_line":
      return <NumberLine {...visual} />;
    case "array":
      return <ArrayModel {...visual} />;
    case "counters":
      return <CounterGroup {...visual} />;
  }
}
