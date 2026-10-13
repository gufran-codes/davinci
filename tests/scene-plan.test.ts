import { test } from "node:test";
import assert from "node:assert/strict";
import { getQuestion } from "../src/lib/curriculum";
import {
  applyVisualDirection,
  buildTeachingScene,
  sourceFacts,
  workedExampleActions,
  visualSources,
  applyTeachingNote,
} from "../src/lib/teaching/scene-plan";
import {
  visualActionSequence,
  canvasActionSchema,
} from "../src/lib/teaching/whiteboard";
import {
  alignWhiteboard,
  visibleWhiteboardActions,
} from "../src/lib/teaching/whiteboard-playback";
import { atomicModel } from "../src/lib/teaching/atomic-model";
import { penGlyphs } from "../src/lib/teaching/handwriting";
import type { ConversationPresentation } from "../src/lib/teaching/types";

const q = {
  ...getQuestion("g4_science_matter", 0),
  prompt:
    "One sample has mass 1.5 grams. Another has mass 3 grams. Which has greater mass?",
  visuals: [],
};
function presentation(): ConversationPresentation {
  return {
    turnId: "scene-test",
    text: "Compare the two source measurements, keeping their units the same.",
    cues: [
      {
        id: "question",
        atWord: 0,
        action: "question",
        label: q.prompt,
        visuals: [],
      },
      {
        id: "source",
        atWord: 0,
        action: "show",
        label: "Source",
        visuals: [{ type: "passage", text: q.prompt, highlights: [] }],
      },
    ],
    canvasActions: visualActionSequence([
      { type: "passage", text: q.prompt, highlights: [] },
    ]),
    intent: "show",
    canAnswer: true,
    listeningPrompt: "",
    paused: false,
    currentSkill: "Matter",
    strategy: "diagram_first",
    hintLevel: 1,
  };
}
test("a copied question is removed instead of repackaged into arbitrary facts or diagrams", () => {
  const p = presentation();
  buildTeachingScene(p, q);
  assert.deepEqual(p.canvasActions, []);
  assert.ok(
    !JSON.stringify(p.canvasActions).includes("Which has greater mass"),
  );
  assert.ok(!p.cues.some((c) => c.action === "question"));
  assert.equal(visibleWhiteboardActions(p.canvasActions!, 0).length, 0);
  assert.ok(!p.cues.some((c) => c.visuals.length));
  assert.ok(canvasActionSchema.array().safeParse(p.canvasActions).success);
});
test("generated composition selects exact source quotes and rejects invented evidence", () => {
  const p = presentation();
  p.canvasActions = [
    "One sample has mass 1.5 grams.",
    "Another has mass 3 grams.",
  ].map((text, i) => ({
    type: "showEvidenceCard",
    id: `evidence-${i}`,
    groupId: "comparison",
    heading: "Measurement",
    text,
    highlights: [],
    layout: "comparison",
    owner: "tutor",
    atWord: i * 6,
  }));
  const source = visualSources(p);
  assert.equal(
    applyVisualDirection(p, {
      layout: "comparison",
      focus: [{ actionId: source[0].actionId, quote: "1.5 grams" }],
      relations: [],
    }),
    true,
  );
  const before = JSON.stringify(p);
  assert.equal(
    applyVisualDirection(p, {
      layout: "comparison",
      focus: [
        { actionId: source[0].actionId, quote: "the correct answer is 3" },
      ],
      relations: [],
    }),
    false,
  );
  assert.equal(JSON.stringify(p), before);
  alignWhiteboard(p);
  assert.ok(
    p.canvasActions!.every((a) => a.atWord < p.text.split(/\s+/).length),
  );
});
test("even a faithful source clause is not permission to invent a spatial or causal diagram", () => {
  const p = presentation();
  p.canvasActions = [
    {
      type: "showEvidenceCard",
      id: "source",
      groupId: "s",
      heading: "Source",
      text: "The push does not change the direction.",
      highlights: [],
      layout: "evidence",
      owner: "tutor",
      atWord: 0,
    },
  ];
  const direction = {
    layout: "evidence",
    focus: [],
    relations: [
      {
        actionId: "source",
        from: "The push",
        connector: "changes",
        to: "the direction",
      },
    ],
  };
  assert.equal(applyVisualDirection(p, direction), false);
  direction.relations[0].connector = "does not change";
  assert.equal(applyVisualDirection(p, direction), false);
  assert.equal(
    p.canvasActions.filter((a) => a.type === "connectDiagramNodes").length,
    0,
  );
  assert.ok(canvasActionSchema.array().safeParse(p.canvasActions).success);
});

