import type { Visual } from "../types";

/** Turn an explicit source chain into geometry, never infer causal links from prose. */
export function sourceDiagram(
  text: string,
): Extract<Visual, { type: "diagram" }> | undefined {
  const segment = text
    .split(/[.!?\n]/)
    .find((part) => /→|->|\barrow\b/i.test(part));
  if (!segment) return;
  if (
    !/→|->/.test(segment) &&
    /\b(?:the|an?|each|this|that|draw|drawing|follow)\s+arrow\b|\barrow\s+(?:connects?|points?|shows?|means?|represents?)\b/i.test(
      segment,
    )
  )
    return;
  const chain = segment
    .split(",")[0]
    .split(":")
    .at(-1)!
    .trim()
    .replace(
      /^(?:in\s+|(?:the )?(?:food chain|chain|sequence|equation) (?:is|shows)\s+)/i,
      "",
    );
  const nodes = chain
    .split(/\s*(?:→|->|\barrow\b)\s*/i)
    .map((node) => node.trim());
  if (
    nodes.length < 2 ||
    nodes.length > 8 ||
    nodes.some(
      (node) => !node || node.length > 100 || node.split(/\s+/).length > 10,
    )
  )
    return;
  return {
    type: "diagram",
    title: "Relationships in the question",
    nodes,
    links: nodes.slice(1).map((_, i) => [i, i + 1]),
  };
}

export function sourceVisuals(prompt: string, visuals: Visual[]): Visual[] {
  const converted = visuals.map((visual) =>
    visual.type === "passage" ? (sourceDiagram(visual.text) ?? visual) : visual,
  );
  const diagram = sourceDiagram(prompt);
  return diagram && !converted.some((visual) => visual.type === "diagram")
    ? [diagram, ...converted]
    : converted;
}
