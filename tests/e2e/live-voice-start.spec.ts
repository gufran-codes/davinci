import { test, expect } from "@playwright/test";

// Explicit opt-in: this uses the configured LiveKit/STT/TTS services and balance.
test.skip(
  process.env.LIVE_VOICE_TEST !== "1",
  "Set LIVE_VOICE_TEST=1 for paid-provider verification",
);
test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  },
});

test("real LiveKit worker starts and sends non-silent tutor audio to the browser", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Explore with a demo family" })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const { children } = await (await page.request.get("/api/children")).json();
  const started = await page.request.post(
    `/api/children/${children[0].id}/sessions`,
    {
      headers: { origin: new URL(page.url()).origin },
      data: { kind: "lesson", conceptId: "equivalent_fractions" },
    },
  );
  expect(started.ok()).toBeTruthy();
  const voiceRequest = page.waitForResponse(
    (r) => r.url().endsWith("/voice") && r.request().method() === "POST",
  );
  await page.goto(`/learn/${children[0].id}/session`);
  const configuration = await voiceRequest;
  expect(configuration.ok()).toBeTruthy();
  expect((await configuration.json()).provider).toBe("livekit");
  await expect
    .poll(() => page.locator("audio").count(), {
      timeout: 45000,
      message: "Remote tutor audio track must arrive",
    })
    .toBeGreaterThan(0);
  const peak = await page.evaluate(async () => {
    const el = document.querySelector("audio")!;
    const stream = el.srcObject;
    if (!(stream instanceof MediaStream)) return 0;
    const context = new AudioContext();
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let peak = 0;
    await new Promise<void>((resolve) => {
      const started = Date.now();
      const timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        peak = Math.max(peak, ...samples.map(Math.abs));
        if (peak > 0.005 || Date.now() - started > 35000) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
    source.disconnect();
    await context.close();
    return peak;
  });
  console.log(
    JSON.stringify({ provider: "livekit", nonSilentAudioPeak: peak }),
  );
  expect(
    peak,
    "Tutor track must contain audible audio samples",
  ).toBeGreaterThan(0.005);
  await page.getByRole("button", { name: "Voice off", exact: true }).click();
});
