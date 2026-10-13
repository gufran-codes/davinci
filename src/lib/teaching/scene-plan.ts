import { z } from "zod";
import type { Question } from "../types";
import type { ConversationPresentation } from "./types";
import { atomicModel } from "./atomic-model";
import {
  canvasActionSchema,
  type CanvasAction,
  visualActionSequence,
} from "./whiteboard";

/** A model may compose and emphasize approved source objects. It cannot author
 * new scientific relationships, numeric values, answers, markup or code. */
export const visualDirectionSchema = z.object({
  layout: z.enum(["evidence", "comparison"]),
  focus: z
    .array(
      z.object({
        actionId: z.string().max(80),
        quote: z.string().min(1).max(160),
      }),
    )
    .max(4),
  relations: z
    .array(
      z.object({
        actionId: z.string().max(80),
        from: z.string().min(1).max(100),
        connector: z.string().min(1).max(100),
        to: z.string().min(1).max(100),
      }),
    )
    .max(3),
});
export type VisualDirection = z.infer<typeof visualDirectionSchema>;

export function visualSources(p: ConversationPresentation) {
  return (p.canvasActions ?? [])
    .filter((a) => a.type === "showEvidenceCard")
    .map((a) => ({
      actionId: a.id,
      heading: a.heading,
      text: a.text,
      layout: a.layout,
    }));
}

/** A note shares its wording with the checked spoken explanation. It is not
 * another unconstrained generation channel. */
