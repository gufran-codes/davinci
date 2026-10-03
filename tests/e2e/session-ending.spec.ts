import { test, expect, type Page } from "@playwright/test";

async function lesson(page: Page) {
  await page.route("**/api/sessions/*/voice", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Voice disabled in this interaction test" },
    }),
  );
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Explore with a demo family" })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const { children } = await (await page.request.get("/api/children")).json();
  const child = children[0];
  const response = await page.request.post(
    `/api/children/${child.id}/sessions`,
    {
      headers: { origin: new URL(page.url()).origin },
      data: { kind: "lesson", conceptId: "g4_science_matter" },
    },
  );
  expect(response.ok()).toBeTruthy();
  const { session } = await response.json();
  await page.goto(`/learn/${child.id}/session`);
  await expect(page.getByLabel("Current problem")).toBeVisible();
  return session;
}

test("one Finish click saves the lesson, disables duplicates, and opens completion", async ({
  page,
}) => {
  const session = await lesson(page);
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/sessions/*/finish", async (route) => {
    calls++;
    await gate;
    await route.continue();
  });
  const button = page.getByRole("button", {
    name: "Finish session",
    exact: true,
  });
  await button.click();
  await expect(
    page.getByRole("button", { name: "Saving your lesson…" }),
  ).toBeDisabled();
  release();
  await expect(page).toHaveURL(/\/complete$/);
  expect(calls).toBe(1);
  const saved = (
    await (await page.request.get(`/api/sessions/${session.id}`)).json()
  ).session;
  expect(saved.state).toBe("COMPLETE");
  expect(saved.conversation.intent).toBe("end_session");
  const duplicate = await page.request.post(
    `/api/sessions/${session.id}/finish`,
    {
      headers: { origin: new URL(page.url()).origin },
      data: { requestId: crypto.randomUUID() },
    },
  );
  expect((await duplicate.json()).session.version).toBe(saved.version);
});

test("natural stop command recovers a lost completion response without leaving a half-ended lesson", async ({
  page,
}) => {
  const session = await lesson(page);
  await page.route("**/api/sessions/*/finish", async (route) => {
    const saved = await route.fetch();
    expect(saved.ok()).toBeTruthy();
    await route.abort("failed");
  });
  const input = page.getByRole("textbox", { name: "Your answer or question" });
  if (!(await input.isVisible()))
    await page
      .getByRole("button", { name: "Type an answer", exact: true })
      .click();
  await input.fill("Can we stop now?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page).toHaveURL(/\/complete$/);
  const saved = (
    await (await page.request.get(`/api/sessions/${session.id}`)).json()
  ).session;
  expect(saved.state).toBe("COMPLETE");
});
