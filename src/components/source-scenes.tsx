"use client";

import type { CSSProperties } from "react";
import type { CanvasAction } from "@/lib/teaching/whiteboard";
import styles from "./live-whiteboard.module.css";

function SourceQuote({
  text,
  highlights,
}: {
  text: string;
  highlights: string[];
}) {
  const phrase = highlights.find((h) => text.includes(h));
  if (!phrase) return <>{text}</>;
  const start = text.indexOf(phrase);
  return (
    <>
      {text.slice(0, start)}
      <mark>{phrase}</mark>
      <SourceQuote
        text={text.slice(start + phrase.length)}
        highlights={highlights.filter((h) => h !== phrase)}
      />
    </>
  );
}

export function SourceScenes({
  actions,
  plan,
  onInspect,
}: {
  actions: CanvasAction[];
  plan: CanvasAction[];
  onInspect?: (label: string) => void;
}) {
  const active = new Set(actions.map((a) => a.id));
  const cards = plan.filter((a) => a.type === "showEvidenceCard");
  const bars = plan.filter((a) => a.type === "drawDataBar");
  const events = plan.filter((a) => a.type === "drawTimelineEvent");
  return (
    <>
      {[...new Set(cards.map((a) => a.groupId))].map((id) => {
        const group = cards.filter((a) => a.groupId === id);
        if (!group.some((a) => active.has(a.id))) return null;
        return (
          <div
            key={id}
            className={styles.evidenceGrid}
            data-scene-layout={group[0].layout}
            aria-label={
              group[0].layout === "steps"
                ? "Worked example steps"
                : "Source evidence"
            }
          >
            {group
              .filter((a) => active.has(a.id))
              .map((a, i) => (
                <article
                  key={a.id}
                  className={styles.sourceCard}
                  data-source-card={a.id}
                >
                  <header>
                    <span className={styles.stepNumber}>{i + 1}</span>
                    <span>{a.heading}</span>
                  </header>
                  <p>
                    <SourceQuote text={a.text} highlights={a.highlights} />
                  </p>
                  {onInspect && (
                    <button
                      className={styles.inspectSource}
                      onClick={() => onInspect(a.text)}
                    >
                      Ask about this detail
                    </button>
                  )}
                </article>
              ))}
          </div>
        );
      })}
      {[...new Set(bars.map((a) => a.chartId))].map((id) => {
        const group = bars.filter((a) => a.chartId === id);
        if (!group.some((a) => active.has(a.id))) return null;
        const max = Math.max(1, ...group.map((a) => a.value));
        return (
          <figure
            key={id}
            className={styles.dataChart}
            aria-label={group[0].title}
          >
            <figcaption>{group[0].title}</figcaption>
            <div className={styles.chartScale}>
              <span>0</span>
              <span>
                {max} · {group[0].unit}
              </span>
            </div>
            {group.map((bar) => (
              <div key={bar.id} className={styles.barRow}>
                <span className={styles.barLabel}>
                  {active.has(bar.id) ? bar.label : ""}
                </span>
                <div className={styles.barTrack}>
                  {active.has(bar.id) && (
                    <div
                      className={styles.dataBar}
                      style={
                        {
                          "--bar-width": `${(bar.value / max) * 100}%`,
                        } as CSSProperties
                      }
                    >
                      <span>{bar.value}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <p className={styles.sceneCaption}>
              Source measurements · common scale starting at zero
            </p>
          </figure>
        );
      })}
      {[...new Set(events.map((a) => a.timelineId))].map((id) => {
        const group = events.filter((a) => a.timelineId === id);
        if (!group.some((a) => active.has(a.id))) return null;
        return (
          <figure
            key={id}
            className={styles.timelineScene}
            aria-label="Source timeline"
          >
            <figcaption>Sequence of events</figcaption>
            <ol>
              {group
                .filter((a) => active.has(a.id))
                .map((event) => (
                  <li key={event.id}>
                    <strong>{event.date}</strong>
                    <p>{event.label}</p>
                  </li>
                ))}
            </ol>
            <p className={styles.sceneCaption}>
              Events shown in source order · spacing does not represent elapsed
              time
            </p>
          </figure>
        );
      })}
    </>
  );
}
