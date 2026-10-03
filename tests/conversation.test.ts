import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "primer-conversation-")),
  "test.sqlite",
);
const { register } = await import("../src/server/auth");
const { createChild, saveSession, learnerFor, sessionById } =
  await import("../src/server/repository");
const { startSession } = await import("../src/server/orchestrator");
const { converse, greeting, deliveredSpeech, conversationHistory } =
  await import("../src/server/conversation");
const { conversationTurn, conversationalGreeting } =
  await import("../src/server/understanding");
const { tutorSpeechProfile } = await import("../src/lib/teaching/speech");
const { buildTeachingState } = await import("../src/server/provider");
const { replaceTutorSpeech } = await import("../src/server/conversation");
const { seedChildren } = await import("../src/server/demo");
const { getQuestion, gradeQuestion } = await import("../src/lib/curriculum");
const { chooseDecision } = await import("../src/lib/learning");
const { memoryFor } = await import("../src/lib/teaching/adaptive");
const { understandLocally, spokenMath } =
  await import("../src/lib/conversation/intent");
const { all, one } = await import("../src/server/db");
const user = register(
  "Test Parent",
  `conversation-${randomUUID()}@test.local`,
  "safe-password-123",
);
test("opening speech keeps a greeting and does not replay or rewrite a saved turn", async () => {
  const child = createChild(user.id, {
    nickname: "Sam",
    age: 9,
    grade: 4,
    goal: "Build confidence",
    subjects: ["Math"],
  });
  const initial = startSession(child, "lesson", "equivalent_fractions");
  let renders = 0;
  const speaker = {
    async render(
      input: Parameters<
        import("../src/server/understanding").ConversationSpeaker["render"]
      >[0],
    ) {
      renders++;
      assert.equal(input.openingTurn, true);
      return initial.question.prompt;
    },
  };
  const first = await conversationalGreeting(child, initial.id, speaker);
  assert.match(first.conversation!.spokenText!, /^Hi, I’m Da Vinci\./);
  assert.equal(first.plan.targetConcept, "equivalent_fractions");
  const resumed = await conversationalGreeting(child, initial.id, speaker);
  assert.equal(resumed.conversation!.turnId, first.conversation!.turnId);
  assert.equal(
    resumed.conversation!.spokenText,
    first.conversation!.spokenText,
  );
  assert.equal(renders, 1);
});
function setup(target = "equivalent_fractions") {
  const child = createChild(user.id, {
    nickname: "Test",
    age: 9,
    grade: target === "adding_unlike" ? 5 : 4,
    goal: "Build confidence",
    subjects: ["Math", "English", "Science", "Social Studies"],
  });
  let s = startSession(child, "lesson", target);
  s.state = "TEACH";
  s.step = 3;
  s.question = getQuestion(target, 0);
  s.assistance = 1;
  s.decision = chooseDecision(learnerFor(child.id), target);
  s.decision.strategy = "symbolic_first";
  saveSession(s);
  s = greeting(child, s.id);
  function say(transcript: string) {
    s = converse(child, s.id, {
      requestId: randomUUID(),
      version: s.version,
      transcript,
      source: "text",
    });
    return s;
  }
  return {
    child,
    say,
    get session() {
      return sessionById(s.id);
    },
  };
}

test("children’s normal requests and spoken quantities are understood locally", () => {
  const q = getQuestion("generate_equivalent", 0);
  for (const [text, intent] of [
    ["Wait.", "wait"],
    ["Wait, why do we need one?", "why"],
    ["What does denominator mean?", "define"],
    ["I still don’t understand.", "confused"],
    ["Can you show me?", "show"],
    ["Can we try an easier one?", "easier"],
    ["I think I know.", "confidence"],
    ["Hey, can you hear me?", "rapport"],
    ["How are you?", "rapport"],
    ["What is your name?", "rapport"],
    ["Where do I start?", "hint"],
    ["Can you explain this?", "why"],
    ["You are stuck in the same loop.", "feedback"],
  ])
    assert.equal(understandLocally(text, q).intent, intent, text);
  assert.equal(spokenMath("I think it’s eight."), "8");
  assert.equal(spokenMath("two hundred and forty six"), "246");
  assert.equal(spokenMath("three quarters"), "3/4");
  assert.equal(
    understandLocally("I think it is 8 because I multiplied by two", q).answer,
    "8",
  );
});