test("particle models are optional, use only givens and never infer neutrality or isotopes", () => {
  const atom = {
    ...q,
    prompt: "An atom contains 8 protons. What is its atomic number?",
  };
  assert.deepEqual(atomicModel(atom), {
    type: "showAtomModel",
    id: "particle-model",
    owner: "tutor",
    atWord: 0,
    protons: 8,
    neutrons: null,
    electrons: null,
  });
  for (const prompt of [
    "Two atoms contain 8 protons and 10 electrons.",
    "An ion has 8 protons.",
    "What are valence electrons?",
    "An atom contains 999 protons.",
    "An atom does not contain 8 protons.",
    "An atom contains more than 8 protons.",
    "An atom contains -8 protons.",
    "An atom contains 1.5 protons.",
  ])
    assert.equal(atomicModel({ ...atom, prompt }), undefined);
  const p: ConversationPresentation = {
    ...presentation(),
    cues: [],
    canvasActions: [],
    intent: "resume" as const,
  };
  buildTeachingScene(p, atom);
  assert.equal(
    p.canvasActions!.length,
    0,
    "Independent recall needs no forced model",
  );
  const shown = { ...p, intent: "show" as const };
  buildTeachingScene(shown, atom);
  assert.ok(shown.canvasActions!.some((a) => a.type === "showAtomModel"));
});

test("handwritten notes share exact approved speech, not the question or imaginary facts", () => {
  const p = presentation();
  const note = "Protons identify the element; electrons affect its charge.";
  p.spokenText = note;
  assert.equal(applyTeachingNote(p, q, note), true);
  assert.equal(
    applyTeachingNote(p, q, "There are ten neutrons in this atom."),
    false,
  );
  assert.equal(
    p.canvasActions!.some((a) => a.id === "teaching-note"),
    false,
  );
  p.spokenText = q.prompt;
  assert.equal(applyTeachingNote(p, q, q.prompt), false);
  for (const char of "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
    assert.ok(
      penGlyphs[char]?.startsWith("M"),
      `Missing pen stroke for ${char}`,
    );
});
test("numeric data and timelines compile to progressive visual marks, not prose", () => {
  const actions = visualActionSequence([
    {
      type: "table",
      headers: ["Day", "Rainfall (mm)"],
      rows: [
        ["Monday", "12"],
        ["Tuesday", "18"],
      ],
    },
    {
      type: "timeline",
      events: [
        { date: "1787", label: "Constitution drafted" },
        { date: "1788", label: "Ratification" },
      ],
    },
  ]);
  assert.equal(actions.filter((a) => a.type === "drawDataBar").length, 2);
  assert.equal(actions.filter((a) => a.type === "drawTimelineEvent").length, 2);
  assert.ok(!actions.some((a) => a.type === "writeText"));
  assert.deepEqual(
    visualActionSequence([
      {
        type: "table",
        headers: ["Object", "Mass"],
        rows: [
          ["A", "12 g"],
          ["B", "18 kg"],
        ],
      },
    ]),
    [],
  );
});
test("worked calculations use only the separate example and keep task answers out", () => {
  const example = {
    ...q,
    prompt: "Find change from 50 cents for a 35-cent item.",
    explanation: "50 - 35 = 15 cents change.",
  };
  const actions = workedExampleActions(example);
  assert.ok(
    actions.some(
      (a) => a.type === "showEquation" && a.equation === "50 - 35 = 15",
    ),
  );
  assert.deepEqual(sourceFacts("The mass is 1.5 grams. Which is heavier?"), [
    "The mass is 1.5 grams.",
  ]);
});
