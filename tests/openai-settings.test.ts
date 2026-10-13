import { test } from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { openAISettings } from "../src/server/openai-settings";
import {
  OpenAIConversationInterpreter,
  OpenAIConversationSpeaker,
} from "../src/server/understanding";

test("Sol uses role overrides, explicit low effort and enough reasoning/JSON headroom", (t) => {
  const names = [
    "OPENAI_MODEL",
    "OPENAI_INTERPRETER_MODEL",
    "OPENAI_TUTOR_MODEL",
  ];
  const before = names.map((name) => process.env[name]);
  t.after(() =>
    names.forEach((name, i) => {
      if (before[i] === undefined) delete process.env[name];
      else process.env[name] = before[i];
    }),
  );
  process.env.OPENAI_MODEL = "gpt-6.1-sol";
  delete process.env.OPENAI_INTERPRETER_MODEL;
  delete process.env.OPENAI_TUTOR_MODEL;
  for (const role of ["interpreter", "tutor", "lesson", "homework"] as const) {
    const config = openAISettings(role);
    assert.equal(config.request.model, "gpt-6.1-sol");
    assert.deepEqual(config.request.reasoning, { effort: "low" });
    assert.ok(config.request.max_output_tokens >= 2048);
    assert.ok(config.options.timeout >= 15000);
    assert.equal(config.options.maxRetries, 0);
  }
  assert.ok(
    openAISettings("interpreter").options.timeout +
      2 * openAISettings("tutor").options.timeout <
      60000,
  );
  process.env.OPENAI_INTERPRETER_MODEL = "gpt-4.1-mini";
  assert.equal(openAISettings("interpreter").request.reasoning, undefined);
  assert.equal(openAISettings("interpreter").options.timeout, 6000);
  assert.equal(openAISettings("tutor").request.model, "gpt-6.1-sol");
  process.env.OPENAI_INTERPRETER_MODEL = "gpt-6-luna";
  assert.deepEqual(openAISettings("interpreter").request.reasoning, {
    effort: "none",
  });
  assert.equal(openAISettings("interpreter").request.max_output_tokens, 2048);
  assert.equal(openAISettings("interpreter").options.timeout, 8000);
  assert.equal(openAISettings("tutor").request.model, "gpt-6.1-sol");
  process.env.OPENAI_TUTOR_MODEL = "gpt-4.1-mini";
  assert.equal(openAISettings("lesson").request.model, "gpt-4.1-mini");
  names.forEach((name) => delete process.env[name]);
  assert.equal(openAISettings("tutor").request.model, "gpt-4.1-mini");
});

test("actual interpreter and speaker requests send Sol settings and parse checked JSON", async (t) => {
  const names = [
    "OPENAI_MODEL",
    "OPENAI_INTERPRETER_MODEL",
    "OPENAI_TUTOR_MODEL",
  ];
  const before = names.map((name) => process.env[name]);
  t.after(() =>
    names.forEach((name, i) => {
      if (before[i] === undefined) delete process.env[name];
      else process.env[name] = before[i];
    }),
  );
  names.forEach((name) => (process.env[name] = "gpt-6.1-sol"));
  const meaning = {
    intent: "why",
    answer: null,
    term: null,
    confidence: null,
    reasoning: null,
    ambiguity: "clear",
    needsClarification: false,
    dialogue: {
      answerEvidence: null,
      request: null,
      gap: null,
      understood: null,
      preference: null,
      resolution: null,
    },
  };
  const speech = {
    speech: "Equal parts can be split without changing the total amount.",
    questionId: "q-test",
    strategyId: "visual_fraction_model",
    visualDirection: null,
    teachingNote: null,
  };
  let calls = 0;
  const client = new OpenAI({
    apiKey: "synthetic-only",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "gpt-6.1-sol");
      assert.deepEqual(body.reasoning, { effort: "low" });
      assert.equal(body.store, false);
      assert.equal(body.max_output_tokens, calls === 0 ? 4096 : 6144);
      assert.equal(body.text.format.type, "json_schema");
      const output = calls++ === 0 ? meaning : speech;
      return new Response(
        JSON.stringify({
          id: "resp-test",
          object: "response",
          status: "completed",
          output: [
            {
              type: "message",
              id: "msg-test",
              role: "assistant",
              status: "completed",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify(output),
                  annotations: [],
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  const interpreter = new OpenAIConversationInterpreter(client);
  const result = await interpreter.understand({
    transcript: "Why?",
    question: "A synthetic task",
    history: [],
    state: {} as Parameters<typeof interpreter.understand>[0]["state"],
  });
  assert.equal(result.intent, "why");
  const speaker = new OpenAIConversationSpeaker(client);
  type SpeakerInput = Parameters<typeof speaker.render>[0];
  const input: SpeakerInput = {
    draft: speech.speech,
    intent: "why",
    state: {} as SpeakerInput["state"],
    prohibitedAnswer: "3/6",
    studentUtterance: "Why?",
    speechProfile: {} as SpeakerInput["speechProfile"],
    responsePlan: {
      task: { questionId: "q-test" },
      strategyId: "visual_fraction_model",
    } as NonNullable<SpeakerInput["responsePlan"]>,
  };
  const rendered = await speaker.render(input);
  assert.deepEqual(rendered, {
    speech: speech.speech,
    visualDirection: null,
    teachingNote: null,
  });
  assert.equal(calls, 2);
});