test("spoken language exposes the selected teaching strategy without overriding it", async () => {
  const child = createChild(user.id, {
    nickname: "Voice",
    age: 9,
    grade: 4,
    goal: "Build confidence",
    subjects: ["Math"],
  });
  const started = startSession(child, "lesson", "equivalent_fractions");
  started.decision.strategy = "visual_fraction_model";
  started.decision.strategyId = "visual_fraction_model";
  saveSession(started);
  let received:
    | Parameters<
        import("../src/server/understanding").ConversationSpeaker["render"]
      >[0]
    | undefined;
  const rendered = await conversationalGreeting(child, started.id, {
    async render(input) {
      received = input;
      return input.draft;
    },
  });
  assert.ok(received);
  assert.equal(received.state.decision?.strategyId, rendered.decision.strategy);
  assert.match(received.speechProfile.strategyDirection, /visual|spatial/i);
  assert.equal(rendered.conversation?.verification?.passed, true);
  assert.doesNotMatch(
    rendered.conversation?.verification?.checks.join(" ") ?? "",
    /repeated_tutor_question/,
  );

  const visual = tutorSpeechProfile({
    strategy: "visual_fraction_model",
    subject: "Math",
    grade: 4,
    intent: "show",
    cognitiveLoad: "guided",
  });
  const socratic = tutorSpeechProfile({
    strategy: "guided_questioning",
    subject: "Math",
    grade: 4,
    intent: "why",
    cognitiveLoad: "focusing",
  });
  assert.notEqual(visual.strategyDirection, socratic.strategyDirection);
  assert.notEqual(visual.turnShape, socratic.turnShape);
});

test("review can return to teaching with a different visible approach", () => {
  const f = setup();
  let s = f.session;
  s.state = "SESSION_REVIEW";
  saveSession(s);
  s = f.say("Show me another way");
  assert.equal(s.state, "TEACH");
  assert.doesNotMatch(s.conversation!.text, /How did that feel/);
  assert.ok(s.conversation?.cues.some((cue) => cue.visuals.length));
  assert.match(s.conversation!.text, /change the approach|canvas/i);
});

test("natural rapport and learner feedback receive contextual educator responses", () => {
  const f = setup();
  let s = f.say("Hey, can you hear me?");
  assert.match(s.conversation!.text, /Yes, I can hear you/);
  assert.match(s.conversation!.text, new RegExp(s.question.prompt));
  const previous = s.decision.strategy;
  s = f.say("You are stuck in the same loop.");
  assert.notEqual(s.decision.strategy, previous);
  assert.match(s.conversation!.text, /repeating myself/);
});

test("subject-aware guard replaces the stale story fallback and remembers recent tutor questions", () => {
  const child = createChild(user.id, {
    nickname: "Scientist",
    age: 9,
    grade: 4,
    goal: "Understand science",
    subjects: ["Science"],
  });
  const s = startSession(child, "lesson", "g4_science_matter");
  s.state = "TEACH";
  s.question = getQuestion("g4_science_matter", 0);
  s.assistance = 1;
  s.decision.strategy = "story_context";
  s.decision.strategyId = "story_context";
  const memory = memoryFor(s);
  memory.checkpoint = {
    questionId: s.question.id,
    strategy: "story_context",
    prompt: "What part of that story matches the question?",
  };
  saveSession(s);
  const guarded = greeting(child, s.id);
  assert.doesNotMatch(
    guarded.conversation!.text,
    /part of (?:that|the) story/i,
  );
  assert.match(
    guarded.conversation!.spokenText!,
    /observe|observation|evidence|predict/i,
  );
  assert.ok(memoryFor(guarded).recentTutorQuestions.length > 0);
});

test("social turns feel conversational without being graded as attempts", () => {
  const f = setup();
  let s = f.say("How are you?");
  assert.match(s.conversation!.spokenText!, /ready to learn with you/i);
  assert.equal(s.attempts, 0);
  s = f.say("What is your name?");
  assert.match(s.conversation!.spokenText!, /Da Vinci/i);
  assert.equal(s.attempts, 0);
  assert.equal(s.teaching?.reasoningPath.at(-1)?.signal, "social");
  assert.ok((s.teaching?.wordShare.student ?? 0) > 0);
  assert.ok((s.teaching?.wordShare.tutor ?? 0) > 0);
});

