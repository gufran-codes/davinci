"use client";

import { useId, useState, type CSSProperties } from "react";
import type { CanvasAction } from "@/lib/teaching/whiteboard";
import styles from "./live-whiteboard.module.css";

type NodeAction = Extract<CanvasAction, { type: "drawDiagramNode" }>;
const position = (index: number) => ({
  x: 20 + (index % 2) * 300,
  y: 20 + Math.floor(index / 2) * 200,
});

function Diagram({
  nodes,
  active,
  actions,
  onInspect,
}: {
  nodes: NodeAction[];
  active: Set<string>;
  actions: CanvasAction[];
  onInspect?: (label: string) => void;
}) {
  const marker = useId().replace(/:/g, "");
  const [selected, setSelected] = useState<string>();
  const selectedNode = nodes.find(
    (node) => node.id === selected && active.has(node.id),
  );
  const links = actions.filter(
    (a) =>
      a.type === "connectDiagramNodes" && a.diagramId === nodes[0].diagramId,
  );
  return (
    <figure className={styles.diagram}>
      <figcaption>{nodes[0].title}</figcaption>
      <svg
        viewBox={`0 0 600 ${Math.ceil(nodes.length / 2) * 200}`}
        role="group"
        aria-label={nodes[0].title}
      >
        <defs>
          <marker
            id={marker}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8" fill="currentColor" />
          </marker>
        </defs>
        {links.map((link) => {
          if (link.type !== "connectDiagramNodes") return null;
          const fromIndex = nodes.findIndex((n) => n.id === link.fromId);
          const toIndex = nodes.findIndex((n) => n.id === link.toId);
          if (
            fromIndex < 0 ||
            toIndex < 0 ||
            !active.has(link.fromId) ||
            !active.has(link.toId)
          )
            return null;
          const from = position(fromIndex),
            to = position(toIndex);
          const sameRow = from.y === to.y;
          const forward = to.x > from.x;
          const x1 = from.x + (sameRow ? (forward ? 260 : 0) : 130),
            y1 = from.y + (sameRow ? 85 : 170);
          const x2 = to.x + (sameRow ? (forward ? -6 : 266) : 130),
            y2 = to.y + (sameRow ? 85 : -6);
          return (
            <path
              key={link.id}
              className={styles.connector}
              pathLength="1"
              d={`M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`}
              markerEnd={`url(#${marker})`}
            />
          );
        })}
        {nodes.map((node, i) => {
          if (!active.has(node.id)) return null;
          const { x, y } = position(i);
          return (
            <foreignObject
              key={node.id}
              x={x}
              y={y}
              width="260"
              height="170"
              className={styles.nodeEntrance}
            >
              <button
                className={styles.node}
                aria-pressed={selected === node.id}
                onClick={() =>
                  setSelected(selected === node.id ? undefined : node.id)
                }
              >
                {node.label}
              </button>
            </foreignObject>
          );
        })}
      </svg>
      <div className={styles.diagramHint}>
        {selectedNode && onInspect ? (
          <button onClick={() => onInspect(selectedNode.label)}>
            Ask about “{selectedNode.label}”
          </button>
        ) : (
          <span>Tap a part to look more closely.</span>
        )}
      </div>
    </figure>
  );
}

export function WrittenText({
  text,
  highlighted = [],
}: {
  text: string;
  highlighted?: string[];
}) {
  // Text remains escaped React content; there is no generated HTML or executable code.
  return (
    <span aria-label={text}>
      {text.split(/(\s+)/).map((word, i) => (
        <span
          aria-hidden
          key={i}
          className={`${styles.ink} ${highlighted.some((phrase) => phrase.toLowerCase().split(/\s+/).includes(word.toLowerCase())) ? styles.marked : ""}`}
          style={
            { "--ink-delay": `${Math.min(i * 22, 1100)}ms` } as CSSProperties
          }
        >
          {word}
        </span>
      ))}
    </span>
  );
}

export function LiveWhiteboard({
  actions,
  plan,
  onInspect,
}: {
  actions: CanvasAction[];
  plan: CanvasAction[];
  onInspect?: (label: string) => void;
}) {
  const nodes = plan.filter(
    (a): a is NodeAction => a.type === "drawDiagramNode",
  );
  const diagrams = [...new Set(nodes.map((a) => a.diagramId))];
  const active = new Set(actions.map((a) => a.id));
  return (
    <div className={styles.surface}>
      {actions
        .filter((a) => a.type === "writeText")
        .map((a) => {
          if (a.type !== "writeText") return null;
          const highlights = actions
            .filter((h) => h.type === "highlightText" && h.targetId === a.id)
            .map((h) => (h.type === "highlightText" ? h.phrase : ""));
          return (
            <p
              key={a.id}
              className={`${styles.writing} ${a.style === "calculation" ? styles.calculation : ""}`}
              data-whiteboard-writing={a.id}
            >
              <WrittenText text={a.text} highlighted={highlights} />
            </p>
          );
        })}
      {diagrams.map((id) => {
        const group = nodes.filter((a) => a.diagramId === id);
        return group.some((n) => active.has(n.id)) ? (
          <Diagram
            key={id}
            nodes={group}
            active={active}
            actions={actions}
            onInspect={onInspect}
          />
        ) : null;
      })}
    </div>
  );
}
