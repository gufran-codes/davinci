import { conceptById } from "../curriculum";
import type { LearningSession } from "../types";
import { dialogueFocus } from "./dialogue";
import type { UnderstoodTurn } from "./intent";
import { dialogueStyleChecks } from "../teaching/speech";
import { tutorSpeechBudget } from "../teaching/response-budget";
import type { ConversationPresentation } from "../teaching/types";

/** A snapshot of the task the child actually answered, before assessment moves on. */
export function taskSnapshot(s: LearningSession) {
  const skill = conceptById[s.question.conceptId];
  return {
    questionId: s.question.id,
    prompt: s.question.prompt,
    subject: s.question.subject,
    grade: s.learningPreferences?.grade ?? skill.gradeBand[0],
    courseId: skill.courseId,
    skillId: skill.id,
    focus: dialogueFocus(s),
    choices: s.question.choices ?? [],
    choiceLabels: s.question.choiceLabels ?? {},
    choiceMode: s.question.choiceMode,
  };
}
export function responsePlan(
  s: LearningSession,
  p: ConversationPresentation | undefined = s.conversation,
) {
  const task = taskSnapshot(s);
  const dialogue = s.teaching?.dialogue?.plan;
  const conversational = [
    "why",
    "define",
    "rapport",
    "off_topic",
    "wait",
    "confidence",
  ];
  const requiredQuestion =
    dialogue?.questionPolicy === "none" || dialogue?.mode === "social"
      ? undefined
      : (p?.assessment?.correct &&
            p.assessment.questionId !== task.questionId) ||
          (p?.intent === "resume" && !s.teaching?.lastUtterance)
        ? task.focus.prompt
        : !conversational.includes(p?.intent ?? "") &&
            ["guided_step", "observation"].includes(task.focus.kind)
          ? task.focus.prompt
          : undefined;
  return {
    task,
    speechBudget: tutorSpeechBudget({
      intent: p?.intent ?? "resume",
      utterance: s.teaching?.lastUtterance,
      mode: dialogue?.mode,
      grade: task.grade,
      preference: s.teaching?.dialogue?.responseDepth,
      requiredQuestion,
    }),
    strategyId: s.decision.strategyId,
    move: s.decision.pedagogicalMove,
    reason: s.decision.reason,
    strengthToLeverage: s.decision.strengthToLeverage,
    supportPlanId:
      s.teaching?.supportPlan?.questionId === s.question.id
        ? s.teaching.supportPlan.id
        : undefined,
    assistance: s.assistance,
    answeredTask: p?.assessment,
    dialogue,
    teachingBrief: {
      studentRequest: dialogue?.request ?? s.teaching?.lastUtterance,
      understoodPart: dialogue?.understood,
      unresolvedGap: s.teaching?.dialogue?.gaps.find(
        (g) => g.id === dialogue?.gapId,
      )?.description,
      failedMechanisms: dialogue?.failedMechanisms ?? [],
      recentAttempts: (s.teaching?.attempts ?? [])
        .filter((a) => a.skillId === s.question.conceptId)
        .slice(-3)
        .map((a) => ({
          response: a.studentResponse,
          outcome: a.outcome,
          assistance: a.assistanceLevel,
        })),
      pendingTaskPolicy:
        "Stay on this task until its answer is checked correct or its authorized solution has been shown and the student asks to continue. Hints, explanation and social conversation cannot replace the task.",
      boardPolicy:
        "No board is needed unless it conveys a useful model, checked worked step or principle. Do not copy the question or invent relations.",
    },
    requiredQuestion,
    approvedDraft: p?.spokenText ?? p?.text ?? "",
    answerRevealed: Boolean(s.teaching?.revealedAnswer),
  };
}
export interface TurnTrace {
  inputTask: ReturnType<typeof taskSnapshot>;
  interpretation: UnderstoodTurn;
  interpretationSource: "local" | "model" | "fallback";
  responsePlan?: ReturnType<typeof responsePlan>;
  quality?: { attempts: number; checks: string[]; usedFallback: boolean };
}
export function textSimilarity(a: string, b: string) {
  const words = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );
  const left = words(a),
    right = words(b);
  return left.size && right.size
    ? [...left].filter((w) => right.has(w)).length /
        new Set([...left, ...right]).size
    : 0;
}