test("the screen keeps the problem while later speech only says the next move", () => {
  const f = setup();
  const prompt = f.session.question.prompt;
  assert.match(f.session.conversation!.spokenText!, new RegExp(prompt));
  const s = f.say("Give me a hint");
  assert.match(s.conversation!.text, new RegExp(prompt));
  assert.doesNotMatch(s.conversation!.spokenText!, new RegExp(prompt));
  assert.notEqual(s.conversation!.spokenText, s.conversation!.text);
});

test("supported success is followed by a fresh independent check", () => {
  const f = setup();
  let s = f.say("Give me a hint");
  const supportedQuestion = s.question.id;
  s = f.say(s.question.answer);
  assert.equal(s.state, "INDEPENDENT_PRACTICE");
  assert.equal(s.assistance, 0);
  assert.equal(s.decision.strategy, "retrieval_practice");
  assert.equal(
    s.teaching?.activeIndependentCheck?.sourceQuestionId,
    supportedQuestion,
  );
  assert.notEqual(s.question.id, supportedQuestion);
  assert.equal(
    s.teaching?.assistanceLedger.find(
      (entry) => entry.questionId === supportedQuestion,
    )?.supportedSuccess,
    true,
  );
  s = f.say(s.question.answer);
  assert.equal(
    s.teaching?.assistanceLedger.find(
      (entry) => entry.questionId === supportedQuestion,
    )?.independentlyVerified,
    true,
  );
});

test("a different explanation uses a low-stakes checkpoint before grading again", () => {
  const f = setup();
  const original = f.session.question.prompt;
  let s = f.say("Show me another way");
  assert.ok(s.teaching?.checkpoint);
  assert.equal(s.attempts, 0);
  assert.ok(!s.conversation!.text.includes(original));
  assert.ok(
    s.conversation?.cues.some(
      (cue) =>
        cue.action === "question" &&
        cue.label === s.teaching?.checkpoint?.prompt,
    ),
  );
  s = f.say("The shaded parts still look like the same amount");
  assert.equal(s.teaching?.checkpoint, undefined);
  assert.equal(s.attempts, 0);
  assert.match(s.conversation!.text, /original question/i);
  assert.match(s.conversation!.text, new RegExp(original));
});

test("a correct original answer during a teaching checkpoint still earns credit", () => {
  const f = setup();
  let s = f.say("Teach me another way");
  assert.ok(s.teaching?.checkpoint);
  const answer = s.question.answer;
  s = f.say(answer);
  assert.equal(s.teaching?.checkpoint, undefined);
  assert.equal(s.correct, 1);
  assert.equal(s.attempts, 1);
});

test("an intermediate number or unrelated observation is not graded as a final answer", () => {
  const f = setup();
  let s = f.say("Show me another way");
  const before = JSON.stringify(learnerFor(f.child.id));
  const successes = s.teaching!.signals.supportSuccesses;
  const original = s.question.id;
  const intermediate = s.question.answer === "3" ? "2" : "3";
  s = f.say(intermediate);
  assert.equal(s.question.id, original);
  assert.equal(s.attempts, 0);
  assert.ok(s.teaching!.checkpoint);
  s = f.say("My shoes are green");
  assert.ok(s.teaching!.checkpoint);
  assert.equal(s.teaching!.signals.supportSuccesses, successes);
  assert.equal(JSON.stringify(learnerFor(f.child.id)), before);
  assert.doesNotMatch(s.conversation!.text, /useful observation|that.s right/i);
});

test("a contradictory visual observation is tested, not rewarded", () => {
  const f = setup();
  let s = f.say("Show me another way");
  const successes = s.teaching!.signals.supportSuccesses;
  const strategy = s.decision.strategy;
  s = f.say(
    "A bigger denominator means bigger fraction because there are more pieces",
  );
  assert.equal(s.attempts, 0);
  assert.equal(s.teaching!.signals.supportSuccesses, successes);
  assert.notEqual(s.decision.strategy, strategy);
  assert.doesNotMatch(s.conversation!.text, /useful observation|that.s right/i);
});

