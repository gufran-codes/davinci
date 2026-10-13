import { test, expect } from "@playwright/test";

test("particle exploration and pen-stroke notes support replay, mobile, readable text and reduced motion", async ({
  page,
}) => {
  await page.route("**/api/sessions/*/voice", (route) =>
    route.fulfill({ status: 503, json: { error: "Offline UI test" } }),
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
  const note = "Protons identify the element. Electrons affect its charge.";
  const p = {
    ...session.conversation,
    turnId: "pen-and-particles",
    cues: [],
    text: note,
    spokenText: note,
    canvasActions: [
      {
        type: "writeText",
        id: "teaching-note",
        owner: "tutor",
        atWord: 0,
        text: note,
        style: "note",
      },
      {
        type: "showAtomModel",
        id: "atom",
        owner: "tutor",
        atWord: 4,
        protons: 8,
        neutrons: null,
        electrons: null,
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
  const strokes = board.locator(
    '[data-whiteboard-writing] path[pathLength="1"]',
  );
  await expect(strokes).not.toHaveCount(0);
  await expect(strokes.last()).toHaveCSS("stroke-dashoffset", "1px");
  await board
    .getByRole("button", { name: "Pause visuals", exact: true })
    .click();
  await expect(strokes.last()).toHaveCSS("stroke-dashoffset", "0px");
  await board.getByRole("button", { name: "Next visual step" }).click();
  await expect(board.getByRole("button", { name: "protons 8" })).toBeVisible();
  await board.getByRole("button", { name: "electrons Not given" }).click();
  await expect(
    board.getByText(
      "This question does not give this count. No value has been assumed.",
    ),
  ).toBeVisible();
  await board.getByRole("button", { name: "Read as text" }).click();
  await expect(board.getByText(note, { exact: true })).toBeVisible();
  await board.getByRole("button", { name: "Show handwriting" }).click();
  await page.setViewportSize({ width: 1024, height: 1000 });
  await board.screenshot({ path: "/tmp/davinci-particles-and-writing.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await board.screenshot({
    path: "/tmp/davinci-particles-and-writing-mobile.png",
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await board.getByRole("button", { name: "Replay visuals" }).click();
  await expect(strokes.last()).toHaveCSS("animation-name", "none");
  await expect(strokes.last()).toHaveCSS("stroke-dashoffset", "0px");
  await expect(board.getByRole("button", { name: "protons 8" })).toHaveCount(0);
});
