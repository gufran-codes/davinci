import { z } from "zod";
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
export const whiteboardActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("addText"),
    id: z.string(),
    owner: z.literal("tutor"),
    text: z.string().max(500),
    atWord: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("showFractionBar"),
    id: z.string(),
    owner: z.literal("tutor"),
    numerator: z.number().int().min(0),
    denominator: z.number().int().min(1).max(40),
    atWord: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("clearTutorLayer"),
    atWord: z.number().int().nonnegative(),
  }),
]);
export type WhiteboardAction = z.infer<typeof whiteboardActionSchema>;
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
  return whiteboardActionSchema.array().parse([
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
