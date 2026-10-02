import { test, expect } from "@playwright/test";

test("lesson auto-connects, recovers blocked greeting, and respects voice off", async ({
  page,
}) => {
  let connections = 0;
  await page.route("**/api/sessions/*/voice", async (route) => {
    connections++;
    await route.fulfill({ json: { provider: "browser" } });
  });
  await page.addInitScript(() => {
    let first = true;
    class Recognition {
      continuous = false;
      interimResults = false;
      lang = "";
      start() {
        document.documentElement.dataset.mic = "on";
      }
      abort() {
        document.documentElement.dataset.mic = "off";
      }
      stop() {}
    }
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: Recognition,
      configurable: true,
    });
    Object.defineProperty(window, "SpeechRecognition", {
      value: Recognition,
      configurable: true,
    });
    Object.defineProperty(window, "AudioContext", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => new MediaStream(),
      configurable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [],
        cancel() {},
        resume() {},
        speak(utterance: SpeechSynthesisUtterance) {
          document.documentElement.dataset.spoken = utterance.text;
          if (first) {
            first = false;
            setTimeout(
              () =>
                utterance.dispatchEvent(
                  Object.assign(new Event("error"), { error: "not-allowed" }),
                ),
              10,
            );
          } else {
            setTimeout(() => utterance.dispatchEvent(new Event("start")), 10);
            setTimeout(() => utterance.dispatchEvent(new Event("end")), 350);
          }
        },
      },
    });
  });
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
      data: { kind: "lesson", conceptId: "equivalent_fractions" },
    },
  );
  expect(response.ok()).toBeTruthy();
  await page.goto(`/learn/${children[0].id}/session`);
  const enable = page.getByRole("button", {
    name: "Enable sound",
    exact: true,
  });
  await expect(enable).toBeVisible();
  expect(connections).toBe(1);
  const opening = await page.locator("html").getAttribute("data-spoken");
  expect(opening?.length).toBeGreaterThan(10);
  await expect(page.locator("html")).toHaveAttribute("data-mic", "on");
  await enable.click();
  await expect(enable).toHaveCount(0);
  await expect(page.getByText("I’m listening", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-spoken", opening!);
  await page.getByRole("button", { name: "Voice off", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-mic", "off");
  await expect(
    page.getByRole("button", { name: "Reconnect voice" }),
  ).toBeVisible();
  expect(connections).toBe(1);
  await page.getByRole("button", { name: "Reconnect voice" }).click();
  await expect(page.getByText("I’m listening", { exact: true })).toBeVisible();
  expect(connections).toBe(2);
});
