import { test } from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import {
  conversationServiceStatus,
  noteOpenAIFailure,
  noteOpenAISuccess,
  openAIAvailable,
} from "../src/server/openai-health";

test("provider failures remain visible until recovery and never expose credentials", () => {
  const previous = process.env.OPENAI_API_KEY;
  const warn = console.warn;
  console.warn = () => {};
  try {
    delete process.env.OPENAI_API_KEY;
    noteOpenAISuccess();
    assert.deepEqual(conversationServiceStatus(), {
      mode: "limited",
      reason: "not_configured",
    });
    process.env.OPENAI_API_KEY = "synthetic-test-key";
    assert.equal(openAIAvailable(), true);
    noteOpenAIFailure({ status: 401, code: "invalid_api_key" }, "test");
    assert.equal(openAIAvailable(), false);
    assert.deepEqual(conversationServiceStatus(), {
      mode: "limited",
      reason: "credentials",
    });
    noteOpenAISuccess();
    assert.equal(openAIAvailable(), true);
    assert.deepEqual(conversationServiceStatus(), {
      mode: "available",
      reason: null,
    });
  } finally {
    noteOpenAISuccess();
    console.warn = warn;
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test("timeouts are distinct from bad credentials and a changed configuration clears stale failure state", (t) => {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_TUTOR_MODEL;
  const now = Date.now();
  t.mock.method(console, "warn", () => {});
  t.after(() => {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
    if (model === undefined) delete process.env.OPENAI_TUTOR_MODEL;
    else process.env.OPENAI_TUTOR_MODEL = model;
    noteOpenAISuccess();
  });
  process.env.OPENAI_API_KEY = "synthetic-key-one";
  noteOpenAIFailure(new OpenAI.APIConnectionTimeoutError(), "test");
  assert.deepEqual(conversationServiceStatus(), {
    mode: "limited",
    reason: "timeout",
  });
  t.mock.method(Date, "now", () => now + 60_000);
  assert.equal(openAIAvailable(), true);
  assert.equal(conversationServiceStatus().mode, "limited");
  noteOpenAISuccess();
  assert.equal(conversationServiceStatus().mode, "available");
  noteOpenAIFailure({ status: 401 }, "test");
  process.env.OPENAI_API_KEY = "synthetic-key-two";
  assert.equal(openAIAvailable(), true);
  assert.equal(conversationServiceStatus().mode, "available");
  noteOpenAIFailure({ status: 404, code: "model_not_found" }, "test");
  assert.equal(conversationServiceStatus().reason, "configuration");
  process.env.OPENAI_TUTOR_MODEL = "changed-model";
  assert.equal(openAIAvailable(), true);
});
