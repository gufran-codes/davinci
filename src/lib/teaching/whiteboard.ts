import { z } from "zod";
import type { Visual } from "../types";
const point = z.tuple([z.number().min(0).max(800), z.number().min(0).max(400)]);
export const boardObjectSchema = z.object({
  id: z.string().max(80),
  owner: z.literal("student"),
  kind: z.enum([
    "pen",
    "highlighter",
    "text",
    "rectangle",
    "circle",
    "counter",
  ]),
  x: z.number().min(0).max(800),
  y: z.number().min(0).max(400),
  text: z.string().max(500).optional(),
  points: z.array(point).max(400).optional(),
});
export const boardSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    objects: z.array(boardObjectSchema).max(120),
  })
  .superRefine((b, ctx) => {
    if (new Set(b.objects.map((o) => o.id)).size !== b.objects.length)
      ctx.addIssue({
        code: "custom",
        message: "Board object IDs must be unique",
      });
  });
export type BoardObject = z.infer<typeof boardObjectSchema>;
export type StudentBoard = z.infer<typeof boardSchema>;
const tutorAction = {
  id: z.string().max(80),
  owner: z.literal("tutor"),
  atWord: z.number().int().nonnegative(),
};
const fraction = z.object({
  numerator: z.number().int().min(0).max(80),
  denominator: z.number().int().min(1).max(80),
  label: z.string().max(80).optional(),
});
export const canvasActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("addText"),
    ...tutorAction,
    text: z.string().max(500),
  }),
  z.object({
    type: z.literal("showFractionBar"),
    ...tutorAction,
    numerator: z.number().int().min(0),
    denominator: z.number().int().min(1).max(40),
  }),
  z.object({
    type: z.literal("clearTutorLayer"),
    id: z.string().max(80).default("clear"),
    owner: z.literal("tutor").default("tutor"),
    atWord: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("showNumberLine"),
    ...tutorAction,
    min: z.number().int().min(-100).max(100),
    max: z.number().int().min(-100).max(100),
    subdivisions: z.number().int().min(1).max(80).optional(),
    label: z.string().max(100).optional(),
  }),
  z.object({
    type: z.literal("animateNumberLineJump"),
    ...tutorAction,
    from: z.number().min(-100).max(100),
    to: z.number().min(-100).max(100),
    label: z.string().max(80).optional(),
  }),
  z.object({
    type: z.literal("showEquation"),
    ...tutorAction,
    equation: z.string().min(1).max(120),
  }),
  z.object({
    type: z.literal("animateEquationStep"),
    ...tutorAction,
    from: z.string().min(1).max(120),
    to: z.string().min(1).max(120),
  }),
  z.object({
    type: z.literal("highlightTerm"),
    ...tutorAction,
    term: z.string().min(1).max(60),
  }),
  z.object({
    type: z.literal("showFractionBars"),
    ...tutorAction,
    bars: z.array(fraction).min(1).max(4),
  }),
  z.object({
    type: z.literal("compareFractions"),
    ...tutorAction,
    left: fraction,
    right: fraction,
  }),
  z.object({
    type: z.literal("showArray"),
    ...tutorAction,
    rows: z.number().int().min(1).max(12),
    columns: z.number().int().min(1).max(12),
  }),
  z.object({
    type: z.literal("moveCounters"),
    ...tutorAction,
    total: z.number().int().min(1).max(60),
    groups: z.number().int().min(1).max(12),
  }),
  z.object({
    type: z.literal("showPlaceValueBlocks"),
    ...tutorAction,
    hundreds: z.number().int().min(0).max(9),
    tens: z.number().int().min(0).max(9),
    ones: z.number().int().min(0).max(9),
  }),
  z.object({
    type: z.literal("showCoordinateGraph"),
    ...tutorAction,
    minX: z.number().int().min(-20).max(20),
    maxX: z.number().int().min(-20).max(20),
    minY: z.number().int().min(-20).max(20),
    maxY: z.number().int().min(-20).max(20),
  }),
  z.object({
    type: z.literal("plotPoint"),
    ...tutorAction,
    x: z.number().min(-20).max(20),
    y: z.number().min(-20).max(20),
    label: z.string().max(40).optional(),
  }),
  z.object({
    type: z.literal("showGeometryShape"),
    ...tutorAction,
    shape: z.enum(["rectangle", "triangle", "circle", "cube"]),
    width: z.number().positive().max(100),
    height: z.number().positive().max(100),
    depth: z.number().positive().max(100).optional(),
    label: z.string().max(100),
  }),
  z.object({
    type: z.literal("highlightCanvasElement"),
    ...tutorAction,
    targetId: z.string().max(80),
  }),
  z.object({
    type: z.literal("clearCanvas"),
    ...tutorAction,
  }),
]);
export const whiteboardActionSchema = canvasActionSchema;
export type CanvasAction = z.infer<typeof canvasActionSchema>;
export type WhiteboardAction = CanvasAction;
export function boardAnswer(objects: BoardObject[], selected: string[]) {
  const selection = objects.filter((o) => selected.includes(o.id));
  const text = selection
    .filter((o) => o.kind === "text")
    .map((o) => o.text ?? "")
    .join(" ")
    .trim();
  if (text) return text.includes("=") ? text.split("=").at(-1)!.trim() : text;
  if (selection.length && selection.every((o) => o.kind === "counter"))
    return String(selection.length);
  return null;
}

