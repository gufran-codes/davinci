import { test } from "node:test";
import assert from "node:assert/strict";
import { matchChoice, micSupported } from "../src/components/voice";
import { BrowserVoiceTransport } from "../src/components/voice/browser";
import { childTurnTiming } from "../src/components/voice/transport";
import type { ConversationPresentation } from "../src/lib/teaching/types";

test("mic gating stays silent where there is no recognizer", () => {
  assert.equal(micSupported(), false);
});

test("transcripts match the intended choice and nothing else", () => {
  assert.equal(
    matchChoice("It is probably raining", [
      "Maya ran outside",
      "It is probably raining",
      "It is bedtime",
    ]),
    "It is probably raining",
  );
  assert.equal(
    matchChoice("probably raining", [
      "Maya ran outside",
      "It is probably raining",
    ]),
    "It is probably raining",
  );
  assert.equal(matchChoice("2/4", ["1/2", "2/4"]), "2/4");
  assert.equal(matchChoice("", ["1/2"]), null);
  assert.equal(matchChoice("outside", ["Maya ran outside now"]), null);
  assert.equal(
    matchChoice("something entirely different", ["North", "South"]),
    null,
  );
});

test("child turn timing permits thinking pauses and barge-in records only heard speech", async () => {
  assert.ok(childTurnTiming.silenceMs >= 2000);
  assert.ok(childTurnTiming.thinkingMs > childTurnTiming.silenceMs);
  assert.ok(childTurnTiming.minInterruptionMs <= 200);

  class Recognition {
    continuous = false;
    interimResults = false;
    lang = "";
    onresult = null;
    onend = null;
    onerror = null;
    start() {}
    stop() {}
    abort() {}
  }
  class Utterance {
    rate = 1;
    voice: unknown;
    onstart?: () => void;
    onboundary?: (event: { charIndex: number }) => void;
    onend?: () => void;
    onerror?: () => void;
    constructor(public text: string) {}
  }
  let utterance: Utterance | undefined;
  const speechSynthesis = {
    speak: (value: Utterance) => {
      utterance = value;
    },
    cancel: () => {},
    getVoices: () => [],
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { webkitSpeechRecognition: Recognition, speechSynthesis },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
      },
    },
  });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
    configurable: true,
    value: Utterance,
  });

  const receipts: { spokenText: string; interrupted: boolean }[] = [];
  const transport = new BrowserVoiceTransport({
    onTranscript() {},
    onInterim() {},
    onStatus() {},
    onBoundary() {},
    onReceipt: (receipt) => receipts.push(receipt),
    onError() {},
    onInterrupt() {},
    onMetric() {},
  });
  await transport.connect();
  const presentation = {
    turnId: "turn",
    text: "Look at these two fraction bars before we compare them.",
    spokenText: "What do you notice about the two bars?",
    cues: [],
    intent: "show",
    canAnswer: true,
    listeningPrompt: "Your turn",
    paused: false,
    currentSkill: "Equivalent fractions",
    strategy: "visual_fraction_model",
    hintLevel: 0,
  } satisfies ConversationPresentation;
  transport.speak(presentation);
  utterance!.onstart?.();
  utterance!.onboundary?.({ charIndex: 18 });
  transport.interrupt();
  assert.deepEqual(receipts, [
    {
      turnId: "turn",
      spokenText: presentation.spokenText.slice(0, 18).trimEnd(),
      interrupted: true,
    },
  ]);
  transport.disconnect();
});
