import { test, expect } from "@playwright/test";

test("student space: subject search, persistent schedule, saved lesson and responsive navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Explore with a demo family" })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const { children } = await (await page.request.get("/api/children")).json();
  const child = children[0],
    root = `/learn/${child.id}`;
  await page.goto(root);
  await expect(
    page.getByRole("heading", { name: `Welcome back, ${child.nickname}.` }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: `Grade ${child.grade} curriculum` }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Student navigation" })
    .getByRole("link", { name: "Math", exact: true })
    .click();
  const search = page.getByRole("searchbox", { name: "Search Math skills" });
  await search.fill("equivalent fractions");
  await expect(
    page.locator("summary").filter({ hasText: "Equivalent fractions" }).first(),
  ).toBeVisible();
  await search.fill("no-such-topic");
  await expect(
    page.getByRole("heading", { name: "No matching skills" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(search).toHaveValue("");
  await page.goto(`${root}/schedule`);
  await page
    .getByRole("combobox", { name: "Subject", exact: true })
    .selectOption("Math");
  const date = new Date(Date.now() + 3 * 86400000);
  date.setHours(16, 0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await page.getByLabel("Date and time").fill(local);
  await page.getByRole("button", { name: "Save study time" }).click();
  await expect(page.getByRole("status")).toContainText("Study time saved");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Cancel Math study time" }),
  ).toBeVisible();
  await page.goto(root);
  await expect(
    page
      .getByRole("heading", { name: "Your next study time" })
      .locator("..")
      .locator(".."),
  ).toContainText("Math");
  await page.goto(`${root}/schedule`);
  await page.getByRole("button", { name: "Cancel Math study time" }).click();
  await page.reload();
  await expect(
    page.getByText("No study times yet.", { exact: false }),
  ).toBeVisible();
  await page.goto(`${root}/uploads`);
  await expect(
    page.getByRole("heading", { name: "My materials", exact: true }),
  ).toBeVisible();
  await page.goto(`${root}/sessions`);
  await expect(
    page.getByRole("heading", { name: "Your story starts here." }),
  ).toBeVisible();
  await page.goto(root);
  const started = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith(`/api/children/${child.id}/sessions`),
  );
  await page.getByRole("button", { name: "Start today’s lesson" }).click();
  const { session: startedSession } = await (await started).json();
  await expect(page).toHaveURL(/\/session$/);
  await expect(
    page.getByRole("button", { name: "Start talking" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Take a break — your place is saved" })
    .click();
  let creates = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith(`/api/children/${child.id}/sessions`)
    )
      creates++;
  });
  await page
    .getByRole("button", { name: "Pick up where you left off" })
    .click();
  await expect(page).toHaveURL(/\/session$/);
  expect(creates).toBe(0);
  const exported = await (await page.request.get("/api/account/export")).json();
  const saved = exported.children.find(
    (c: { id: string }) => c.id === child.id,
  ).sessions;
  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe(startedSession.id);
  await page.getByText("Open your working board", { exact: true }).click();
  const board = page.getByRole("region", { name: "Shared whiteboard" });
  await board.getByRole("button", { name: "text", exact: true }).click();
  await page.getByLabel("Text or equation").fill("My saved thinking");
  await page
    .getByRole("img", { name: "Student drawing board" })
    .click({ position: { x: 60, y: 60 } });
  await board.getByRole("button", { name: "Save work", exact: true }).click();
  await expect(board.getByRole("status")).toHaveText("Work saved");
  const completed = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/api/sessions/${startedSession.id}/finish`) &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  expect((await (await completed).json()).session.state).toBe("COMPLETE");
  await expect(page).toHaveURL(/\/complete$/);
  await page.goto(`${root}/sessions/${startedSession.id}`);
  await expect(
    page.getByRole("heading", { name: "Your saved whiteboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Saved student whiteboard" }),
  ).toContainText("My saved thinking");
  await page
    .locator("summary")
    .filter({ hasText: "Review the conversation" })
    .click();
  await expect(
    page.getByText("A little clearer", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Da Vinci · Written reply", { exact: true }).first(),
  ).toBeVisible();
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto(root);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `/tmp/davinci-student-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Student navigation" })
    .getByRole("link", { name: "Science", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Science", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(errors).toEqual([]);
});
