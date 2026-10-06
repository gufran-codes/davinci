import { test, expect } from "@playwright/test";
import { visualActionSequence } from "../../src/lib/teaching/whiteboard";

// Rendering/playback contract uses a prepared turn, so this test does not call
// paid voice/LLM services. Server grounding is covered by the integration test.
test("whiteboard progressively draws, pauses, replays and replaces a turn at tablet width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.route("**/api/sessions/*/voice", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Voice disabled for canvas test" },
    }),
  );
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Explore with a demo family" })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const { children } = await (await page.request.get("/api/children")).json();
  const response = await page.request.post(
    `/api/children/${children[0].id}/sessions`,
    {
      headers: { origin: new URL(page.url()).origin },
      data: { kind: "lesson", conceptId: "g4_science_matter" },
    },
  );
  expect(response.ok()).toBeTruthy();
  const { session } = await response.json();
  let turn = 0;
  await page.route("**/api/sessions/*/conversation", async (route) => {
    turn++;
    const diagram = turn === 1;
    await route.fulfill({
      json: {
        session: {
          ...session,
          version: session.version + turn,
          conversation: {
            ...session.conversation,
            turnId: `whiteboard-test-${turn}`,
            text: "Look at the food chain. What do you notice?",
            spokenText: "Look at the food chain. What do you notice?",
            cues: [],
            paused: false,
            canAnswer: true,
            canvasActions: [
              ...visualActionSequence(
                diagram
                  ? [
                      {
                        type: "diagram",
                        title: "Food chain",
                        nodes: ["Grass", "Rabbit", "Fox"],
                        links: [
                          [0, 1],
                          [1, 2],
                        ],
                      },
                    ]
                  : [
                      {
                        type: "passage",
                        text: "Look at one equal group before finding the total.",
                        highlights: ["equal group"],
                      },
                      { type: "equation", equation: "24 ÷ 3 = ?" },
                    ],
              ),
              ...(diagram
                ? []
                : [
                    {
                      type: "animateEquationStep",
                      id: "worked-result",
                      owner: "tutor",
                      atWord: 8,
                      from: "24 ÷ 3 = ?",
                      to: "24 ÷ 3 = 8",
                    },
                  ]),
            ],
          },
        },
      },
    });
  });
  await page.goto(`/learn/${children[0].id}/session`);
  await page
    .getByRole("button", { name: "Can you show me?", exact: true })
    .click();
  const canvas = page.getByRole("region", {
    name: "Teaching canvas",
    exact: true,
  });
  await expect(
    canvas.getByRole("button", { name: "Grass", exact: true }),
  ).toBeVisible();
  await canvas
    .getByRole("button", { name: "Pause visuals", exact: true })
    .click();
  await expect(
    canvas.getByRole("button", { name: "Fox", exact: true }),
  ).toHaveCount(0);
  await canvas.getByRole("button", { name: "Next visual step" }).click();
  await expect(
    canvas.getByRole("button", { name: "Rabbit", exact: true }),
  ).toBeVisible();
  await canvas.getByRole("button", { name: "Next visual step" }).click();
  await expect(canvas.locator('path[pathLength="1"]')).toHaveCount(1);
  await canvas.getByRole("button", { name: "Next visual step" }).click();
  await expect(
    canvas.getByRole("button", { name: "Fox", exact: true }),
  ).toBeVisible();
  await canvas.getByRole("button", { name: "Fox", exact: true }).click();
  await expect(
    canvas.getByRole("button", { name: "Ask about “Fox”" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Answer choices", exact: true }),
  ).toBeVisible();
  await canvas.screenshot({ path: "/tmp/davinci-live-diagram.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await canvas.getByRole("button", { name: "Replay visuals" }).click();
  await canvas.getByRole("button", { name: "Pause visuals" }).click();
  await expect(
    canvas.getByRole("button", { name: "Fox", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Can you show me?", exact: true })
    .click();
  await expect(
    canvas.getByRole("button", { name: "Grass", exact: true }),
  ).toHaveCount(0);
  await expect(canvas.locator("[data-whiteboard-writing]")).toContainText(
    "one equal group",
  );
  await expect(canvas.locator(".action-equation")).toContainText("24 ÷ 3 = ?");
  await canvas.getByRole("button", { name: "Pause visuals" }).click();
  await expect(canvas.locator(".action-equation")).toHaveCount(1);
  await canvas.getByRole("button", { name: "Next visual step" }).click();
  await canvas.getByRole("button", { name: "Next visual step" }).click();
  await expect(canvas.locator(".action-equation")).toHaveCount(2);
  await expect(canvas.locator(".previous-equation")).toContainText(
    "24 ÷ 3 = ?",
  );
  await expect(canvas.locator(".action-equation").last()).toContainText(
    "24 ÷ 3 = 8",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await canvas.screenshot({ path: "/tmp/davinci-live-writing.png" });
});
