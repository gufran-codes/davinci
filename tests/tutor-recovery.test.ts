import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sourceDiagram,
  sourceVisuals,
} from "../src/lib/teaching/source-diagram";
import { visualActionSequence } from "../src/lib/teaching/whiteboard";
import { reusableTutorDispatch } from "../src/server/voice/dispatch";

test("source arrows compile to actual nodes and connectors even with a passage present", () => {
  for (const arrow of ["→", "->", "arrow"]) {
    const visuals = sourceVisuals(
      `In grass ${arrow} rabbit ${arrow} fox, what does the rabbit eat?`,
      [
        {
          type: "passage",
          text: "The arrow connects food to its consumer.",
          highlights: [],
        },
      ],
    );
    const actions = visualActionSequence(visuals);
    assert.deepEqual(
      actions.filter((a) => a.type === "drawDiagramNode").map((a) => a.label),
      ["grass", "rabbit", "fox"],
    );
    assert.equal(
      actions.filter((a) => a.type === "connectDiagramNodes").length,
      2,
    );
  }
  assert.equal(
    sourceDiagram("The arrow connects food to its consumer."),
    undefined,
  );
  assert.equal(
    sourceDiagram("Draw an arrow to explain this question."),
    undefined,
  );
  assert.equal(sourceDiagram("Plants use sunlight."), undefined);
  assert.equal(
    visualActionSequence([
      { type: "passage", text: "solid -> liquid -> gas", highlights: [] },
    ]).filter((a) => a.type === "connectDiagramNodes").length,
    2,
  );
});

test("reconnect reuses pending/running tutor jobs but not completed, failed or foreign jobs", () => {
  const dispatch = (status: number, endedAt = 0n) => ({
    agentName: "primer-tutor",
    state: { deletedAt: 0n, jobs: [{ state: { status, endedAt } }] },
  });
  assert.equal(reusableTutorDispatch(dispatch(0)), true);
  assert.equal(reusableTutorDispatch(dispatch(1)), true);
  assert.equal(reusableTutorDispatch(dispatch(2)), false);
  assert.equal(reusableTutorDispatch(dispatch(3)), false);
  assert.equal(reusableTutorDispatch(dispatch(1, 123n)), false);
  assert.equal(
    reusableTutorDispatch({ ...dispatch(1), agentName: "another-agent" }),
    false,
  );
  assert.equal(
    reusableTutorDispatch({
      agentName: "primer-tutor",
      state: { deletedAt: 0n, jobs: [] },
    }),
    true,
  );
});
