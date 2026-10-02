import { test, expect } from "@playwright/test";

test("guided teaching keeps the active step on the canvas across reloads", async ({
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
  const created = await page.request.post(
    `/api/children/${child.id}/sessions`,
    {
      headers: { origin },
      data: { kind: "lesson", conceptId: "equivalent_fractions" },
    },
  );
  expect(created.ok()).toBeTruthy();
  await page.goto(`/learn/${child.id}/session`);
  await page
    .getByRole("button", { name: "Type an answer", exact: true })
    .click();
  const input = page.getByLabel("Your answer or question");
  const board = page.getByRole("region", {
    name: "Teaching canvas",
    exact: true,
  });
  async function say(text: string) {
    await input.fill(text);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/conversation") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Send", exact: true }).click();
    expect((await response).ok()).toBeTruthy();
    await expect(input).toHaveValue("");
  }
  await say("Walk me through this step by step");
  await expect(
    board.getByText("What number multiplies 2 to make 4?", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Which choice fits best?" }),
  ).toHaveCount(0);
  await say("three");
  await expect(
    board.getByText("What number multiplies 2 to make 4?", { exact: true }),
  ).toBeVisible();
  await say("two");
  await expect(
    board.getByText(/Multiply the numerator 1 by the same factor 2/),
  ).toBeVisible();
  await page.reload();
  await expect(
    board.getByText(/Multiply the numerator 1 by the same factor 2/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Type an answer", exact: true })
    .click();
  await say("two");
  await expect(
    page.getByRole("heading", { name: "Which choice fits best?" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /B 2\/4/ })).toBeVisible();
});
