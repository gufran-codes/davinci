import { test, expect } from "@playwright/test";

for (const [skill, phrase] of [
  ["g4_science_matter", "Air in the cup takes up space"],
  ["g4_social_studies_sources", "Compare when and why each source was created"],
]) {
  test(`${skill}: choices stay central, selectable and grounded in the visible task`, async ({
    page,
  }) => {
    // This check exercises interaction/assessment, not paid speech providers.
    await page.route("**/api/sessions/*/voice", (route) =>
      route.fulfill({
        status: 503,
        json: { error: "Voice disabled for this interaction test" },
      }),
    );
    await page.goto("/login");
    await page
      .getByRole("button", { name: "Explore with a demo family" })
      .click();
    await expect(page).toHaveURL(/\/app$/);
    const { children } = await (await page.request.get("/api/children")).json();
    const child = children[0];
    const result = await page.request.post(
      `/api/children/${child.id}/sessions`,
      {
        headers: { origin: new URL(page.url()).origin },
        data: { kind: "lesson", conceptId: skill },
      },
    );
    expect(result.ok()).toBeTruthy();
    await page.goto(`/learn/${child.id}/session`);
    const options = page.getByRole("group", { name: "Answer choices" });
    await expect(options.getByRole("button")).toHaveCount(3);
    const task = page.getByLabel("Current problem");
    await expect(task).toBeVisible();
    const taskText = await task.innerText();
    const choice = options.getByRole("button", { name: new RegExp(phrase) });
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await page.setViewportSize({ width: 1024, height: 900 });
    const optionsBounds = await options.boundingBox();
    const canvasBounds = await page
      .getByRole("region", { name: "Teaching canvas", exact: true })
      .boundingBox();
    expect(optionsBounds!.y).toBeLessThan(canvasBounds!.y);
    expect(optionsBounds!.width).toBeGreaterThan(400);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `/tmp/davinci-${skill}.png`,
      fullPage: false,
    });
    const submitted = page.waitForResponse(
      (r) =>
        r.url().endsWith("/conversation") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Choose this answer" }).click();
    const response = await submitted;
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.session.teachingDebug.lastTurn.inputTask.prompt).toBe(taskText);
    expect(body.session.teachingDebug.lastTurn.interpretation.intent).toBe(
      "answer",
    );
    expect(body.session.teachingDebug.lastTurn.interpretationSource).toBe(
      "local",
    );
    await expect(
      page.getByRole("heading", { name: "Explain your choice" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Choose this answer" }),
    ).toBeDisabled();
    await expect(page.getByRole("textbox")).toBeVisible();
  });
}