export function fractionSequence(numerator: number, denominator: number) {
  return canvasActionSchema.array().parse([
    {
      type: "showFractionBar",
      id: "whole-before",
      owner: "tutor",
      numerator,
      denominator,
      atWord: 0,
    },
    {
      type: "showFractionBar",
      id: "whole-split",
      owner: "tutor",
      numerator: numerator * 2,
      denominator: denominator * 2,
      atWord: 14,
    },
    {
      type: "addText",
      id: "same-amount",
      owner: "tutor",
      text: `${numerator}/${denominator} = ${numerator * 2}/${denominator * 2}. The whole and colored amount stay the same.`,
      atWord: 25,
    },
  ]);
}

export function numberLineSequence(start: number, jump: number) {
  const end = start + jump;
  return canvasActionSchema.array().parse([
    {
      type: "showNumberLine",
      id: "number-line",
      owner: "tutor",
      min: Math.min(0, start, end),
      max: Math.max(end, start, 1),
      label: `Start at ${start}`,
      atWord: 0,
    },
    {
      type: "animateNumberLineJump",
      id: "number-line-jump",
      owner: "tutor",
      from: start,
      to: end,
      label: `${jump >= 0 ? "+" : ""}${jump}`,
      atWord: 7,
    },
  ]);
}

export function multiplicationSequence(
  rows: number,
  columns: number,
  revealProduct = false,
) {
  const actions: unknown[] = [
    {
      type: "showArray",
      id: "multiplication-array",
      owner: "tutor",
      rows,
      columns,
      atWord: 0,
    },
    {
      type: "showEquation",
      id: "multiplication-equation",
      owner: "tutor",
      equation: `${rows} × ${columns}`,
      atWord: 6,
    },
  ];
  if (revealProduct)
    actions.push({
      type: "animateEquationStep",
      id: "multiplication-product",
      owner: "tutor",
      from: `${rows} × ${columns}`,
      to: `${rows} × ${columns} = ${rows * columns}`,
      atWord: 14,
    });
  return canvasActionSchema.array().parse(actions);
}

export function visualActionSequence(
  visuals: Visual[],
  revealParallelStep = false,
) {
  const actions: unknown[] = [];
  visuals.forEach((visual, index) => {
    const id = `visual-${index}`;
    switch (visual.type) {
      case "equation":
        actions.push({
          type: "showEquation",
          id,
          owner: "tutor",
          atWord: 0,
          equation: visual.equation,
        });
        break;
      case "fraction_bar":
        actions.push({
          type: "showFractionBars",
          id,
          owner: "tutor",
          bars: [visual],
          atWord: index * 3,
        });
        break;
      case "comparison":
        actions.push({
          type: "compareFractions",
          id,
          owner: "tutor",
          left: { numerator: visual.a, denominator: visual.b },
          right: { numerator: visual.c, denominator: visual.d },
          atWord: index * 3,
        });
        break;
      case "number_line":
        actions.push(
          {
            type: "showNumberLine",
            id,
            owner: "tutor",
            min: 0,
            max: Math.max(1, Math.ceil(visual.numerator / visual.denominator)),
            subdivisions: visual.denominator,
            label: `Each step is 1/${visual.denominator}`,
            atWord: 0,
          },
          {
            type: "animateNumberLineJump",
            id: `${id}-jump`,
            owner: "tutor",
            from: 0,
            to: visual.numerator / visual.denominator,
            label: `${visual.numerator}/${visual.denominator}`,
            atWord: 7,
          },
        );
        break;
      case "array":
        actions.push(
          ...multiplicationSequence(
            visual.rows,
            visual.columns,
            revealParallelStep,
          ),
        );
        break;
      case "counters":
        actions.push({
          type: "moveCounters",
          id,
          owner: "tutor",
          total: visual.total,
          groups: visual.groups,
          atWord: 4,
        });
        break;
      case "geometry":
        actions.push({
          type: "showGeometryShape",
          id,
          owner: "tutor",
          shape: visual.shape,
          width: visual.width,
          height: visual.height,
          depth: visual.depth,
          label: visual.label,
          atWord: 0,
        });
        break;
    }
  });
  return canvasActionSchema.array().parse(actions);
}