test("compact context identifies the current teaching prompt across reloads", async () => {
  const f = setup();
  f.say("Show me another way");
  const s = f.session;
  const context = buildTeachingState(s, learnerFor(f.child.id), f.child);
  assert.deepEqual(context.academicContext!.dialogueFocus, {
    kind: "observation",
    prompt: s.teaching!.checkpoint!.prompt,
  });
  let asked = "";
  await conversationTurn(
    f.child,
    s.id,
    {
      requestId: randomUUID(),
      version: s.version,
      transcript: "The shaded regions match because the amount stays equal",
      source: "text",
    },
    {
      async understand(input) {
        asked = input.question;
        assert.equal(input.choices, undefined);
        return { intent: "reasoning", reasoning: input.transcript };
      },
    },
    {
      async render(input) {
        return input.draft;
      },
    },
  );
  assert.equal(asked, s.teaching!.checkpoint!.prompt);
});

test("repairing a repeated follow-up keeps the relevant explanation", () => {
  const f = setup();
  const s = f.session;
  const repeated = "Which quantity are you trying to find?";
  memoryFor(s).recentTutorQuestions.push(repeated);
  saveSession(s);
  const result = replaceTutorSpeech(f.child, s.id, {
    turnId: s.conversation!.turnId,
    version: s.version,
    spokenText: `Equivalent fractions name the same amount using different-sized pieces. ${repeated}`,
  });
  assert.match(
    result.conversation!.spokenText!,
    /Equivalent fractions name the same amount/,
  );
  assert.ok(
    result.conversation!.verification!.checks.includes(
      "repeated_tutor_question",
    ),
  );
  assert.ok(!result.conversation!.spokenText!.includes(repeated));
});

test("guarded questions stay synchronized with the persisted checkpoint and canvas", () => {
  const f = setup();
  const s = f.say("Show me another way");
  const repeated = "Which quantity are you trying to find?";
  memoryFor(s).recentTutorQuestions.push(repeated);
  saveSession(s);
  const repaired = replaceTutorSpeech(f.child, s.id, {
    turnId: s.conversation!.turnId,
    version: s.version,
    spokenText: `The bars show shares of equal wholes. ${repeated}`,
  });
  const prompt = repaired.teaching!.checkpoint!.prompt;
  assert.ok(repaired.conversation!.spokenText!.endsWith(prompt));
  assert.ok(
    repaired.conversation!.cues.some(
      (cue) => cue.action === "question" && cue.label === prompt,
    ),
  );
  assert.deepEqual(
    buildTeachingState(f.session, learnerFor(f.child.id), f.child)
      .academicContext!.dialogueFocus,
    {
      kind: "observation",
      prompt,
    },
  );
});

test("mentioning a first step does not select the first multiple-choice answer", () => {
  const q = {
    ...getQuestion("equivalent_fractions", 0),
    choices: ["1/2", "1/3"],
  };
  assert.equal(understandLocally("What should I do first?", q).intent, "hint");
  assert.notEqual(
    understandLocally("Can you explain the second step?", q).intent,
    "answer",
  );
  assert.equal(
    understandLocally("I choose the second option", q).answer,
    "1/3",
  );
});

test("confusion changes representations, descends, then rebuilds upward", () => {
  const f = setup();
  let s = f.say("I don’t understand");
  assert.equal(s.decision.strategy, "visual_fraction_model");
  s = f.say("I still don’t understand");
  assert.equal(s.decision.strategy, "concrete_real_world_example");
  s = f.say("I still don’t get it");
  assert.equal(s.state, "REMEDIATION");
  assert.equal(s.teaching?.returnStack.length, 1);
  assert.notEqual(s.question.conceptId, "equivalent_fractions");
  const prerequisite = s.question.conceptId;
  s = f.say(s.question.answer);
  assert.equal(s.question.conceptId, "equivalent_fractions");
  assert.equal(s.teaching?.returnStack.length, 0);
  assert.equal(s.assistance, 1);
  assert.ok(learnerFor(f.child.id).states[prerequisite].assistedAttempts > 0);
});

test("several missing prerequisite levels are stored and recovered in order", () => {
  const f = setup("adding_unlike");
  let s = f.session;
  const skills = [s.question.conceptId];
  for (let depth = 0; depth < 3; depth++) {
    s = f.say("Can we try an easier one?");
    skills.push(s.question.conceptId);
  }
  assert.equal(new Set(skills).size, 4);
  assert.equal(s.teaching?.returnStack.length, 3);
  for (const id of skills.slice(0, -1).reverse()) {
    s = f.say(s.question.answer);
    assert.equal(s.question.conceptId, id);
  }
  assert.equal(s.teaching?.returnStack.length, 0);
});

