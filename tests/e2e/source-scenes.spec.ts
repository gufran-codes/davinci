import { test, expect } from "@playwright/test";
import { visualActionSequence } from "../../src/lib/teaching/whiteboard";
import { buildTeachingScene } from "../../src/lib/teaching/scene-plan";
import type { Question } from "../../src/lib/types";
import type { ConversationPresentation } from "../../src/lib/teaching/types";

test("source scenes reveal data, real arrows and evidence progressively at desktop and mobile widths", async ({
  page,
}) => {
  await page.route("**/api/sessions/*/voice", (route) =>
    route.fulfill({ status: 503, json: { error: "Offline UI check" } }),
  );
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Explore with a demo family" })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const { children } = await (await page.request.get("/api/children")).json();
  const created = await page.request.post(
    `/api/children/${children[0].id}/sessions`,
    {
      headers: { origin: new URL(page.url()).origin },
      data: { kind: "lesson", conceptId: "g4_science_matter" },
    },
  );
  const { session } = await created.json();
  const p: ConversationPresentation = {
    ...session.conversation,
    turnId: "source-scenes-test",
    text: "Compare these source measurements.",
    spokenText: "Compare these source measurements.",
    cues: [],
    paused: false,
    canAnswer: true,
    canvasActions: [
      ...visualActionSequence([
        {
          type: "table",
          headers: ["Day", "Rainfall (mm)"],
          rows: [
            ["Monday", "12"],
            ["Tuesday", "18"],
          ],
        },
      ]),
      ...visualActionSequence([
        {
          type: "diagram",
          title: "Food to consumer",
          nodes: ["grass", "rabbit"],
          links: [[0, 1]],
        },
      ]),
      {
        type: "showEvidenceCard",
        id: "observation",
        groupId: "observations",
        heading: "Source observation",
        text: "Both gauges were outside for the same length of time.",
        highlights: ["same length of time"],
        layout: "evidence",
        owner: "tutor",
        atWord: 7,
      },
    ],
  };
  await page.route("**/api/sessions/*/conversation", (route) =>
    route.fulfill({
      json: {
        session: { ...session, version: session.version + 1, conversation: p },
      },
    }),
  );
  await page.goto(`/learn/${children[0].id}/session`);
  await page
    .getByRole("button", { name: "Can you show me?", exact: true })
    .click();
  const board = page.getByRole("region", {
    name: "Teaching canvas",
    exact: true,
  });
  await board
    .getByRole("button", { name: "Pause visuals", exact: true })
    .click();
  await expect(board.getByText("Monday", { exact: true })).toBeVisible();
  await expect(board.getByText("Tuesday", { exact: true })).toHaveCount(0);
  while (
    await board.getByRole("button", { name: "Next visual step" }).isEnabled()
  )
    await board.getByRole("button", { name: "Next visual step" }).click();
  await expect(board.getByText("Tuesday", { exact: true })).toBeVisible();
  await expect(board.locator("path[marker-end]")).toHaveCount(1);
  await expect(
    board.getByRole("button", { name: "rabbit", exact: true }),
  ).toBeVisible();
  await expect(board.locator("mark")).toHaveText("same length of time");
  await expect(board.locator("[data-whiteboard-writing]")).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 1000 });
  await board.screenshot({ path: "/tmp/davinci-source-scenes-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await board.screenshot({ path: "/tmp/davinci-source-scenes-mobile.png" });
  await board.getByRole("button", { name: "Replay visuals" }).click();
  await board
    .getByRole("button", { name: "Pause visuals", exact: true })
    .click();
  await expect(board.getByText("Tuesday", { exact: true })).toHaveCount(0);
  await expect(board.locator("path[marker-end]")).toHaveCount(0);
});

test("compiled question source does not paste the assessment onto the board", () => {
  const q = {
    prompt:
      "An upside-down cup is lowered into water. Why does the cup not fill completely?",
    visuals: [],
  } as unknown as Question;
  const p = {
    turnId: "source-compiler-test",
    listeningPrompt: "",
    paused: false,
    currentSkill: "Matter",
    strategy: "diagram_first",
    hintLevel: 1,
    text: "Compare the source details.",
    intent: "show",
    canAnswer: true,
    cues: [
      {
        id: "question",
        atWord: 0,
        action: "question",
        visuals: [],
        label: q.prompt,
      },
    ],
    canvasActions: visualActionSequence([
      { type: "passage", text: q.prompt, highlights: [] },
    ]),
  } as ConversationPresentation;
  buildTeachingScene(p, q);
  expect(p.cues.filter((c) => c.action === "question")).toHaveLength(0);
  expect(
    p.canvasActions?.some((a) => a.type === "writeText" && a.text === q.prompt),
  ).toBeFalsy();
});
