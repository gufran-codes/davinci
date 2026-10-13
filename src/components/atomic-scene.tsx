"use client";
import { useState } from "react";
import type { CanvasAction } from "@/lib/teaching/whiteboard";
import styles from "./live-whiteboard.module.css";

type Particle = "protons" | "neutrons" | "electrons";
const details: Record<Particle, string> = {
  protons:
    "Positive charge · In the nucleus. Proton count defines the element’s atomic number.",
  neutrons:
    "No electric charge · In the nucleus. Different neutron counts can give isotopes of the same element.",
  electrons:
    "Negative charge · Outside the nucleus. The cloud marks a region, not a path or a shell count.",
};
export function AtomicScene({
  action,
}: {
  action: Extract<CanvasAction, { type: "showAtomModel" }>;
}) {
  const [selected, setSelected] = useState<Particle>("protons");
  const count = action[selected];
  return (
    <figure className={styles.atomScene}>
      <figcaption>Inside the atom</figcaption>
      <svg
        viewBox="0 0 440 270"
        role="img"
        aria-label="Schematic nucleus inside an electron region; counts shown only when supplied in the question."
      >
        <ellipse
          cx="220"
          cy="125"
          rx="186"
          ry="105"
          className={styles.electronCloud}
          data-active={selected === "electrons"}
        />
        <circle
          cx="220"
          cy="125"
          r="64"
          className={styles.nucleus}
          data-active={selected !== "electrons"}
        />
        <text x="220" y="132" textAnchor="middle">
          Nucleus
        </text>
        <text x="220" y="252" textAnchor="middle" className={styles.atomSmall}>
          Electron region
        </text>
      </svg>
      <p className={styles.atomCaption}>
        Schematic—not to scale. Select a particle to explore.
      </p>
      <div
        className={styles.particleControls}
        role="group"
        aria-label="Explore particles"
      >
        {(["protons", "neutrons", "electrons"] as const).map((particle) => (
          <button
            key={particle}
            aria-pressed={selected === particle}
            onClick={() => setSelected(particle)}
          >
            <span>{particle}</span>
            <strong>
              {action[particle] === null ? "Not given" : action[particle]}
            </strong>
          </button>
        ))}
      </div>
      <div className={styles.particleDetail} aria-live="polite">
        <p>{details[selected]}</p>
        {count !== null && count > 0 && count <= 20 && (
          <div
            className={styles.particleDots}
            aria-label={`${count} ${selected} given`}
          >
            {Array.from({ length: count }, (_, i) => (
              <span key={`${selected}-${i}`} aria-hidden>
                {selected === "protons"
                  ? "+"
                  : selected === "electrons"
                    ? "−"
                    : "0"}
              </span>
            ))}
          </div>
        )}
        <small>
          {count === null
            ? "This question does not give this count. No value has been assumed."
            : `${count} ${selected} supplied by the question.`}
        </small>
      </div>
    </figure>
  );
}