export function applyTeachingNote(
  p: ConversationPresentation,
  q: Question,
  note?: string | null,
) {
  p.canvasActions = (p.canvasActions ?? []).filter(
    (a) => a.id !== "teaching-note",
  );
  if (
    !note ||
    !["hint", "show", "confused", "easier", "why", "define"].includes(
      p.intent,
    ) ||
    note.length > 160 ||
    note.split(/\s+/).length < 4 ||
    /[?]/.test(note) ||
    !(p.spokenText ?? p.text).includes(note) ||
    q.prompt.includes(note) ||
    /see what|let['’]s|look (?:at|here)|try again/i.test(note)
  )
    return false;
  p.canvasActions.push({
    type: "writeText",
    id: "teaching-note",
    owner: "tutor",
    atWord: 0,
    text: note,
    style: "note",
  });
  return true;
}

export function applyVisualDirection(
  p: ConversationPresentation,
  value: unknown,
): boolean {
  const parsed = visualDirectionSchema.safeParse(value);
  if (
    !parsed.success ||
    (!parsed.data.focus.length && !parsed.data.relations.length)
  )
    return false;
  const source = visualSources(p);
  const { focus, layout, relations } = parsed.data;
  // Textual fidelity alone does not make an arrow pedagogically valid. Only
  // curriculum-authored links compile to diagrams; model proposals may focus
  // existing evidence but cannot reinterpret ordinary prose as a graph.
  if (relations.length) return false;
  if (
    new Set(focus.map((f) => f.actionId)).size !== focus.length ||
    new Set(relations.map((r) => r.actionId)).size !== relations.length ||
    focus.some(
      (f) =>
        !source.some(
          (s) => s.actionId === f.actionId && s.text.includes(f.quote),
        ),
    )
  )
    return false;
  // A side-by-side comparison needs exactly two facts; don't turn a long
  // passage or a worked sequence into a misleading comparison.
  if (
    layout === "comparison" &&
    (source.length !== 2 || source.some((s) => s.layout === "steps"))
  )
    return false;
  p.canvasActions = p.canvasActions?.map((a) => {
    if (a.type !== "showEvidenceCard") return a;
    const emphasis = focus.find((f) => f.actionId === a.id);
    return {
      ...a,
      layout: a.layout === "steps" ? a.layout : layout,
      highlights: emphasis ? [emphasis.quote] : a.highlights,
    };
  });
  return true;
}

/** Keep givens, not the assessment question. No answer/explanation/key enters
 * an independent task scene. Quote punctuation is retained in source excerpts. */
export function sourceFacts(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(
      (part) =>
        part &&
        !part.endsWith("?") &&
        !/^(?:which|what|why|how|who|where|when|choose|select|find|solve|calculate|identify)\b/i.test(
          part,
        ),
    );
}

export function workedExampleActions(example: Question): CanvasAction[] {
  const atom = atomicModel(example);
  const models = atom ? [atom] : visualActionSequence(example.visuals, true);
  const calculations = [
    ...example.explanation.matchAll(
      /(?:-?\d+(?:\.\d+)?\s*[+×÷*/−-]\s*)+-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?/g,
    ),
  ]
    .slice(0, 4)
    .map((match, i): CanvasAction => ({
      type: "showEquation",
      id: `example-calculation-${i}`,
      owner: "tutor",
      equation: match[0],
      atWord: 5 + i * 8,
    }));
  const text = `${example.prompt} ${example.explanation}`;
  if (text.length > 500)
    return [
      ...models,
      ...calculations,
      ...cards(text, "dialogue-example", 0, true),
    ];
  return [
    ...models,
    ...calculations,
    {
      type: "writeText",
      id: "dialogue-example",
      owner: "tutor",
      atWord: 0,
      text,
      style: "note",
    },
  ];
}

function cards(
  text: string,
  id: string,
  atWord: number,
  worked: boolean,
): CanvasAction[] {
  const facts = sourceFacts(text);
  // Never truncate scientific propositions mid-sentence. Oversized prose keeps
  // its original source view instead of an incomplete or invented diagram.
  if (
    !facts.length ||
    facts.length > 6 ||
    facts.some((fact) => fact.length > 500)
  )
    return [];
  return facts.map((fact, n) => ({
    type: "showEvidenceCard",
    id: `${id}-fact-${n}`,
    owner: "tutor",
    groupId: id,
    heading: worked ? `Worked step ${n + 1}` : `Source detail ${n + 1}`,
    text: fact,
    highlights: [],
    layout: worked ? "steps" : "evidence",
    atWord: atWord + n * 6,
  }));
}

/** Enrich the existing plan once, before persistence and speech alignment. */
export function buildTeachingScene(p: ConversationPresentation, q: Question) {
  if (p.paused) return;
  if (
    ["rapport", "off_topic", "confidence"].includes(p.intent) ||
    p.teachingMove === "tangent"
  ) {
    p.cues = [];
    p.canvasActions = [];
    return;
  }
  // The full problem already lives above the choices. Keep only a distinct
  // guided sub-question here, not a second copy of the task.
  p.cues = p.cues.filter(
    (c) => c.action !== "question" || c.label !== q.prompt,
  );
  let actions = p.canvasActions ?? [];
  const copiedTask = (text: string) =>
    text === q.prompt || (text.length > 15 && q.prompt.includes(text.trim()));
  const replacedText = new Set<string>();
  const next: CanvasAction[] = [];
  for (const action of actions) {
    if (action.type !== "writeText" && action.type !== "addText") {
      next.push(action);
      continue;
    }
    const worked = action.id === "dialogue-example";
    if (!worked && copiedTask(action.text)) {
      replacedText.add(action.text);
      continue;
    }
    // Explanatory notes are written, not turned into a pile of source cards.
    if (worked || action.id === "teaching-note") {
      next.push(action);
      continue;
    }
    const parts = cards(action.text, action.id, action.atWord, worked);
    if (parts.length) {
      next.push(...parts);
      replacedText.add(action.text);
    } else if (action.text !== q.prompt) next.push(action);
    else replacedText.add(action.text);
  }
  // Passage highlights are retained as exact source-backed emphasis.
  actions = next.filter(
    (a) =>
      a.type !== "highlightText" ||
      next.some((n) => n.type === "writeText" && n.id === a.targetId),
  );
  for (const cue of p.cues) {
    for (const v of cue.visuals) {
      if (v.type !== "passage") continue;
      for (const a of actions)
        if (a.type === "showEvidenceCard")
          a.highlights = [
            ...new Set([
              ...a.highlights,
              ...v.highlights.filter((h) => a.text.includes(h)),
            ]),
          ].slice(0, 4);
    }
    cue.visuals = cue.visuals.filter(
      (v) =>
        v.type !== "passage" ||
        (!replacedText.has(v.text) && !copiedTask(v.text)),
    );
  }
  // Diagrams, tables and timelines supplied by a curriculum source are valid
  // givens even before hints. Preserve them without calculating the answer.
  if (
    !actions.length &&
    !p.cues.some((c) => c.visuals.length) &&
    p.canAnswer &&
    !["rapport", "feedback", "finish", "end_session"].includes(p.intent)
  ) {
    const givens = q.visuals.filter((v) =>
      ["diagram", "table", "timeline"].includes(v.type),
    );
    actions = visualActionSequence(givens);
  }
  const atom =
    p.intent === "show" ||
    (p.hintLevel >= 2 && /nucleus|particle/i.test(p.spokenText ?? p.text))
      ? atomicModel(q)
      : undefined;
  if (atom) {
    actions = [atom];
    p.cues = [];
  }
  p.canvasActions = canvasActionSchema.array().parse(actions);
}
