import type { ConversationPresentation } from "./types";
import { canvasActionSchema, type CanvasAction } from "./whiteboard";

const tokens = (text: string) =>
  text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/** Align source-backed actions to final speech, including wording replaced by the
 * LLM. Unmentioned actions keep proportional timing, never a future word index. */
export function alignWhiteboard(
  p: ConversationPresentation,
  previousSpeech?: string,
) {
  const speech = p.spokenText ?? p.text;
  const length = Math.max(1, words(speech).length);
  const previousLength = Math.max(1, words(previousSpeech ?? speech).length);
  let lastWord = 0;
  p.canvasActions = [...(p.canvasActions ?? [])]
    .sort((a, b) => a.atWord - b.atWord)
    .map((action) => {
      const label =
        action.type === "drawDiagramNode"
          ? action.label
          : action.type === "highlightText"
            ? action.phrase
            : action.type === "showEquation"
              ? action.equation
              : action.type === "writeText" || action.type === "addText"
                ? action.text
                : "";
      const needle = tokens(label);
      const spoken = words(speech);
      let anchor = -1;
      if (needle.length) {
        // Match a complete phrase, rather than a common word like “the”.
        anchor = spoken.findIndex(
          (_, i) =>
            tokens(spoken.slice(i, i + words(label).length).join(" ")).join(
              " ",
            ) === needle.join(" "),
        );
      }
      const scaled = Math.round((action.atWord * length) / previousLength);
      const atWord = Math.min(
        length - 1,
        Math.max(lastWord, anchor >= 0 ? anchor : scaled),
      );
      lastWord = atWord;
      return canvasActionSchema.parse(
        action.type === "addText"
          ? { ...action, type: "writeText", style: "note", atWord }
          : { ...action, atWord },
      );
    });
}

export function whiteboardSteps(actions: CanvasAction[]) {
  return [...new Set(actions.map((a) => a.atWord))].sort((a, b) => a - b);
}

/** Replaying and rewinding always derive from the plan, not accumulated DOM. */
export function visibleWhiteboardActions(
  actions: CanvasAction[],
  word: number,
) {
  const active = actions.filter((a) => a.atWord <= word);
  const clear = active.findLastIndex(
    (a) => a.type === "clearCanvas" || a.type === "clearTutorLayer",
  );
  const visible = active.slice(clear + 1);
  const ids = new Set(visible.map((a) => a.id));
  return visible.filter(
    (a) =>
      a.type !== "connectDiagramNodes" ||
      (ids.has(a.fromId) && ids.has(a.toId)),
  );
}