test("seven hints track levels and move to a prerequisite without supplying target answer", () => {
  const f = setup("generate_equivalent");
  const q = f.session.question;
  for (let i = 1; i <= 6; i++) {
    const s = f.say("Give me a hint");
    assert.equal(s.teaching?.hintLevel, i);
    assert.equal(s.attempts, 0);
    assert.ok(!s.conversation?.text.includes(`answer is ${q.answer}`));
  }
  const s = f.say("Give me a hint");
  assert.equal(s.teaching?.signals.hintCount, 7);
  assert.equal(s.teaching?.returnStack.length, 1);
  assert.notEqual(s.question.conceptId, q.conceptId);
});

test("wait and clarification do not grade an answer or award mastery", () => {
  const f = setup();
  let s = f.say("Wait");
  assert.equal(s.conversation?.paused, true);
  assert.equal(s.attempts, 0);
  s = f.say("What does denominator mean?");
  assert.match(s.conversation!.text, /equal parts/);
  assert.equal(s.attempts, 0);
  s = f.say("Continue");
  assert.equal(s.conversation?.paused, false);
  assert.deepEqual(learnerFor(f.child.id).states, {});
});

test("interrupted receipts store only a delivered prefix, never the unheard tail", () => {
  const f = setup(),
    s = f.session,
    p = s.conversation!;
  const generated = p.spokenText ?? p.text;
  const prefix = generated.split(" ").slice(0, 6).join(" ");
  deliveredSpeech(f.child, s.id, {
    turnId: p.turnId,
    spokenText: prefix,
    interrupted: true,
  });
  const history = conversationHistory(f.child.id, s.id);
  assert.equal(history.at(-1)?.spoken_tutor_text, prefix);
  assert.equal(history.at(-1)?.interrupted, 1);
  assert.ok(!JSON.stringify(history).includes(generated));
  assert.throws(
    () =>
      deliveredSpeech(f.child, s.id, {
        turnId: p.turnId,
        spokenText: "invented speech",
        interrupted: true,
      }),
    /prefix/,
  );
  const other = setup();
  assert.throws(
    () =>
      deliveredSpeech(other.child, s.id, {
        turnId: p.turnId,
        spokenText: prefix,
        interrupted: true,
      }),
    /not found/,
  );
});

test("request replay is idempotent and stale competing turns cannot mutate evidence", () => {
  const f = setup(),
    s = f.session,
    input = {
      requestId: randomUUID(),
      version: s.version,
      transcript: s.question.answer,
      source: "text" as const,
    };
  const first = converse(f.child, s.id, input),
    again = converse(f.child, s.id, input);
  assert.equal(first.version, again.version);
  assert.equal(first.attempts, again.attempts);
  assert.throws(
    () => converse(f.child, s.id, { ...input, requestId: randomUUID() }),
    /lesson changed/,
  );
  assert.equal(
    all(
      "SELECT * FROM conversation_turns WHERE session_id=? AND request_id=?",
      s.id,
      input.requestId,
    ).length,
    1,
  );
});

test("reasoning raises confidence once while leaving mastery score untouched", () => {
  const f = setup(),
    before =
      learnerFor(f.child.id).states.equivalent_fractions?.masteryScore ?? 0.25;
  f.say("They cover the same amount because we multiply both counts by two");
  const first = learnerFor(f.child.id).states.equivalent_fractions;
  assert.equal(first.masteryScore, before);
  assert.equal(first.masteryConfidence, 0.06);
  f.say("They cover the same amount because we multiply both counts by two");
  assert.equal(
    learnerFor(f.child.id).states.equivalent_fractions.masteryConfidence,
    0.06,
  );
});

test("the three demo learners receive different policy, hint and canvas paths", () => {
  const children = seedChildren(user.id);
  const sessions = children.map((c) =>
    greeting(c, startSession(c, "lesson", "equivalent_fractions").id),
  );
  assert.equal(sessions[0].decision.strategy, "visual_fraction_model");
  assert.equal(sessions[1].decision.strategy, "symbolic_first");
  assert.ok(
    sessions[1].decision.strengthToLeverage?.includes("multiplication"),
  );
  assert.equal(sessions[2].question.conceptId, "compare_same_numerator");
  assert.equal(
    sessions[2].decision.misconceptionToTest,
    "denominator_magnitude",
  );
  const turns = sessions.map((s, i) =>
    converse(children[i], s.id, {
      requestId: randomUUID(),
      version: s.version,
      transcript: "Can you show me?",
      source: "text",
    }),
  );
  assert.notEqual(turns[0].conversation!.text, turns[2].conversation!.text);
  assert.notDeepEqual(turns[0].conversation!.cues, turns[2].conversation!.cues);
});

