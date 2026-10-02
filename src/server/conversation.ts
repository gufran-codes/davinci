import {
  sessionIntelligence,
  startDiagnosticProbe,
  finishDiagnosticProbe,
} from "../lib/teaching/session-intelligence";
import { randomUUID } from "node:crypto";
import { conceptById, getQuestion, gradeQuestion } from "../lib/curriculum";
import {
  understandLocally,
  spokenMath,
  UnderstoodTurn,
} from "../lib/conversation/intent";
import {
  applySupport,
  memoryFor,
  spokenTeaching,
} from "../lib/teaching/adaptive";
import {
  assessReasoning,
  materialFor,
  rubricFor,
} from "../lib/teaching/content";
import { answerAccess, questionKey } from "./learning-controls";
import { chooseDecision, initialState } from "../lib/learning";
import type { Child, LearningSession } from "../lib/types";
import type {
  ConversationIntent,
  ConversationPresentation,
} from "../lib/teaching/types";
import { advanceSession } from "./orchestrator";
import {
  event,
  HttpError,
  learnerFor,
  now,
  saveLearner,
  saveSession,
  sessionById,
} from "./repository";
import { all, one, run, transaction } from "./db";
import {
  guidedSteps,
  guidedActions,
  requestsGuidedSteps,
} from "../lib/teaching/guided-steps";
import { beginGuidedPractice, respondToGuidedStep } from "./guided-teaching";
export interface ConversationInput {
  requestId: string;
  version: number;
  transcript: string;
  source: "voice" | "text" | "canvas";
  heard?: { turnId: string; spokenText: string; interrupted: boolean };
}
const wordCount = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;
function focusingQuestion(s: LearningSession) {
  const m = memoryFor(s);
  if (m.guidedPractice?.questionId === s.question.id) {
    const step = guidedSteps(s.question)[m.guidedPractice.stepIndex];
    if (step) return step.prompt;
  }
  if (m.checkpoint) return m.checkpoint.prompt;
  const material = materialFor(
    s.question,
    getQuestion(s.question.conceptId, 91),
  );
  if (s.question.subject === "Math") return material.guidingQuestion;
  if (s.question.subject === "English")
    return "Which words or details support your idea?";
  if (s.question.subject === "Science")
    return "What did you observe, and what changed?";
  return "Which piece of evidence helps you decide?";
}
function freshFocusingQuestion(s: LearningSession) {
  const memory = memoryFor(s);
  const bySubject: Record<string, string[]> = {
    Math: [
      focusingQuestion(s),
      "Which quantity do you know, and which one are you trying to find?",
      "What operation or relationship fits what the question is asking?",
    ],
    English: [
      "Which exact words or details support your idea?",
      "What in the text made you think that?",
      "How would you explain your idea using one detail from the text?",
    ],
    Science: [
      "What did you observe, and what changed?",
      "Which evidence supports your explanation?",
      "What would you predict from the evidence in this question?",
    ],
    "Social Studies": [
      "Which fact, label, or event helps you decide?",
      "What evidence in the source supports your idea?",
      "How does the place, time, or point of view affect your answer?",
    ],
  };
  const candidates = bySubject[s.question.subject] ?? [focusingQuestion(s)];
  return (
    candidates.find(
      (candidate) =>
        !memory.recentTutorQuestions.some(
          (recent) => similarity(recent, candidate) > 0.72,
        ),
    ) ?? candidates[memory.responseOrdinal % candidates.length]
  );
}
function questionsIn(text: string) {
  return (text.match(/[^.!?]*\?/g) ?? [])
    .map((question) => question.trim())
    .filter(Boolean);
}
function choiceDirection(s: LearningSession) {
  const choices = [
    "Take a careful look at the choices before you decide.",
    "Compare the choices, then pick the one that best fits your reasoning.",
    "The choices are in your answer space. Check each one against the question.",
  ];
  return choices[memoryFor(s).responseOrdinal % choices.length];
}
function similarity(a: string, b: string) {
  const tokens = (value: string) =>
      new Set(
        value
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, "")
          .split(/\s+/)
          .filter((word) => word.length > 2),
      ),
    left = tokens(a),
    right = tokens(b);
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((word) => right.has(word)).length;
  return overlap / new Set([...left, ...right]).size;
}
function teachingMode(s: LearningSession) {
  const m = memoryFor(s);
  if (m.activeIndependentCheck)
    return {
      move: "independent_retest",
      load: "independent" as const,
    };
  if (s.state === "REMEDIATION")
    return { move: "prerequisite_rebuild", load: "explicit" as const };
  if (m.checkpoint)
    return { move: "representation_check", load: "focusing" as const };
  if (m.hintLevel >= 4)
    return { move: "worked_scaffold", load: "explicit" as const };
  if (m.hintLevel >= 2)
    return { move: "progressive_hint", load: "guided" as const };
  if (s.assistance > 0)
    return { move: "focusing_question", load: "focusing" as const };
  return { move: "independent_attempt", load: "independent" as const };
}
function verifyTutorTurn(s: LearningSession, p: ConversationPresentation) {
  let speech = (p.spokenText ?? p.text).replace(/\s+/g, " ").trim();
  const checks: string[] = [];
  let revised = false;
  if (wordCount(speech) > 65) checks.push("too_many_tutor_words");
  if ((speech.match(/\?/g) ?? []).length > 2) checks.push("too_many_questions");
  if (
    /\b(?:right\?|isn['’]t it\?|just tell me|all you need to do)\b/i.test(
      speech,
    )
  )
    checks.push("funneling_language");
  const answer = s.question.answer.trim();
  if (
    p.intent !== "reveal" &&
    answer.length > 0 &&
    new RegExp(
      `\\b(?:the answer|the result) (?:is|would be) ${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i",
    ).test(speech)
  )
    checks.push("answer_leak");
  const previous = s.conversation?.spokenText ?? s.conversation?.text ?? "";
  const returningFromSteps =
    p.teachingMove === "return_to_task" ||
    (s.conversation?.teachingMove === "guided_step" &&
      !memoryFor(s).guidedPractice);
  if (
    p.intent !== "repeat" &&
    !memoryFor(s).guidedPractice &&
    !returningFromSteps &&
    !["SESSION_REVIEW", "COMPLETE"].includes(s.state) &&
    similarity(previous, speech) > 0.82
  )
    checks.push("repeated_tutor_turn");
  const questions = questionsIn(speech);
  if (
    p.intent !== "repeat" &&
    !memoryFor(s).guidedPractice &&
    !returningFromSteps &&
    questions.some((question) =>
      memoryFor(s).recentTutorQuestions.some(
        (recent) => similarity(recent, question) > 0.78,
      ),
    )
  )
    checks.push("repeated_tutor_question");
  if (
    s.question.subject !== "English" &&
    questions.some((question) => /\b(?:story|text|passage)\b/i.test(question))
  )
    checks.push("subject_irrelevant_question");
  if (
    memoryFor(s).guidedPractice &&
    !["wait", "rapport", "reveal", "define", "confidence"].includes(p.intent) &&
    questions.at(-1) !== focusingQuestion(s)
  )
    checks.push("guided_question_changed");
  if (checks.length) {
    // A repeated question should not erase a useful explanation or acknowledgement.
    // Unsafe, overlong, or wholly repeated turns still use the bounded fallback.
    const questionOnly = checks.every((check) =>
      [
        "repeated_tutor_question",
        "subject_irrelevant_question",
        "too_many_questions",
      ].includes(check),
    );
    const explanation = questionOnly
      ? speech
          .replace(/[^.!?]*\?/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";
    const nextQuestion = memoryFor(s).guidedPractice
      ? focusingQuestion(s)
      : freshFocusingQuestion(s);
    speech =
      explanation && wordCount(`${explanation} ${nextQuestion}`) <= 65
        ? `${explanation} ${nextQuestion}`
        : `Let’s pause on one idea. ${nextQuestion}`;
    revised = true;
  } else if (
    p.canAnswer &&
    !["rapport", "resume", "repeat", "wait"].includes(p.intent) &&
    !speech.includes("?")
  ) {
    speech = `${speech} ${freshFocusingQuestion(s)}`;
    revised = true;
  }
  const finalQuestions = questionsIn(speech);
  if (finalQuestions.length) {
    const memory = memoryFor(s);
    memory.recentTutorQuestions = [
      ...memory.recentTutorQuestions,
      ...finalQuestions,
    ].slice(-12);
    if (memory.checkpoint?.questionId === s.question.id) {
      // The student, interpreter, and canvas must all refer to the question
      // actually emitted after the guard (and optional wording renderer).
      memory.checkpoint.prompt = finalQuestions[finalQuestions.length - 1];
      p.cues = p.cues.map((cue) =>
        cue.action === "question"
          ? { ...cue, label: memory.checkpoint!.prompt }
          : cue,
      );
    }
  }
  if (revised) p.text = speech;
  p.spokenText = speech;
  const spokenWords = wordCount(speech);
  p.cues = p.cues.map((cue) => ({
    ...cue,
    atWord:
      cue.action === "show"
        ? 0
        : Math.max(0, Math.min(cue.atWord, spokenWords - 1)),
  }));
  p.verification = {
    passed: checks.length === 0,
    revised,
    checks: checks.length
      ? checks
      : ["bounded", "non_revealing", "student_turn"],
  };
}
export function replaceTutorSpeech(
  child: Child,
  id: string,
  input: {
    turnId: string;
    version: number;
    spokenText: string;
  },
) {
  return transaction(() => {
    const s = sessionById(id);
    if (s.childId !== child.id) throw new HttpError(404, "Lesson not found.");
    if (s.version !== input.version || s.conversation?.turnId !== input.turnId)
      return s;
    const previousWords = wordCount(
      s.conversation.spokenText ?? s.conversation.text,
    );
    const p: ConversationPresentation = {
      ...s.conversation,
      spokenText: input.spokenText,
    };
    // The deterministic policy already checked repetition against the prior
    // turn. Re-check every other invariant after optional language rendering.
    const prior = s.conversation;
    const memory = memoryFor(s);
    // The deterministic draft was verified before the optional LLM renderer.
    // Remove only that draft's newly recorded questions before verifying the
    // final wording, otherwise preserving the required question is falsely
    // classified as repetition and replaced with a generic fallback.
    for (const question of questionsIn(prior.spokenText ?? prior.text)) {
      const index = memory.recentTutorQuestions.findLastIndex(
        (recent) => similarity(recent, question) > 0.98,
      );
      if (index >= 0) memory.recentTutorQuestions.splice(index, 1);
    }
    s.conversation = undefined;
    verifyTutorTurn(s, p);
    s.conversation = p;
    memory.wordShare.tutor += wordCount(p.spokenText ?? p.text) - previousWords;
    saveSession(s);
    const row = one<{ data: string }>(
      "SELECT data FROM conversation_turns WHERE id=? AND session_id=? AND child_id=?",
      input.turnId,
      id,
      child.id,
    );
    if (!row) {
      s.conversation = prior;
      throw new HttpError(404, "Conversation turn not found.");
    }
    const data = JSON.parse(row.data) as Record<string, unknown>;
    data.presentation = p;
    run(
      "UPDATE conversation_turns SET generated_tutor_text=?,data=? WHERE id=? AND session_id=? AND child_id=?",
      p.spokenText ?? p.text,
      JSON.stringify(data),
      input.turnId,
      id,
      child.id,
    );
    event(s, "tutor_speech_rendered", {
      turnId: input.turnId,
      verification: p.verification,
    });
    return s;
  });
}
export function deliveredSpeech(
  child: Child,
  sessionId: string,
  receipt: { turnId: string; spokenText: string; interrupted: boolean },
) {
  const row = one<{ generated_tutor_text: string; spoken_tutor_text: string }>(
    "SELECT generated_tutor_text,spoken_tutor_text FROM conversation_turns WHERE id=? AND session_id=? AND child_id=?",
    receipt.turnId,
    sessionId,
    child.id,
  );
  if (!row) throw new HttpError(404, "Speech turn not found.");
  const spoken = receipt.spokenText.trim();
  if (!row.generated_tutor_text.startsWith(spoken))
    throw new HttpError(
      400,
      "Speech receipt must be a prefix of the generated turn.",
    );
  if (spoken.length < row.spoken_tutor_text.length) return;
  run(
    "UPDATE conversation_turns SET spoken_tutor_text=?,interrupted=? WHERE id=?",
    spoken,
    receipt.interrupted ? 1 : 0,
    receipt.turnId,
  );
}
function presentation(
  s: LearningSession,
  intent: ConversationIntent,
  prefix = "",
): ConversationPresentation {
  const m = memoryFor(s);
  if (m.checkpoint && m.checkpoint.questionId !== s.question.id)
    m.checkpoint = undefined;
  const t = spokenTeaching(s);
  let text = prefix ? `${prefix} ${t.message}` : t.message;
  let spokenText = text;
  const offset = prefix ? prefix.split(/\s+/).length : 0;
  let cues = t.cues.map((c) => ({ ...c, atWord: c.atWord + offset }));
  let canvasActions = t.actions.map((action) => ({
    ...action,
    atWord: action.atWord + offset,
  }));
  const introduced = m.introducedPrompts.includes(s.question.prompt);
  if (s.state === "SESSION_REVIEW") {
    text =
      "How did that feel: a little clearer, ready for more, or still tricky?";
    cues = [
      {
        id: "review",
        atWord: 0,
        action: "show",
        visuals: [
          {
            type: "diagram",
            title: "How did today’s learning feel?",
            nodes: ["A little clearer", "Ready for more", "Still tricky"],
            links: [
              [0, 1],
              [1, 2],
            ],
          },
        ],
        label: "Choose what feels true",
      },
      {
        id: "review-question",
        atWord: 0,
        action: "question",
        visuals: [],
        label: "A little clearer, ready for more, or still tricky?",
      },
    ];
    canvasActions = [];
  } else if (s.state === "COMPLETE") {
    text =
      s.kind === "homework"
        ? "You’ve practiced the idea. Now try the original homework problem yourself."
        : "That’s enough for today. Your next lesson will build on what we learned.";
    cues = [];
    canvasActions = [];
  } else if (m.checkpoint) {
    if (!text.trim().endsWith("?")) text += ` ${m.checkpoint.prompt}`;
  } else
    text += ` ${
      s.question.choices?.length && !introduced ? `${choiceDirection(s)} ` : ""
    }${s.question.prompt}`;
  if (!["SESSION_REVIEW", "COMPLETE"].includes(s.state)) {
    if (m.checkpoint) spokenText = text;
    else if (!introduced) spokenText = text;
    else if (t.message.trim().endsWith("?"))
      spokenText = prefix ? `${prefix} ${t.message}` : t.message;
    else
      spokenText = `${prefix ? `${prefix} ` : ""}${t.message} ${focusingQuestion(s)}`;
    if (!introduced)
      m.introducedPrompts = [...m.introducedPrompts, s.question.prompt].slice(
        -30,
      );
  } else spokenText = text;
  const mode = teachingMode(s);
  m.goal.nextMove =
    mode.load === "independent"
      ? "Listen without adding help, then assess the learner’s reasoning."
      : mode.load === "focusing"
        ? "Focus attention while leaving the reasoning path to the learner."
        : mode.load === "guided"
          ? "Offer one scaffold, then return the next step to the learner."
          : "Rebuild the missing idea, then schedule an independent check.";
  return {
    turnId: randomUUID(),
    text,
    spokenText,
    cues,
    canvasActions,
    intent,
    canAnswer: !m.paused && s.state !== "COMPLETE",
    listeningPrompt: m.paused
      ? "Say “continue” when you’re ready."
      : s.state === "SESSION_REVIEW"
        ? "Say “a little clearer,” “ready for more,” or “still tricky.”"
        : "Answer naturally, ask why, request a hint, or ask for another way.",
    paused: m.paused,
    currentSkill: conceptById[s.question.conceptId].name,
    returningTo: m.returnStack.length
      ? conceptById[m.returnStack[0].skillId].name
      : undefined,
    strategy: s.decision.strategy,
    hintLevel: m.hintLevel,
    teachingMove: mode.move,
    cognitiveLoad: mode.load,
  };
}
function saveTurn(
  child: Child,
  s: LearningSession,
  requestId: string,
  transcript: string,
  p: ConversationPresentation,
  source: string,
) {
  s.conversation = p;
  const memory = memoryFor(s);
  const brain = sessionIntelligence(s)!;
  const explanation = (p.spokenText ?? p.text).slice(0, 600);
  if (
    !brain.explanations.some(
      (e) => e.questionId === s.question.id && e.text === explanation,
    )
  )
    brain.explanations = [
      ...brain.explanations,
      { questionId: s.question.id, strategy: p.strategy, text: explanation },
    ].slice(-12);
  brain.canvas = {
    labels: p.cues.map((c) => c.label).slice(-8),
    actions: (p.canvasActions ?? []).map((a) => a.type).slice(-12),
  };
  memory.lastTurnId = p.turnId;
  memory.wordShare.tutor += wordCount(p.spokenText ?? p.text);
  saveSession(s);
  run(
    "INSERT INTO conversation_turns(id,session_id,child_id,request_id,student_transcript,intent,generated_tutor_text,data,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
    p.turnId,
    s.id,
    child.id,
    requestId,
    transcript,
    p.intent,
    p.spokenText ?? p.text,
    JSON.stringify({
      presentation: p,
      version: s.version,
      source,
      questionId: s.question.id,
      decision: s.decision,
    }),
    now(),
  );
  event(s, "conversation_turn", {
    turnId: p.turnId,
    intent: p.intent,
    strategy: p.strategy,
    source,
    teachingMove: p.teachingMove,
    cognitiveLoad: p.cognitiveLoad,
    verification: p.verification,
    studentWords: wordCount(transcript),
    tutorWords: wordCount(p.spokenText ?? p.text),
  });
}
export function greeting(child: Child, id: string) {
  return transaction(() => {
    const s = sessionById(id);
    if (s.childId !== child.id) throw new HttpError(404, "Lesson not found.");
    if (s.conversation) return s;
    const m = memoryFor(s);
    if (
      s.decision.misconceptionToTest === "denominator_magnitude" &&
      s.plan.targetConcept === "equivalent_fractions"
    ) {
      m.returnStack.push({
        skillId: s.plan.targetConcept,
        question: getQuestion(s.plan.targetConcept, 0),
        state: "TEACH",
        step: 3,
        strategy: s.decision.strategy,
      });
      s.question = getQuestion("compare_same_numerator", 0);
      s.state = "PROBE";
      s.assistance = 1;
      s.decision.targetConceptId = s.question.conceptId;
      s.decision.strategy = "visual_fraction_model";
      s.decision.strategyId = "visual_fraction_model";
      s.decision.pedagogicalMove = "show_visual";
      s.decision.scaffoldingLevel = 1;
    }
    const p = presentation(
      s,
      "resume",
      "Hi, I’m Da Vinci. Let’s work through this together.",
    );
    // Open with a human greeting and one invitation, leaving detailed support
    // on the canvas. A long explanation here can hit the bounded-speech guard
    // and inadvertently erase the greeting before the child says anything.
    p.spokenText = `Hi, I’m Da Vinci. We’ll work on ${conceptById[s.question.conceptId].name.toLowerCase()} together. ${m.checkpoint?.prompt ?? s.question.prompt}`;
    verifyTutorTurn(s, p);
    saveTurn(child, s, `greeting-${s.version}`, "", p, "system");
    return s;
  });
}
export function converse(
  child: Child,
  id: string,
  input: ConversationInput,
  understood?: UnderstoodTurn,
): LearningSession {
  return transaction(() => {
    let s = sessionById(id);
    if (s.childId !== child.id) throw new HttpError(404, "Lesson not found.");
    const prior = one<{ id: string }>(
      "SELECT id FROM conversation_turns WHERE session_id=? AND request_id=?",
      id,
      input.requestId,
    );
    if (prior) return s;
    if (s.version !== input.version)
      throw new HttpError(
        409,
        "Your lesson changed. Reconnect to your saved place.",
      );
    if (input.heard) deliveredSpeech(child, id, input.heard);
    const turn =
        understood ??
        understandLocally(
          input.transcript,
          s.teaching?.guidedPractice?.questionId === s.question.id
            ? { ...s.question, choices: undefined }
            : s.question,
        ),
      l = learnerFor(child.id),
      m = memoryFor(s);
    if (
      m.guidedPractice &&
      (m.guidedPractice.questionId !== s.question.id ||
        !guidedSteps(s.question)[m.guidedPractice.stepIndex])
    )
      m.guidedPractice = undefined;
    m.lastUtterance = input.transcript;
    if (turn.reasoning || turn.intent === "reasoning")
      m.recentReasoning = [
        ...m.recentReasoning,
        (turn.reasoning ?? input.transcript).slice(0, 500),
      ].slice(-5);
    const studentWords = wordCount(input.transcript);
    m.wordShare.student += studentWords;
    m.reasoningPath.push({
      questionId: s.question.id,
      intent: turn.intent,
      studentWords,
      signal: ["hint", "confused", "easier", "show", "feedback"].includes(
        turn.intent,
      )
        ? "support"
        : turn.intent === "reasoning"
          ? "reasoning"
          : turn.intent === "rapport"
            ? "social"
            : ["why", "define", "off_topic"].includes(turn.intent)
              ? "question"
              : "attempt",
    });
    m.reasoningPath = m.reasoningPath.slice(-30);
    if (m.signals.lastResponseAt)
      m.signals.paceMs = Math.max(
        0,
        Date.now() - Date.parse(m.signals.lastResponseAt),
      );
    m.signals.lastResponseAt = now();
    if (turn.confidence) m.signals.confidence = turn.confidence;
    if (turn.intent !== "wait") m.paused = false;
    let direct: string | undefined,
      prefix = "";
    let returnedFromGuidedSteps = false;
    const asksForSupport = [
      "hint",
      "confused",
      "easier",
      "show",
      "feedback",
      "resume",
    ].includes(turn.intent);
    if (s.state === "SESSION_REVIEW" && asksForSupport) {
      s.state = "TEACH";
      s.step = Math.max(3, s.step);
      s.feedback = null;
      m.paused = false;
      prefix =
        turn.intent === "resume"
          ? "Absolutely—we can keep going."
          : "You’re right; let’s keep working and change the approach.";
    }
    const checkpointAnswer =
      m.checkpoint &&
      ["answer", "correction"].includes(turn.intent) &&
      gradeQuestion(s.question, turn.answer ?? spokenMath(input.transcript));
    const checkpointObservation =
      m.checkpoint &&
      !checkpointAnswer &&
      input.source !== "canvas" &&
      !s.question.choices?.includes(turn.answer ?? "") &&
      !/^(?:my answer is|the answer is|i choose|i pick)\b/i.test(
        input.transcript.trim(),
      ) &&
      // A fraction offered for a fraction task is a recognizable final attempt;
      // a lone count can instead be a response about pieces in the model.
      !(
        s.question.subject === "Math" &&
        s.question.answer.includes("/") &&
        /^\s*[-+]?\d+\s*\/\s*\d+\s*$/.test(turn.answer ?? "")
      ) &&
      ["answer", "correction", "reasoning", "off_topic"].includes(
        turn.intent,
      ) &&
      input.transcript.trim().length > 0 &&
      !/\?\s*$/.test(input.transcript);
    if (s.state === "COMPLETE")
      direct =
        "Your lesson is saved. You can return to your space whenever you’re ready.";
    else if (turn.intent === "reveal") {
      const access = answerAccess(s);
      if (!access.allowed)
        direct = access.masteryCheck
          ? "This is a check of what you can do yourself. You can ask for a hint, and we’ll count it as practice with help."
          : access.policy === "disabled"
            ? "Let’s work it out together. I can give a hint or show a different example. Which would help?"
            : `Let’s try ${access.remaining} more ${access.remaining === 1 ? "time" : "times"} before we look at the solution. Would you like a hint?`;
      else {
        const key = questionKey(s);
        if (!m.revealedQuestions.includes(key)) m.revealedQuestions.push(key);
        m.revealedAnswer = {
          questionId: s.question.id,
          answer: s.question.answer,
          explanation: s.question.explanation,
        };
        m.checkpoint = undefined;
        m.guidedPractice = undefined;
        s.assistance = 7;
        s.decision.pedagogicalMove = "worked_example";
        s.decision.scaffoldingLevel = 5;
        m.assistanceLedger.push({
          questionId: s.question.id,
          conceptId: s.question.conceptId,
          strategy: s.decision.strategy,
          kind: "worked_example",
          level: 7,
          turn: m.reasoningPath.length,
          supportedSuccess: false,
          independentlyVerified: false,
        });
        direct = `The answer is ${s.question.answer}. ${s.question.explanation} Say “continue” to try a fresh question yourself.`;
        event(s, "answer_revealed", {
          questionId: s.question.id,
          attempts: access.attempts,
          policy: access.policy,
          masteryCredit: 0,
        });
      }
    } else if (
      m.revealedAnswer &&
      ["resume", "answer", "correction"].includes(turn.intent)
    ) {
      const previous = s.question;
      let seed = ++m.responseOrdinal + 103;
      let fresh = getQuestion(previous.conceptId, seed, true);
      for (let i = 0; i < 20 && fresh.prompt === previous.prompt; i++)
        fresh = getQuestion(previous.conceptId, ++seed, true);
      if (fresh.prompt === previous.prompt)
        direct =
          "We’ve explored this example. Tell me why the solution works, or choose another lesson.";
      else {
        s.question = fresh;
        s.feedback = null;
        s.assistance = 0;
        s.state = "INDEPENDENT_PRACTICE";
        s.decision = chooseDecision(l, fresh.conceptId);
        s.decision.scaffoldingLevel = 0;
        s.decision.pedagogicalMove = "check_understanding";
        m.activeIndependentCheck = {
          conceptId: previous.conceptId,
          sourceQuestionId: previous.id,
          strategy: s.decision.strategy,
          supportLevel: 7,
          dueAfterStep: s.step,
          questionId: fresh.id,
        };
        m.revealedAnswer = undefined;
        m.hintLevel = 0;
        prefix = "Now try a different example without help.";
      }
    } else if (
      requestsGuidedSteps(input.transcript) &&
      guidedSteps(s.question).length &&
      !s.feedback &&
      !["SESSION_REVIEW", "COMPLETE"].includes(s.state)
    ) {
      if (m.guidedPractice) {
        direct = guidedSteps(s.question)[m.guidedPractice.stepIndex]?.prompt;
      } else direct = beginGuidedPractice(s) ?? undefined;
    } else if (
      m.guidedPractice &&
      ["answer", "correction", "reasoning", "off_topic"].includes(turn.intent)
    ) {
      const result = respondToGuidedStep(s, turn.answer ?? input.transcript);
      returnedFromGuidedSteps =
        !!result && !result.changeStrategy && !m.guidedPractice;
      if (result?.changeStrategy) {
        applySupport(s, l, child, "another");
        saveLearner(child.id, l);
        prefix = result.text;
      } else direct = result?.text;
    } else if (
      m.guidedPractice &&
      ["hint", "why", "resume", "repeat"].includes(turn.intent)
    ) {
      const step = guidedSteps(s.question)[m.guidedPractice.stepIndex];
      direct = `${turn.intent === "hint" || turn.intent === "why" ? `${step.explanation} ` : ""}${step.prompt}`;
    } else if (checkpointObservation) {
      const checkpoint = m.checkpoint!;
      const observation = assessReasoning(
        input.transcript,
        rubricFor(s.question),
      );
      event(s, "teaching_checkpoint", {
        strategy: checkpoint.strategy,
        questionId: checkpoint.questionId,
        observation: input.transcript,
        criteria: observation.matches,
        contradicted: observation.contradicted,
        sufficient: observation.sufficient,
        masteryCredit: 0,
      });
      // An observation is not an assessed solution. Even relevant vocabulary
      // does not demonstrate independent success or strategy effectiveness.
      if (observation.contradicted) {
        applySupport(s, l, child, "another");
        saveLearner(child.id, l);
        prefix = "Let’s test that idea with another example.";
      } else if (observation.matches.length) {
        m.checkpoint = undefined;
        direct = `Let’s test that connection on the original question: ${s.question.prompt}`;
      } else {
        const material = materialFor(
          s.question,
          getQuestion(s.question.conceptId, 91),
        );
        direct = `Let’s connect your idea to what we can check. ${material.attention} ${checkpoint.prompt}`;
      }
    } else if (turn.intent === "finish") {
      m.checkpoint = undefined;
      m.guidedPractice = undefined;
      if (s.state !== "SESSION_REVIEW") {
        s.state = "SESSION_REVIEW";
        s.version++;
        saveSession(s);
        direct =
          "We can stop here. Did that feel a little clearer, ready for more, or still tricky?";
      } else {
        s = advanceSession(child, id, {
          action: "reflect",
          version: s.version,
          reflection: /tricky/i.test(input.transcript)
            ? "Still tricky"
            : /more/i.test(input.transcript)
              ? "Ready for more"
              : "A little clearer",
        });
      }
    } else if (turn.intent === "wait") {
      m.paused = true;
      direct = "Take your time. Say continue when you’re ready.";
    } else if (turn.intent === "resume") {
      m.paused = false;
      if (s.feedback) {
        s = advanceSession(child, id, {
          action: "continue",
          version: s.version,
        });
      }
      prefix ||= "Okay.";
    } else if (turn.intent === "repeat") {
      direct = s.conversation?.text ?? s.question.prompt;
    } else if (["hint", "confused", "easier", "show"].includes(turn.intent)) {
      m.guidedPractice = undefined;
      if (s.feedback) s.feedback = null;
      const change = applySupport(
        s,
        l,
        child,
        turn.intent === "confused"
          ? "another"
          : (turn.intent as "hint" | "easier" | "show"),
      );
      event(s, turn.intent === "hint" ? "hint_requested" : "strategy_changed", {
        ...change,
        hintLevel: memoryFor(s).hintLevel,
        reason: s.decision.reason,
      });
      saveLearner(child.id, l);
      if (!prefix)
        prefix =
          turn.intent === "hint"
            ? "Here’s one small step."
            : turn.intent === "show"
              ? "Yes—let’s put it on the canvas."
              : "Let’s try a genuinely different way.";
    } else if (turn.intent === "feedback") {
      m.guidedPractice = undefined;
      if (s.feedback) s.feedback = null;
      const change = applySupport(s, l, child, "another");
      event(s, "strategy_changed", {
        ...change,
        reason: "Learner said the current interaction was not helping.",
      });
      saveLearner(child.id, l);
      prefix =
        "Thanks for telling me. I was repeating myself, so I’ll change both the explanation and what I ask you to notice.";
    } else if (turn.intent === "define" || turn.intent === "why") {
      const material = materialFor(
        s.question,
        getQuestion(s.question.conceptId, 91),
      );
      const term = (turn.term ?? "").replace(/[?.]/g, "").trim();
      const entry = Object.entries(material.glossary).find(([key]) =>
        term.includes(key),
      );
      direct = entry
        ? `${entry[1]} What does that tell you about this question?`
        : turn.intent === "why"
          ? `${material.strategyHint} Which part would you like to look at together?`
          : "Which word in this question would you like to unpack?";
      s.assistance = Math.max(1, s.assistance);
    } else if (turn.intent === "confidence") {
      direct =
        turn.confidence === "high"
          ? "Let’s check your idea without extra help. What do you think?"
          : "It’s okay to be unsure. What is one part you do know?";
    } else if (turn.intent === "rapport") {
      const review = s.state === "SESSION_REVIEW";
      direct = /hear me|do you hear|are you there/i.test(input.transcript)
        ? review
          ? "Yes, I can hear you. Before we stop, did today feel a little clearer, ready for more, or still tricky?"
          : `Yes, I can hear you. I’m here with you. Let’s take this one step at a time: ${s.question.prompt}`
        : /thank/i.test(input.transcript)
          ? review
            ? "You’re welcome. Before we finish, did this feel clearer, ready for more, or still tricky?"
            : `You’re welcome. Let’s keep working together: ${s.question.prompt}`
          : /sorry/i.test(input.transcript)
            ? `You don’t need to apologize. We can reset and try together: ${s.question.prompt}`
            : /how are you/i.test(input.transcript)
              ? "I’m ready to learn with you. How are you feeling about this problem?"
              : /(?:your name|who are you)/i.test(input.transcript)
                ? "I’m Da Vinci, your learning partner. Would a clue, a picture, or some thinking time help most?"
                : /\b(?:i like|i love|my favorite)\b/i.test(input.transcript)
                  ? `Thanks for telling me. We can connect new ideas to things you enjoy. What connection do you notice in today’s problem?`
                  : /\b(?:tired|sad|upset|frustrated)\b/i.test(input.transcript)
                    ? "Thanks for telling me. We can slow down, take a break, or try one small step. What would feel best?"
                    : `Hi! I’m here and listening. What would help you get started?`;
    } else if (turn.intent === "reasoning") {
      const result = assessReasoning(
        turn.reasoning ?? input.transcript,
        rubricFor(s.question),
      );
      event(s, "reasoning_assessed", {
        questionId: s.question.id,
        criteria: result.matches,
        score: result.score,
        contradicted: result.contradicted,
      });
      if (result.sufficient) {
        const state =
          l.states[s.question.conceptId] ??
          initialState(child.id, s.question.conceptId);
        if (!m.reasoningAssessed?.includes(s.question.id)) {
          state.masteryConfidence = Math.min(
            0.95,
            state.masteryConfidence + 0.06,
          );
          l.states[s.question.conceptId] = state;
          m.reasoningAssessed = [...(m.reasoningAssessed ?? []), s.question.id];
          saveLearner(child.id, l);
        }
        direct =
          "You connected the idea to a reason. Let’s test it on the question.";
        m.awaitingReasoning = false;
        if (s.feedback) {
          saveSession(s);
          s = advanceSession(child, id, {
            action: "continue",
            version: s.version,
          });
          direct = undefined;
          prefix = "Your explanation connects the idea to a reason.";
        }
      } else if (result.contradicted) {
        applySupport(s, l, child, "another");
        saveLearner(child.id, l);
        prefix = "Let’s test that explanation with a different view.";
      } else
        direct =
          "What detail or example supports your idea? You can also say “give me a hint.”";
    } else if (turn.intent === "answer" || turn.intent === "correction") {
      if (s.state === "SESSION_REVIEW") {
        direct =
          "Tell me how it felt: a little clearer, ready for more, or still tricky.";
      } else if (s.feedback) {
        direct =
          "We’ve checked that answer. Tell me why it works, or say continue.";
      } else {
        const answer = turn.answer ?? spokenMath(input.transcript);
        const valid = answer.trim().length > 0;
        if (!valid)
          direct =
            "I didn’t catch your answer clearly. Could you say it another way?";
        else {
          saveSession(s);
          const correct = gradeQuestion(s.question, answer);
          m.checkpoint = undefined;
          s = advanceSession(child, id, {
            action: "answer",
            version: s.version,
            answer,
            reasoning: turn.reasoning,
          });
          const state = memoryFor(s);
          const probed = finishDiagnosticProbe(s, correct);
          if (probed) saveSession(s);
          if (correct) {
            if (state.returnStack.length) {
              const frame = state.returnStack[state.returnStack.length - 1];
              s = advanceSession(child, id, {
                action: "continue",
                version: s.version,
              });
              prefix = `That building block works. Back to ${conceptById[frame.skillId].name.toLowerCase()}.`;
            } else if (s.attempts % 3 === 0 && !state.awaitingReasoning) {
              state.awaitingReasoning = true;
              direct = "That’s right. How did you figure it out?";
            } else {
              s = advanceSession(child, id, {
                action: "continue",
                version: s.version,
              });
              prefix =
                state.signals.supportSuccesses >= 2
                  ? "That’s working. Let’s try with less support."
                  : "That fits. Let’s build on it.";
            }
          } else {
            const updated = learnerFor(child.id);
            s.feedback = null;
            s.question = {
              ...s.question,
              id: `${s.question.id.split(":").slice(0, 2).join(":")}:retry${++state.responseOrdinal}`,
            };
            const change = probed
              ? { next: s.decision.strategy, reason: s.decision.reason }
              : startDiagnosticProbe(s)
                ? { next: s.decision.strategy, reason: s.decision.reason }
                : applySupport(s, updated, child, "another", false);
            saveLearner(child.id, updated);
            event(s, "strategy_changed", change);
            prefix = state.intelligence?.diagnostic
              ? "Let’s check one building block before choosing how to help."
              : "That answer doesn’t fit yet. Let’s try a different approach.";
          }
        }
      }
    } else if (
      /\b(?:what should i do|where do i start|first step)\b/i.test(
        input.transcript,
      )
    )
      direct = `Let’s choose a starting point together. ${focusingQuestion(s)}`;
    else if (
      /\b(?:tell me about|can we talk about|what do you think about)\b/i.test(
        input.transcript,
      )
    )
      direct =
        "That’s an interesting direction. Tell me how you think it connects to what we’re learning, and I’ll follow your idea.";
    else
      direct = `I’m listening, but I’m not sure which part you want to explore. Tell me your idea, ask about a word, or ask me to show it visually.`;
    s.version++;
    const p = presentation(s, turn.intent, prefix);
    if (returnedFromGuidedSteps) p.teachingMove = "return_to_task";
    if (direct) {
      p.text = direct;
      p.spokenText = direct;
      p.cues = p.cues.map((cue) => ({
        ...cue,
        atWord: cue.action === "show" ? 0 : Math.min(cue.atWord, 8),
      }));
      p.paused = memoryFor(s).paused;
      p.canAnswer = !p.paused && s.state !== "COMPLETE";
    }
    const guided = memoryFor(s).guidedPractice;
    const guidedStep =
      guided?.questionId === s.question.id
        ? guidedSteps(s.question)[guided.stepIndex]
        : undefined;
    if (guidedStep) {
      memoryFor(s).goal.nextMove =
        `Check the learner’s response to “${guidedStep.prompt}” as a supported substep, without awarding mastery.`;
      p.teachingMove = "guided_step";
      p.cognitiveLoad = "guided";
      p.canvasActions = guidedActions(guidedStep, s.question);
      // Show only source quantities, not comparison visuals containing the key.
      const sourceVisuals = s.question.visuals.filter(
        (v) => v.type === "array" || v.type === "fraction_bar",
      );
      p.cues = [
        {
          id: "guided-model",
          atWord: 0,
          action: "show",
          visuals: sourceVisuals,
          label: "One step at a time",
        },
        {
          id: "guided-question",
          atWord: 0,
          action: "question",
          visuals: [],
          label: guidedStep.prompt,
        },
      ];
    }
    if (
      turn.intent === "reveal" &&
      memoryFor(s).revealedAnswer &&
      answerAccess(s).allowed
    ) {
      p.cues = [
        {
          id: "solution",
          atWord: 0,
          action: "show",
          visuals: [
            {
              type: "passage",
              text: `${s.question.answer} — ${s.question.explanation}`,
              highlights: [],
            },
          ],
          label: "Answer and why",
        },
      ];
      p.canvasActions = [];
      p.canAnswer = false;
      p.verification = {
        passed: true,
        revised: false,
        checks: [
          "parent_authorized_reveal",
          "no_mastery_credit",
          "fresh_check_next",
        ],
      };
    } else verifyTutorTurn(s, p);
    saveTurn(child, s, input.requestId, input.transcript, p, input.source);
    return s;
  });
}
export function conversationHistory(childId: string, sessionId: string) {
  return all<{
    student_transcript: string;
    spoken_tutor_text: string;
    interrupted: number;
    created_at: string;
  }>(
    "SELECT student_transcript,spoken_tutor_text,interrupted,created_at FROM conversation_turns WHERE child_id=? AND session_id=? ORDER BY created_at DESC LIMIT 20",
    childId,
    sessionId,
  ).reverse();
}
