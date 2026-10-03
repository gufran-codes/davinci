import { test, expect } from "@playwright/test";
test("grade navigation, parent answer controls, reveal teaching and persistent student board", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Explore with a demo family" })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const { children } = await (await page.request.get("/api/children")).json();
  const child = children[0];
  const origin = new URL(page.url()).origin;
  await page.goto("/app/settings");
  await page
    .getByLabel("Correct answer access")
    .first()
    .selectOption("immediate");
  await page
    .getByRole("button", { name: "Save learning controls" })
    .first()
    .click();
  await expect(
    page.getByText("Learning controls saved.").first(),
  ).toBeVisible();
  await page.goto(`/learn/${child.id}`);
  await expect(
    page.getByRole("heading", { name: `Grade ${child.grade} curriculum` }),
  ).toBeVisible();
  const response = await page.request.post(
    `/api/children/${child.id}/sessions`,
    {
      headers: { origin },
      data: { kind: "lesson", conceptId: "equivalent_fractions" },
    },
  );
  expect(response.ok()).toBeTruthy();
  await page.goto(`/learn/${child.id}/session`);
  await expect(
    page.getByRole("heading", { name: "Which choice fits best?" }),
  ).toBeVisible();
  const option = page.getByRole("button", { name: /B 2\/4/ });
  await option.click();
  await expect(option).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Choose this answer" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Show correct answer" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Show correct answer" }).click();
  await expect(
    page.getByRole("button", { name: "Try a fresh question" }),
  ).toBeVisible();
  const board = page.getByRole("region", { name: "Shared whiteboard" });
  await board.getByRole("button", { name: "text", exact: true }).click();
  await page.getByLabel("Text or equation").fill("1/2 = 2/4");
  await page
    .getByRole("img", { name: "Student drawing board" })
    .click({ position: { x: 80, y: 80 } });
  await board.getByRole("button", { name: "Save work", exact: true }).click();
  await expect(board.getByRole("status")).toHaveText("Work saved");
  await page.reload();
  await expect(board.getByText("1/2 = 2/4", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Try a fresh question" }).click();
  await expect(
    page.getByRole("button", { name: "Try a fresh question" }),
  ).toHaveCount(0);
  await page.goto("/dev/curriculum");
  await expect(
    page.getByRole("heading", { name: "Da Vinci curriculum inspector" }),
  ).toBeVisible();
});
