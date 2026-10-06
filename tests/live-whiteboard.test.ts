import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canvasActionSchema,
  visualActionSequence,
} from "../src/lib/teaching/whiteboard";
import {
  alignWhiteboard,
  visibleWhiteboardActions,
  whiteboardSteps,
} from "../src/lib/teaching/whiteboard-playback";
import { SpeechProgress } from "../src/components/voice/speech-progress";
import type { ConversationPresentation } from "../src/lib/teaching/types";

const diagram = visualActionSequence([
  {
    type: "diagram",
    title: "Moving water",
    nodes: ["Water warms", "Water evaporates", "Vapor cools"],
    links: [
      [0, 1],
      [1, 2],
    ],
  },
]);
function presentation(
  speech: string,
  actions = diagram,
): ConversationPresentation {
  return {
    turnId: "turn",
    text: speech,
    spokenText: speech,
    cues: [],
    canvasActions: structuredClone(actions),
    intent: "show",
    canAnswer: true,
    listeningPrompt: "What do you notice?",
    paused: false,
    currentSkill: "Water cycle",
    strategy: "diagram_first",
    hintLevel: 1,
  };
}

test("source-backed diagrams have progressive nodes and validated connections", () => {
  assert.equal(diagram.filter((a) => a.type === "drawDiagramNode").length, 3);
  assert.equal(
    diagram.filter((a) => a.type === "connectDiagramNodes").length,
    2,
  );
  assert.equal(visibleWhiteboardActions(diagram, 0).length, 1);
  const midpoint = visibleWhiteboardActions(diagram, 6);
  assert.equal(midpoint.filter((a) => a.type === "drawDiagramNode").length, 2);
  assert.equal(
    midpoint.filter((a) => a.type === "connectDiagramNodes").length,
    1,
  );
  assert.ok(canvasActionSchema.array().safeParse(diagram).success);
});

test("final speech anchors align nodes, stay ordered, and fit short LLM rewrites", () => {
  const p = presentation(
    "First water warms. Then water evaporates. Finally vapor cools.",
  );
  alignWhiteboard(p);
  assert.deepEqual(
    p
      .canvasActions!.filter((a) => a.type === "drawDiagramNode")
      .map((a) => a.atWord),
    [1, 4, 7],
  );
  p.spokenText = "Look here.";
  alignWhiteboard(p, p.text);
  assert.ok(p.canvasActions!.every((a) => a.atWord < 2));
  assert.deepEqual(whiteboardSteps(p.canvasActions!), [0, 1]);
});

test("clear, rewind and invalid endpoints cannot leave stale connectors", () => {
  const actions = [
    ...diagram,
    {
      type: "clearCanvas" as const,
      id: "clear",
      owner: "tutor" as const,
      atWord: 20,
    },
  ];
  assert.equal(visibleWhiteboardActions(actions, 20).length, 0);
  assert.equal(visibleWhiteboardActions(actions, 0).length, 1);
  assert.equal(
    visibleWhiteboardActions(
      [
        {
          type: "connectDiagramNodes",
          id: "bad",
          owner: "tutor",
          atWord: 0,
          diagramId: "a",
          fromId: "missing",
          toId: "absent",
        },
      ],
      10,
    ).length,
    0,
  );
  assert.equal(
    canvasActionSchema.safeParse({
      type: "writeText",
      id: "bad",
      owner: "tutor",
      atWord: -1,
      text: "A",
    }).success,
    false,
  );
});

test("passage annotation and calculations keep curriculum values intact", () => {
  const actions = visualActionSequence([
    {
      type: "passage",
      text: "The child shelters under an umbrella.",
      highlights: ["umbrella"],
    },
    { type: "equation", equation: "24 ÷ 3 = ?" },
  ]);
  assert.equal(actions[0].type, "writeText");
  assert.equal(actions[1].type, "highlightText");
  assert.equal(actions[2].type, "showEquation");
  assert.ok(!JSON.stringify(actions).includes("= 8"));
});

test("streaming partial transcripts accumulate without regressions or crossing turns", () => {
  const progress = new SpeechProgress();
  progress.reset("one", "First water warms. Then vapor cools.");
  progress.start();
  assert.equal(progress.update([{ id: "a", text: "First water" }]), 2);
  assert.equal(progress.update([{ id: "a", text: "First water warms." }]), 3);
  assert.equal(progress.update([{ id: "b", text: "Then vapor" }]), 5);
  assert.equal(progress.update([{ id: "b", text: "Then" }]), 5);
  progress.stop(true);
  assert.equal(progress.update([{ id: "b", text: "Then vapor cools." }]), null);
  assert.equal(progress.finish("one", 6), null);
  progress.reset("two", "First compare these groups.");
  progress.start();
  assert.equal(progress.update([{ id: "a", text: "First water warms." }]), 0);
  assert.equal(progress.finish("one", 6), null);
  assert.equal(progress.update([{ id: "c", text: "First compare" }]), 2);
});

// Rendering is checked in Playwright: Next owns the CSS-module transform.
