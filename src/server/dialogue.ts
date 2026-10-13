import { createHash, randomUUID } from "node:crypto";
import { getQuestion } from "../lib/curriculum";
import type { LearningSession, Question } from "../lib/types";
import type { UnderstoodTurn } from "../lib/conversation/intent";
import type {
  DialogueMemory,
  DialoguePlan,
} from "../lib/conversation/student-dialogue";
import { validateDialogue } from "../lib/conversation/student-dialogue";
import { memoryFor } from "../lib/teaching/adaptive";
import {
  answerLessonQuestion,
  authoredConceptExample,
  supportPlans,
} from "../lib/teaching/grounded-support";
import { contentById, materialFor } from "../lib/teaching/content";
import type { ConversationPresentation } from "../lib/teaching/types";
import { guidedSteps } from "../lib/teaching/guided-steps";
import { explanationStructure } from "../lib/teaching/explanation-structure";
import { responseDepthRequest } from "../lib/teaching/response-budget";

export function dialogueMemory(s: LearningSession): DialogueMemory {
  return (memoryFor(s).dialogue ??= {
    preference: "default",
    gaps: [],
    explanations: [],
  });
}

/** Runs inside the same transaction as grading; duplicates and stale requests
 * cannot update the memory independently of the accepted student turn. */
