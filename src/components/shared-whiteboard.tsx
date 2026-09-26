"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "./forms";
import {
  boardAnswer,
  type BoardObject,
  type StudentBoard,
} from "@/lib/teaching/whiteboard";
type Tool = BoardObject["kind"] | "select" | "eraser";
export function SharedWhiteboard({
  sessionId,
  onAnswer,
}: {
  sessionId: string;
  onAnswer: (answer: string) => void;
}) {
  const [board, setBoard] = useState<StudentBoard>({
      revision: 0,
      objects: [],
    }),
    [tool, setTool] = useState<Tool>("pen"),
    [text, setText] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [history, setHistory] = useState<BoardObject[][]>([]),
    [future, setFuture] = useState<BoardObject[][]>([]),
    [message, setMessage] = useState("Loading board…"),
    [ready, setReady] = useState(false),
    [saving, setSaving] = useState(false);
  const gesture = useRef<{
    id: string;
    start: [number, number];
    before: BoardObject[];
  } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/sessions/${sessionId}/board`)
      .then((r) => {
        if (!r.ok) throw Error("Board could not load");
        return r.json();
      })
      .then((r) => {
        if (live) {
          setBoard(r.board);
          setReady(true);
          setMessage("");
        }
      })
      .catch((e) => {
        if (live) setMessage(e.message);
      });
    return () => {
      live = false;
    };
  }, [sessionId]);
  const commit = (objects: BoardObject[]) => {
    setHistory((h) => [...h, board.objects].slice(-30));
    setFuture([]);
    setBoard({ ...board, objects });
    setMessage("Unsaved work");
  };
  const point = (e: React.PointerEvent<SVGSVGElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(800, ((e.clientX - r.left) * 800) / r.width)),
      Math.max(0, Math.min(400, ((e.clientY - r.top) * 400) / r.height)),
    ];
  };
  async function save() {
    setSaving(true);
    try {
      const result = await api<{ board: StudentBoard }>(
        `/api/sessions/${sessionId}/board`,
        board,
      );
      setBoard(result.board);
      setMessage("Work saved");
      return true;
    } catch (e) {
      setMessage((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="card spaced shared-whiteboard"
      aria-label="Shared whiteboard"
    >
      <h3>Your working space</h3>
      <p>
        The tutor’s models stay above. Your work stays here. Select typed
        equations or counters to use as your answer.
      </p>
      <div className="conversation-shortcuts">
        {(
          [
            "pen",
            "eraser",
            "highlighter",
            "text",
            "rectangle",
            "circle",
            "counter",
            "select",
          ] as Tool[]
        ).map((t) => (
          <button
            disabled={!ready || saving}
            key={t}
            aria-pressed={tool === t}
            onClick={() => setTool(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tool === "text" && (
        <label>
          Text or equation
          <input
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type, then tap the board"
          />
        </label>
      )}
      <svg
        viewBox="0 0 800 400"
        role="img"
        aria-label="Student drawing board"
        style={{
          width: "100%",
          border: "1px solid #b9c8c1",
          background: "#fff",
          touchAction: "none",
          pointerEvents: !ready || saving ? "none" : "auto",
        }}
        onPointerDown={(e) => {
          if (!ready || saving) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const [x, y] = point(e);
          const id = (e.target as Element)
            .closest("[data-id]")
            ?.getAttribute("data-id");
          if (tool === "eraser") {
            if (id) commit(board.objects.filter((o) => o.id !== id));
            return;
          }
          if (tool === "select") {
            if (id) {
              setSelected((v) =>
                v.includes(id) ? v.filter((k) => k !== id) : [...v, id],
              );
              gesture.current = { id, start: [x, y], before: board.objects };
            }
            return;
          }
          if (board.objects.length >= 120) {
            setMessage(
              "Save your work and clear some objects before adding more.",
            );
            return;
          }
          const object: BoardObject = {
            id: crypto.randomUUID(),
            owner: "student",
            kind: tool,
            x,
            y,
            text: tool === "text" ? text : undefined,
            points: ["pen", "highlighter"].includes(tool)
              ? [[x, y]]
              : undefined,
          };
          if (tool === "text" && !text.trim()) return;
          gesture.current = {
            id: object.id,
            start: [x, y],
            before: board.objects,
          };
          setBoard({ ...board, objects: [...board.objects, object] });
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g) return;
          const [x, y] = point(e);
          setBoard((b) => ({
            ...b,
            objects: b.objects.map((o) => {
              if (o.id !== g.id) return o;
              if (tool === "select") {
                const old = g.before.find((v) => v.id === g.id)!;
                const dx = x - g.start[0],
                  dy = y - g.start[1];
                return {
                  ...o,
                  x: Math.max(0, Math.min(800, old.x + dx)),
                  y: Math.max(0, Math.min(400, old.y + dy)),
                  points: old.points?.map(([px, py]) => [
                    Math.max(0, Math.min(800, px + dx)),
                    Math.max(0, Math.min(400, py + dy)),
                  ]),
                };
              }
              return o.points
                ? {
                    ...o,
                    points: [...o.points, [x, y] as [number, number]].slice(
                      -400,
                    ),
                  }
                : o;
            }),
          }));
        }}
        onPointerUp={() => {
          if (gesture.current) {
            const before = gesture.current.before;
            setHistory((h) => [...h, before].slice(-30));
            setFuture([]);
            setMessage("Unsaved work");
            gesture.current = null;
          }
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
      >
        {board.objects.map((o) => (
          <g
            key={o.id}
            data-id={o.id}
            stroke={selected.includes(o.id) ? "#e58c40" : "#285951"}
            fill="none"
            strokeWidth={o.kind === "highlighter" ? 18 : 3}
            opacity={o.kind === "highlighter" ? 0.35 : 1}
          >
            {o.points ? (
              <polyline
                points={o.points.map((p) => p.join(",")).join(" ")}
                strokeLinecap="round"
              />
            ) : o.kind === "text" ? (
              <text x={o.x} y={o.y} stroke="none" fill="#285951" fontSize="20">
                {o.text}
              </text>
            ) : o.kind === "rectangle" ? (
              <rect x={o.x} y={o.y} width="90" height="55" />
            ) : (
              <circle
                cx={o.x}
                cy={o.y}
                r={o.kind === "counter" ? 12 : 35}
                fill={o.kind === "counter" ? "#acd4c1" : "none"}
              />
            )}
          </g>
        ))}
      </svg>
      <div className="conversation-shortcuts">
        <button
          disabled={!history.length || saving}
          onClick={() => {
            setFuture((f) => [board.objects, ...f]);
            setBoard({ ...board, objects: history.at(-1)! });
            setHistory((h) => h.slice(0, -1));
            setMessage("Unsaved work");
          }}
        >
          Undo
        </button>
        <button
          disabled={!future.length || saving}
          onClick={() => {
            setHistory((h) => [...h, board.objects]);
            setBoard({ ...board, objects: future[0] });
            setFuture((f) => f.slice(1));
            setMessage("Unsaved work");
          }}
        >
          Redo
        </button>
        <button
          disabled={!selected.length || saving}
          onClick={() => {
            commit(board.objects.filter((o) => !selected.includes(o.id)));
            setSelected([]);
          }}
        >
          Clear selected
        </button>
        <button disabled={!ready || saving} onClick={() => void save()}>
          Save work
        </button>
        <button
          disabled={!selected.length || saving}
          onClick={async () => {
            const answer = boardAnswer(board.objects, selected);
            if (!answer) {
              setMessage(
                "Select typed text, an equation, or counters. Pen strokes are saved but are not automatically read yet.",
              );
              return;
            }
            if (await save()) onAnswer(answer);
          }}
        >
          Use selected work as my answer
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