/** Bounded checks, not a claim to verify arbitrary semantic reasoning. */
export function responseQuality(
  s: LearningSession,
  speech: string,
  options: { partial?: boolean } = {},
) {
  const plan = responsePlan(s),
    checks: string[] = [];
  const text = speech.trim();
  if (
    !["SESSION_REVIEW", "COMPLETE"].includes(s.state) &&
    /tell me how it felt|a little clearer, ready for more, or still tricky/i.test(
      text,
    )
  )
    checks.push("reflection_outside_review");
  const wordLimit = plan.speechBudget.maxWords;
  if (!text || text.split(/\s+/).length > wordLimit)
    checks.push("voice_length");
  if (
    plan.answeredTask?.correct &&
    /what (?:made|makes).*choos|what.*helped you decide|why did you choose|say [“"]?continue/i.test(
      text,
    )
  )
    checks.push("unnecessary_reasoning_gate");
  if ((text.match(/\?/g) ?? []).length > 2) checks.push("question_overload");
  if (plan.dialogue?.questionPolicy === "none" && text.includes("?"))
    checks.push("unrequested_quiz");
  const intent = s.conversation?.intent;
  if (intent !== "repeat" && !["wait", "resume"].includes(intent ?? "")) {
    const recent = (s.teaching?.recentTutorTurns ?? [])
      .filter((t) => t.turnId !== s.conversation?.turnId)
      .slice(-4);
    checks.push(
      ...dialogueStyleChecks(
        text,
        recent.map((t) => t.text),
        plan.requiredQuestion,
      ),
    );
    if (recent.some((t) => textSimilarity(t.text, text) > 0.84))
      checks.push("repeated_explanation");
  }
  if (!options.partial && plan.requiredQuestion && !text.includes(plan.requiredQuestion))
    checks.push("active_focus_changed");
  if (
    plan.answeredTask?.correct &&
    plan.requiredQuestion &&
    !/\b(?:correct|right|yes|got (?:it|this)|well done|nice work)\b/i.test(
      text.includes(plan.requiredQuestion)
        ? text.slice(0, text.indexOf(plan.requiredQuestion))
        : text,
    )
  )
    checks.push("missing_success_acknowledgement");
  const context = JSON.stringify({
    question: s.question,
    inputTask: s.teaching?.lastTurnTrace?.inputTask,
    plan,
    cues: s.conversation?.cues,
    actions: s.conversation?.canvasActions,
    dialogue: plan.dialogue,
  }).toLowerCase();
  const foreign = [
    "numerator",
    "denominator",
    "fraction",
    "photosynthesis",
    "chloroplast",
    "parliament",
    "volcano",
    "protagonist",
  ];
  if (
    plan.dialogue?.mode !== "tangent" &&
    foreign.some(
      (term) =>
        new RegExp(`\\b${term}s?\\b`, "i").test(text) &&
        !context.includes(term),
    )
  )
    checks.push("unsupported_subject_content");
  const answer = s.question.answer.trim().toLowerCase();
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const contentWords = (value: string) =>
    new Set(
      value
        .toLowerCase()
        .match(/[a-z]+/g)
        ?.filter(
          (w) =>
            w.length > 3 &&
            ![
              "that",
              "this",
              "with",
              "from",
              "when",
              "where",
              "what",
              "which",
              "each",
              "they",
              "their",
              "them",
              "than",
              "have",
              "does",
              "into",
              "another",
              "other",
              "only",
              "would",
              "could",
              "should",
            ].includes(w),
        )
        .map((w) => w.replace(/s$/, "")) ?? [],
    );
  const keyWords = contentWords(answer),
    speechWords = contentWords(text);
  if (
    intent !== "reveal" &&
    !plan.answerRevealed &&
    s.question.subject !== "Math" &&
    keyWords.size >= 4 &&
    [...keyWords].filter((word) => speechWords.has(word)).length /
      keyWords.size >=
      0.8 &&
    !s.question.prompt.toLowerCase().includes(answer)
  )
    checks.push("answer_overlap");
  if (
    intent !== "reveal" &&
    !plan.answerRevealed &&
    (text.toLowerCase().replace(/[.!]$/, "") === answer ||
      new RegExp(
        `\\b(?:answer is|result is|choose|pick|correct choice is|it is|it's)\\s+[“"']?${escaped}(?=$|[\\s.!?,])`,
        "i",
      ).test(text))
  )
    checks.push("answer_leak");
  if (
    s.question.subject === "Math" &&
    !["tangent", "social"].includes(plan.dialogue?.mode ?? "")
  ) {
    const allowed = new Set(context.match(/\d+(?:\.\d+)?/g) ?? []);
    if ((text.match(/\d+(?:\.\d+)?/g) ?? []).some((n) => !allowed.has(n)))
      checks.push("unplanned_quantity");
  }
  return checks;
}
