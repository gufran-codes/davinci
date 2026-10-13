import type { Question } from "../types";
import type { CanvasAction } from "./whiteboard";

/** Read only explicit particle counts. Neutrality, isotope and shell occupancy
 * are not inferred from an element name, answer key or distractor. */
export function atomicModel(q: Question): CanvasAction | undefined {
  if (
    q.subject !== "Science" ||
    !/\b(?:atom|atomic|protons?|neutrons?|electrons?)\b/i.test(q.prompt)
  )
    return;
  const count = (particle: string) => {
    const matches = [
      ...q.prompt.matchAll(
        new RegExp(`(?<![-\\d.])\\b(\\d+) ${particle}s?\\b`, "gi"),
      ),
    ];
    if (matches.length !== 1) return null;
    const value = Number(matches[0][1]);
    return value <= 118 ? value : null;
  };
  // Multiple atoms, ions and comparisons require a different model, not one
  // imaginary atom assembled from numbers belonging to different objects.
  if (
    /\b(?:two|both|compare|another|other|ions?|isotopes?|not|without|fewer|more|less|could|might|if)\b|at (?:least|most)/i.test(
      q.prompt,
    )
  )
    return;
  const protons = count("proton"),
    neutrons = count("neutron"),
    electrons = count("electron");
  if (protons === null && neutrons === null && electrons === null) return;
  return {
    type: "showAtomModel",
    id: "particle-model",
    owner: "tutor",
    atWord: 0,
    protons,
    neutrons,
    electrons,
  };
}