export function planDialogue(
  s: LearningSession,
  turn: UnderstoodTurn,
  transcript: string,
): DialoguePlan {
  const memory = dialogueMemory(s);
  const depth = responseDepthRequest(transcript);
  if (
    depth.persistent &&
    depth.depth &&
    !["answer", "correction"].includes(turn.intent)
  )
    memory.responseDepth = depth.depth;
  const parts = validateDialogue(turn.dialogue, transcript);
  turn.dialogue = parts;
  if (parts?.preference) memory.preference = parts.preference.style;
  let active = memory.gaps.find((gap) => gap.id === memory.activeGapId);
  const referenced =
    parts?.request?.gapId &&
    memory.gaps.find((gap) => gap.id === parts.request!.gapId);
  if (referenced) active = referenced;
  const refersBack =
    !!referenced ||
    parts?.request?.reference === "previous" ||
    (parts?.resolution?.status === "still_confused" &&
      !!active &&
      /^(?:i )?(?:still |don['’]t |do not )*(?:understand|get it|know)[.!]*$/i.test(
        transcript.trim(),
      ));
  const focus = refersBack
    ? (active?.question ?? memory.plan?.focusQuestion ?? s.question)
    : s.question;
  if (parts?.resolution?.status === "resolved" && active && !parts.gap) {
    active.status = "resolved";
    active.resolutionEvidence = parts.resolution.evidence.slice(0, 500);
    const last = memory.explanations.findLast(
      (entry) => entry.gapId === active!.id,
    );
    if (last) last.outcome = "understood";
    memory.activeGapId = undefined;
    active = undefined;
  }
  const difficulty =
    parts?.resolution?.status === "still_confused" ||
    ["confused", "feedback"].includes(turn.intent);
  if (
    difficulty &&
    active &&
    (refersBack || active.question.prompt === focus.prompt)
  ) {
    active.status = "open";
    // Mark the explanation being discussed, not an unrelated intervening greeting.
    const last = memory.explanations.findLast(
      (entry) => entry.gapId === active!.id && !!entry.deliveredText,
    );
    if (last) {
      last.outcome = "not_helpful";
      active.failedApproaches = [
        ...new Set([...(active.failedApproaches ?? []), last.approach]),
      ].slice(-32);
      if (last.structure)
        active.failedMechanisms = [
          ...new Set([
            ...(active.failedMechanisms ?? []),
            last.structure.mechanism,
          ]),
        ].slice(-16);
    }
  }
  const description =
    parts?.request?.kind === "tangent"
      ? undefined
      : (parts?.gap?.description ??
        parts?.request?.text ??
        (difficulty ? transcript : undefined));
  if (description) {
    const sameFocus = active && active.question.prompt === focus.prompt;
    const continuing =
      sameFocus &&
      (difficulty ||
        refersBack ||
        /\b(?:it|that|this|still|same)\b/i.test(description));
    if (!continuing) {
      active = {
        id: randomUUID(),
        question: structuredClone(focus),
        description: description.slice(0, 400),
        evidence: (
          parts?.gap?.evidence ??
          parts?.request?.evidence ??
          transcript
        ).slice(0, 700),
        status: "open",
        explanationIds: [],
      };
      memory.gaps.push(active);
      memory.gaps = memory.gaps.slice(-8);
    } else if (
      parts?.gap &&
      !/^i (?:still )?(?:don['’]t|do not) (?:know|understand|get it)[.!]*$/i.test(
        description,
      )
    ) {
      active!.description = description.slice(0, 400);
      active!.evidence = parts.gap.evidence.slice(0, 700);
    }
    if (parts?.understood) active!.understood = parts.understood.description;
    memory.activeGapId = active!.id;
  }
  const failed = active
    ? memory.explanations
        .filter(
          (entry) =>
            entry.gapId === active.id && entry.outcome === "not_helpful",
        )
        .map((entry) => entry.approach)
    : [];
  const request = parts?.request;
  const help = [
    "confused",
    "feedback",
    "hint",
    "easier",
    "show",
    "why",
    "define",
  ].includes(turn.intent);
  const mode: DialoguePlan["mode"] = turn.needsClarification
    ? "clarification"
    : request?.kind === "tangent"
      ? "tangent"
      : request?.kind === "analogy_repair"
        ? "analogy_repair"
        : request?.kind === "worked_example" || (help && failed.length >= 2)
          ? "worked_example"
          : request || (help && memory.preference === "explain")
            ? "direct_explanation"
            : ["why", "define"].includes(turn.intent)
              ? "direct_explanation"
              : help
                ? "hint"
                : ["answer", "correction", "reasoning"].includes(turn.intent)
                  ? "feedback"
                  : ["rapport", "off_topic"].includes(turn.intent)
                    ? "social"
                    : "practice";
  const plan: DialoguePlan = {
    mode,
    request: request?.text,
    focusQuestion: structuredClone(refersBack ? focus : s.question),
    gapId: description ? active?.id : undefined,
    understood: active?.understood,
    failedApproaches: [
      ...new Set([...(active?.failedApproaches ?? []), ...failed]),
    ].slice(-32),
    failedMechanisms: [
      ...new Set([
        ...(active?.failedMechanisms ?? []),
        ...memory.explanations
          .filter(
            (entry) =>
              entry.gapId === active?.id && entry.outcome === "not_helpful",
          )
          .flatMap((entry) =>
            entry.structure ? [entry.structure.mechanism] : [],
          ),
      ]),
    ].slice(-16),
    questionPolicy: [
      "direct_explanation",
      "worked_example",
      "analogy_repair",
      "tangent",
    ].includes(mode)
      ? "none"
      : "optional",
    reason: request
      ? `Address the student's ${request.kind} before returning to practice.`
      : help && memory.preference === "explain"
        ? "The student requested direct teaching, not another quiz."
        : failed.length >= 2
          ? "Earlier explanations did not resolve this gap; demonstrate a separate example."
          : "Respond to the current contribution without changing assessment rules.",
  };
  if (s.teaching?.guidedPractice?.questionId === focus.id) {
    const step = guidedSteps(focus)[s.teaching.guidedPractice.stepIndex];
    if (step)
      plan.focusStep = { prompt: step.prompt, explanation: step.explanation };
  }
  if (mode === "analogy_repair" && refersBack) {
    const prior = memory.explanations.findLast(
      (entry) =>
        entry.gapId === active?.id && !!entry.deliveredText && entry.structure,
    );
    if (prior?.structure) plan.structure = structuredClone(prior.structure);
  }
  memory.plan = plan;
  return plan;
}

function exampleKey(q: Question) {
  return `example:${q.assessmentKey ?? createHash("sha256").update(`${q.conceptId}:${q.prompt}:${q.answer}`).digest("hex").slice(0, 16)}`;
}

function separateExample(q: Question, failed: string[] = []) {
  const conceptExample = authoredConceptExample(q);
  if (conceptExample)
    return failed.includes(exampleKey(conceptExample))
      ? undefined
      : conceptExample;
  const worked = contentById[q.conceptId]?.lesson?.workedExample;
  if (worked && worked.prompt !== q.prompt && worked.answer !== q.answer) {
    const example = {
      ...q,
      id: `${q.conceptId}:lesson-example`,
      assessmentKey: `${q.conceptId}:lesson-example`,
      prompt: worked.prompt,
      answer: worked.answer,
      explanation: worked.steps.join(" "),
      choices: undefined,
      choiceLabels: undefined,
      options: undefined,
      visuals: [],
    };
    if (!failed.includes(exampleKey(example))) return example;
  }
  // Authored examples only. Never use the current key as the worked example.
  for (let seed = 1; seed <= 24; seed++) {
    const example = getQuestion(q.conceptId, seed);
    if (
      example.prompt !== q.prompt &&
      example.answer !== q.answer &&
      !failed.includes(exampleKey(example))
    )
      return example;
  }
}

/** Produce a safe offline draft and supply checked content for generative
 * teaching. This is not a second grading path or permission to reveal answers. */
export function explanationDraft(
  s: LearningSession,
  plan: DialoguePlan,
  completed = false,
) {
  const q = plan.focusQuestion;
  const example = separateExample(q, plan.failedApproaches);
  const material = materialFor(q, example ?? q);
  const request =
    plan.request ??
    dialogueMemory(s).gaps.find((g) => g.id === plan.gapId)?.description ??
    "";
  let draft = answerLessonQuestion(q, request, material.glossary);
  if (draft) plan.approach = "concept-connection";
  if (!draft && plan.focusStep) {
    draft = plan.focusStep.explanation;
    plan.approach = `step:${plan.focusStep.prompt}`;
  }
  if (completed && !draft) {
    draft = q.explanation;
    plan.approach = "completed-solution";
  }
  const lesson = contentById[q.conceptId]?.lesson;
  if (!draft && lesson) {
    draft = `${lesson.coreIdea} ${lesson.teachingSteps[0]}`;
    plan.approach = "lesson-connection";
  }
  // A rejected explanation needs a different reasoning route even offline.
  if (plan.approach && plan.failedApproaches.includes(plan.approach))
    draft = null;
  if (plan.mode === "worked_example" && example) {
    plan.example = example;
    plan.approach = exampleKey(example);
    draft = `Here is a separate example: ${example.prompt.replace(/\?/g, ".")} ${example.explanation}`;
  } else if (!draft) {
    const alternatives = supportPlans(q, example ?? q);
    const unused = alternatives.find(
      (p) =>
        !plan.failedApproaches.includes(p.id) &&
        p.id !== "parallel-example" &&
        !plan.failedMechanisms.includes(
          explanationStructure(q, p.id).mechanism,
        ),
    );
    draft =
      unused?.message ??
      "The available explanations have not addressed the missing connection yet. Tell me the exact word or step that stops making sense, and we can focus there.";
    plan.approach = unused?.id ?? "locate-gap";
    if (plan.mode === "analogy_repair")
      draft = `The connection to make explicit is this: ${draft}`;
  }
  if (plan.mode === "tangent")
    draft =
      "That’s outside the material I can check in this lesson. I can’t give you a reliable explanation of it in limited-conversation mode. Your current question is still saved.";
  else {
    plan.structure ??= explanationStructure(
      plan.example ?? q,
      plan.approach ?? plan.mode,
    );
    if (plan.example)
      plan.structure = {
        ...plan.structure,
        mechanism: `worked-example:${plan.structure.mechanism}`,
        steps: [plan.example.explanation],
      };
    if (plan.mode === "analogy_repair" && plan.structure.mappings.length) {
      const mapping = plan.structure.mappings
        .map((item) => `${item.representation} means ${item.meaning}.`)
        .join(" ");
      draft = `${mapping} ${plan.structure.steps[0]}`;
    }
  }
  // An explanation should not quietly create an observation checkpoint.
  draft = draft
    .replace(/[^.!?]*\?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  plan.fallback = draft || q.hint;
  return plan.fallback;
}

export function recordDialogueExplanation(
  s: LearningSession,
  p: ConversationPresentation,
  source: string,
) {
  const memory = dialogueMemory(s),
    plan = memory.plan;
  if (
    !plan ||
    ![
      "hint",
      "direct_explanation",
      "worked_example",
      "analogy_repair",
      "tangent",
    ].includes(plan.mode)
  )
    return;
  const text = p.spokenText ?? p.text;
  const approach =
    plan.approach ??
    (plan.mode === "hint" ? memoryFor(s).supportPlan?.id : undefined) ??
    plan.mode;
  if (plan.mode === "hint")
    plan.structure ??= explanationStructure(plan.focusQuestion, approach);
  const existing = memory.explanations.find((e) => e.id === p.turnId);
  if (plan.example) {
    const teaching = memoryFor(s);
    if (
      !teaching.servedQuestions?.some(
        (item) => item.prompt === plan.example!.prompt,
      )
    )
      teaching.servedQuestions = [
        ...(teaching.servedQuestions ?? []),
        { skillId: plan.example.conceptId, prompt: plan.example.prompt },
      ].slice(-160);
  }
  if (existing) {
    if (existing.deliveredText === existing.text) existing.deliveredText = text;
    existing.text = text;
  } else
    memory.explanations.push({
      id: p.turnId,
      gapId: plan.gapId,
      questionId: plan.focusQuestion.id,
      mode: plan.mode,
      approach,
      text,
      deliveredText: source === "voice" ? "" : text,
      structure: plan.structure,
      outcome: "unconfirmed",
    });
  memory.explanations = memory.explanations.slice(-12);
  const gap = memory.gaps.find((g) => g.id === plan.gapId);
  if (gap && !gap.explanationIds.includes(p.turnId))
    gap.explanationIds = [...gap.explanationIds, p.turnId].slice(-8);
  // Offering an explanation never resolves a gap or awards mastery.
  if (gap && gap.status !== "resolved") gap.status = "explained";
}