test("independent assessment removes scaffolds but preserves task data", () => {
  const f = setup("g4_math_data");
  const s = f.session;
  s.state = "INDEPENDENT_PRACTICE";
  s.assistance = 0;
  saveSession(s);
  const next = converse(f.child, s.id, {
    requestId: randomUUID(),
    version: s.version,
    transcript: "Continue",
    source: "text",
  });
  assert.ok(
    next.conversation!.cues.some((c) =>
      c.visuals.some((v) => v.type === "table"),
    ),
  );
});

test("writing uses relevant rubric evidence and does not rewrite the student’s work", () => {
  const q = getQuestion("g4_english_composition", 0);
  assert.equal(
    gradeQuestion(
      q,
      "A class garden helps us learn because we observe how plants grow.",
    ),
    true,
  );
  assert.equal(
    gradeQuestion(q, "I like pizza because the story was funny."),
    false,
  );
  const f = setup(q.conceptId);
  const s = f.say(
    "A class garden helps us learn because we observe how plants grow.",
  );
  assert.equal(s.correct, 1);
});

test("semantic adapter receives only delivered tutor context and cannot bypass policy", async () => {
  const f = setup(),
    s = f.session,
    p = s.conversation!;
  let called = false;
  const result = await conversationTurn(
    f.child,
    s.id,
    {
      requestId: randomUUID(),
      version: s.version,
      transcript: "Could you unpack that a little more?",
      source: "voice",
      heard: {
        turnId: p.turnId,
        spokenText: (p.spokenText ?? p.text).slice(0, 12).trimEnd(),
        interrupted: true,
      },
    },
    {
      understand: async (input) => {
        called = true;
        assert.equal(
          input.history.at(-1)?.spoken_tutor_text,
          (p.spokenText ?? p.text).slice(0, 12).trimEnd(),
        );
        assert.equal(input.state.targetSkill, s.question.conceptId);
        return { intent: "confused" };
      },
    },
  );
  assert.equal(called, true);
  assert.equal(result.decision.strategy, "visual_fraction_model");
  assert.equal(result.attempts, 0);
});

test("optional natural speech rendering stays behind the teaching policy verifier", async () => {
  const f = setup(),
    s = f.session;
  let receivedDraft = "";
  const result = await conversationTurn(
    f.child,
    s.id,
    {
      requestId: randomUUID(),
      version: s.version,
      transcript: "How are you?",
      source: "voice",
    },
    undefined,
    {
      render: async (input) => {
        receivedDraft = input.draft;
        assert.equal("transcript" in input, false);
        assert.equal(input.state.targetSkill, s.question.conceptId);
        return `The answer is ${s.question.answer}.`;
      },
    },
  );
  assert.ok(receivedDraft.length > 0);
  assert.doesNotMatch(
    result.conversation!.spokenText!,
    new RegExp(`the answer is ${s.question.answer}`, "i"),
  );
  assert.equal(result.conversation!.verification?.passed, false);
  assert.ok(result.conversation!.verification?.checks.includes("answer_leak"));
  const generated = one<{ generated_tutor_text: string }>(
    "SELECT generated_tutor_text FROM conversation_turns WHERE id=?",
    result.conversation!.turnId,
  );
  assert.equal(
    generated?.generated_tutor_text,
    result.conversation!.spokenText,
  );
});

test("finishing and returning persist real teaching outcomes", () => {
  const f = setup();
  f.say("I need a hint");
  let s = f.say(f.session.question.answer);
  s = f.say("Finish for today");
  assert.equal(s.state, "COMPLETE");
  assert.equal(s.reflection, undefined);
  assert.ok(s.completedAt);
  assert.ok(s.summary);
  const l = learnerFor(f.child.id);
  assert.ok(l.strategies.some((e) => e.successfulOutcomes > 0));
  assert.ok(l.states.equivalent_fractions.assistedAttempts > 0);
});

