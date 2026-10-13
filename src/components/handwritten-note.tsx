"use client";
import { useState, type CSSProperties } from "react";
import { glyphWidth, penGlyphs } from "@/lib/teaching/handwriting";
import styles from "./live-whiteboard.module.css";

export function HandwrittenNote({
  text,
  highlighted = [],
}: {
  text: string;
  highlighted?: string[];
}) {
  const [plain, setPlain] = useState(false);
  const pace = Math.min(65, 7000 / Math.max(1, text.length));
  const words = text.split(/(\s+)/);
  return (
    <span className={styles.handwriting}>
      <span role="img" aria-label={text} hidden={plain}>
        {words.map((word, w) => {
          if (!word.trim()) {
            return (
              <span key={w} aria-hidden>
                {word}
              </span>
            );
          }
          const wordStart = words.slice(0, w).join("").length;
          const letters = [...word];
          const marked = highlighted.some((h) =>
            h.toLowerCase().includes(word.toLowerCase()),
          );
          const width = [...word].reduce(
            (n, letter) => n + glyphWidth(letter),
            4,
          );
          return (
            <svg
              key={w}
              aria-hidden
              viewBox={`-2 0 ${width + 8} 40`}
              className={marked ? styles.marked : undefined}
              style={{ width: `${(width + 8) / 32}em`, height: "1.25em" }}
            >
              {[...word].map((letter, n) => {
                const offset = letters
                  .slice(0, n)
                  .reduce((sum, char) => sum + glyphWidth(char), 2);
                const timing = {
                  "--pen-delay": `${(wordStart + n) * pace}ms`,
                  "--pen-duration": `${pace * 1.1}ms`,
                } as CSSProperties;
                const d = penGlyphs[letter];
                return d ? (
                  <path
                    key={n}
                    d={d}
                    transform={`translate(${offset} 0) skewX(-6)`}
                    className={styles.penStroke}
                    pathLength={1}
                    style={timing}
                  />
                ) : (
                  <text
                    key={n}
                    x={offset}
                    y={27}
                    className={styles.penSymbol}
                    style={timing}
                  >
                    {letter}
                  </text>
                );
              })}
            </svg>
          );
        })}
      </span>
      {plain && <span className={styles.plainNote}>{text}</span>}
      <button
        className={styles.noteToggle}
        onClick={() => setPlain(!plain)}
        aria-pressed={plain}
      >
        {plain ? "Show handwriting" : "Read as text"}
      </button>
    </span>
  );
}
