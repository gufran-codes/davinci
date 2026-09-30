import { test, expect } from "@playwright/test";

test("parent evidence, skill details and isolated grade/subject editing", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Explore with a demo family" })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Growing independence" }),
  ).toBeVisible();
  const { children } = await (await page.request.get("/api/children")).json();
  const child = children[0],
    sibling = children[1];
  await page.getByRole("link", { name: "Explore subjects and skills" }).click();
  const fractions = page
    .locator("details.skill-domain")
    .filter({ has: page.locator("summary", { hasText: /^Fractions$/ }) })
    .first();
  await fractions.locator(":scope > summary").click();
  const skill = fractions.locator("details.parent-skill").first();
  await skill.locator("summary").click();
  await expect(skill.getByText("Help needed", { exact: true })).toBeVisible();
  await page.goto(`/app/children/${child.id}`);
  await page.getByText("Manage grade and subjects", { exact: false }).click();
  const form = page.getByRole("form", {
    name: `${child.nickname} learning settings`,
  });
  await form.getByLabel("Current grade").selectOption("6");
  await form.getByLabel("Social Studies", { exact: true }).uncheck();
  await form.getByRole("button", { name: "Save grade and subjects" }).click();
  await expect(form.getByRole("status")).toContainText("Past progress is kept");
  await page.reload();
  await page.getByText("Manage grade and subjects", { exact: false }).click();
  await expect(page.getByLabel("Current grade")).toHaveValue("6");
  const updated = (await (await page.request.get("/api/children")).json())
    .children;
  expect(updated.find((c: { id: string }) => c.id === sibling.id).grade).toBe(
    sibling.grade,
  );
  expect(
    updated.find((c: { id: string }) => c.id === child.id).subjects,
  ).not.toContain("Social Studies");
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({
    path: "/tmp/davinci-parent-tablet.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.goto(`/learn/${child.id}`);
  await expect(
    page.getByRole("heading", { name: "Grade 6 lessons are coming" }),
  ).toBeVisible();
  await page.goto(`/dev/${child.id}`);
  await expect(
    page.getByRole("heading", { name: "Curriculum pending" }),
  ).toBeVisible();
});