test("natural end-session commands finalize once without interpreting or generating more teaching", async () => {
  for (const phrase of [
    "Finish the session.",
    "I’m done.",
    "End the lesson.",
    "Can we stop now?",
    "Let's wrap up",
    "I want to stop for today",
    "Goodbye.",
  ]) {
    const f = setup();
    const before = JSON.stringify(learnerFor(f.child.id).states);
    assert.equal(
      understandLocally(phrase, f.session.question).intent,
      "end_session",
    );
    const input = {
      requestId: randomUUID(),
      version: f.session.version,
      transcript: phrase,
      source: "voice" as const,
    };
    let calls = 0;
    const next = await conversationTurn(
      f.child,
      f.session.id,
      input,
      {
        async understand() {
          calls++;
          return { intent: "answer", answer: "invented" };
        },
      },
      {
        async render() {
          calls++;
          return "Keep teaching.";
        },
      },
    );
    assert.equal(calls, 0);
    assert.equal(next.state, "COMPLETE");
    assert.ok(next.summary);
    assert.ok(next.completedAt);
    assert.equal(next.reflection, undefined);
    assert.equal(next.conversation!.intent, "end_session");
    assert.equal(next.conversation!.canAnswer, false);
    assert.equal(next.conversation!.canvasActions?.length, 0);
    assert.equal(JSON.stringify(learnerFor(f.child.id).states), before);
    const duplicate = await conversationTurn(f.child, next.id, {
      ...input,
      requestId: randomUUID(),
    });
    assert.equal(duplicate.version, next.version);
    assert.equal(duplicate.completedAt, next.completedAt);
    assert.equal(
      all<{ type: string }>(
        "SELECT type FROM session_events WHERE session_id=? AND type='session_completed'",
        next.id,
      ).length,
      1,
    );
  }
  const f = setup();
  for (const phrase of [
    "Stop",
    "I'm done with the first step",
    "Don't end the lesson",
    "I finished my answer",
    "What happened at the end of the story?",
  ]) {
    assert.notEqual(
      understandLocally(phrase, f.session.question).intent,
      "end_session",
    );
  }
});

test("ending wins a race with a delayed answer and never resurrects the lesson", async () => {
  const f = setup("g4_science_matter");
  const s = f.session;
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const delayed = conversationTurn(
    f.child,
    s.id,
    {
      requestId: randomUUID(),
      version: s.version,
      transcript: "Perhaps it has air",
      source: "voice",
    },
    {
      async understand() {
        await waiting;
        return { intent: "answer", answer: s.question.answer };
      },
    },
  );
  const ended = f.say("I'm done");
  release();
  const result = await delayed;
  assert.equal(result.state, "COMPLETE");
  assert.equal(result.version, ended.version);
  assert.equal(result.attempts, ended.attempts);
  assert.equal(result.completedAt, ended.completedAt);
});

test("review and confidence do not leak generic reflection questions into academic turns", () => {
  for (const skill of [
    "equivalent_fractions",
    "g4_science_matter",
    "g4_social_studies_sources",
  ]) {
    const f = setup(skill);
    const s = f.session;
    s.state = "SESSION_REVIEW";
    s.feedback = null;
    saveSession(s);
    const next = f.say(`My answer is ${s.question.answer}`);
    assert.equal(next.attempts, s.attempts + 1);
    assert.doesNotMatch(
      next.conversation!.spokenText!,
      /Tell me how it felt|Which fact, label, or event/i,
    );
    assert.equal(next.conversation!.assessment?.answer, s.question.answer);
    assert.equal(next.conversation!.assessment?.correct, true);
    const supported = f.say("Still tricky");
    assert.notEqual(supported.state, "COMPLETE");
    assert.doesNotMatch(
      supported.conversation!.spokenText!,
      /Tell me how it felt|Which fact, label, or event/i,
    );
  }
});

test("reflection can finish a natural review without an academic follow-up", () => {
  const f = setup();
  const s = f.session;
  s.state = "SESSION_REVIEW";
  saveSession(s);
  const next = f.say("Still tricky");
  assert.equal(next.state, "COMPLETE");
  assert.equal(next.reflection, "Still tricky");
  assert.doesNotMatch(
    next.conversation!.spokenText!,
    /Which fact|What quantity|helps you decide/i,
  );
});
