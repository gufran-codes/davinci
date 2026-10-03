import { test, expect, Page } from "@playwright/test";
import type { PublicSession } from "../../src/server/provider";

async function latest(page: Page, id: string) {
  const response = await page.request.get(`/api/sessions/${id}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).session as PublicSession;
}

async function openFallback(page: Page) {
  const answer = page.getByRole("textbox", { name: "Your answer or question" });
  if (!(await answer.isVisible()))
    await page
      .getByRole("button", { name: "Type or use answer cards" })
      .click();
  return answer;
}

async function say(page: Page, session: PublicSession, text: string) {
  const answer = await openFallback(page);
  await answer.fill(text);
  const result = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/sessions/${session.id}/conversation`) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send" }).click();
  const next = (await (await result).json()).session as PublicSession;
  if (next.conversation)
    await expect(
      page.getByText(next.conversation.text, { exact: true }),
    ).toBeVisible();
  return next;
}

async function finish(page: Page, initial: PublicSession) {
  const result = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/api/sessions/${initial.id}/finish`) &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  expect((await (await result).json()).session.state).toBe("COMPLETE");
  await expect(page).toHaveURL(/\/complete$/);
}

test("signup → child → conversational diagnostic → lesson → homework → return", async ({
  page,
}) => {
  const email = `family-${Date.now()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Your first name").fill("Jamie");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("practice-password-123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(
    page.getByRole("heading", { name: "Meet your little learner." }),
  ).toBeVisible();
  await page.getByLabel("What should we call your child?").fill("Robin");
  await page.getByRole("button", { name: "Create child profile" }).click();
  await expect(page.getByRole("heading", { name: /Hi, Robin/ })).toBeVisible();
  const childId = page.url().split("/").pop()!;

  let result = page.waitForResponse((response) =>
    response.url().endsWith(`/children/${childId}/sessions`),
  );
  await page
    .getByRole("button", { name: "Let’s find your starting point" })
    .click();
  let session = (await (await result).json()).session as PublicSession;
  await expect(page).toHaveURL(/\/session$/);
  session = await latest(page, session.id);
  const initialStrategy = session.conversation?.strategy;
  session = await say(page, session, "999");
  expect(session.conversation?.strategy).not.toBe(initialStrategy);
  expect(session.feedback).toBeNull();
  await finish(page, session);

  await page.getByRole("link", { name: "See the parent summary" }).click();
  await expect(page.getByText("Nothing needed from you today.")).toBeVisible();
  await page.goto(`/learn/${childId}`);
  result = page.waitForResponse((response) =>
    response.url().endsWith(`/children/${childId}/sessions`),
  );
  await page.getByRole("button", { name: "Start today’s lesson" }).click();
  session = (await (await result).json()).session as PublicSession;
  await expect(page).toHaveURL(/\/session$/);
  session = await latest(page, session.id);
  session = await say(page, session, "I need a hint");
  expect(session.conversation?.hintLevel).toBe(1);
  const hintedText = session.conversation?.text;
  session = await say(page, session, "Teach me another way");
  expect(session.conversation?.text).not.toBe(hintedText);
  await page.reload();
  await expect(page.getByText(session.conversation!.text)).toBeVisible();
  await finish(page, session);

  await page.goto(`/learn/${childId}/homework`);
  await page
    .getByLabel("Choose homework photo")
    .setInputFiles("public/icon-192.png");
  await page.getByRole("button", { name: "Find what to practice" }).click();
  await expect(page.getByText("Your photo is saved privately.")).toBeVisible();
  await page.getByRole("combobox").selectOption("adding_unlike");
  result = page.waitForResponse((response) =>
    response.url().endsWith(`/children/${childId}/sessions`),
  );
  await page
    .getByRole("button", { name: "Practice a similar problem" })
    .click();
  session = (await (await result).json()).session as PublicSession;
  expect(session.kind).toBe("homework");
  await expect(page).toHaveURL(/\/session$/);
  session = await latest(page, session.id);
  await finish(page, session);
  await expect(
    page.getByText("Now try the original homework problem yourself."),
  ).toBeVisible();

  await page.goto("/app");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("practice-password-123");
  await page.getByRole("button", { name: "Welcome back" }).click();
  await expect(
    page.getByRole("heading", { name: "Robin’s learning" }),
  ).toBeVisible();
  await expect(page.getByText("Completed this week")).toBeVisible();
});

test("demo evidence changes teaching; all target widths avoid overflow", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Explore with a demo family" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Maya’s learning" }),
  ).toBeVisible();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({
      path: `test-results/dashboard-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  const response = await page.request.get("/api/children");
  const { children } = await response.json();
  for (const child of children) {
    await page.goto(`/learn/${child.id}`);
    const started = page.waitForResponse((entry) =>
      entry.url().endsWith(`/children/${child.id}/sessions`),
    );
    await page.getByRole("button", { name: "Start today’s lesson" }).click();
    let session = (await (await started).json()).session as PublicSession;
    await expect(page).toHaveURL(/\/session$/);
    session = await latest(page, session.id);
    if (child.nickname === "Maya")
      expect(session.personalization).toContain("visual approach helped");
    if (child.nickname === "Adam")
      expect(session.personalization).toContain("Multiplying by 4");
    if (child.nickname === "Sofia") {
      expect(session.personalization).toContain("size of the pieces");
      expect(
        session.question.id.startsWith("compare_same_numerator"),
      ).toBeTruthy();
    }
  }
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({
      path: `test-results/lesson-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("API refuses cross-account data, invalid inputs, and cross-origin mutations", async ({
  page,
  browser,
}) => {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Explore with a demo family" })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const { children } = await (await page.request.get("/api/children")).json();
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.goto("/login");
  await other
    .getByRole("button", { name: "Explore with a demo family" })
    .click();
  await expect(other).toHaveURL(/\/app$/);
  const origin = new URL(page.url()).origin;
  let response = await other.request.post(
    `/api/children/${children[0].id}/sessions`,
    { headers: { origin }, data: { kind: "lesson" } },
  );
  expect(response.status()).toBe(404);
  response = await page.request.post("/api/children", {
    headers: { origin: "https://unrelated.example" },
    data: { nickname: "No", age: 9, grade: 4, goal: "Build confidence" },
  });
  expect(response.status()).toBe(403);
  response = await page.request.post("/api/children", {
    headers: { origin },
    data: { nickname: "No", age: 2, grade: 4, goal: "Build confidence" },
  });
  expect(response.status()).toBe(400);
  await context.close();
});
