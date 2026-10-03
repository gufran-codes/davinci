import { fractionSequence, visualActionSequence } from "./whiteboard";
import { conceptById, getQuestion } from "../curriculum";
import { chooseDecision, updateStrategy } from "../learning";
import type { Child, Learner, LearningSession, Visual } from "../types";
import { freshSignals, rankStrategies } from "./strategies";
import { materialFor } from "./content";
import { selectSupportPlan, supportPlans } from "./grounded-support";
import { supportMove } from "./policy";
import type { CanvasCue, TeachingMemory } from "./types";
export function memoryFor(s: LearningSession): TeachingMemory {
  const memory = (s.teaching ??= {
    recentReasoning: [],
    recentTutorQuestions: [],
    attempts: [],
    hintHistory: [],
    genuineAttempts: {},
    revealedQuestions: [],
    signals: freshSignals(),
    returnStack: [],
    hintLevel: 0,
    responseOrdinal: 0,
    awaitingReasoning: false,
    paused: false,
    assistanceLedger: [],
    reasoningPath: [],
    wordShare: { student: 0, tutor: 0 },
    introducedPrompts: [],
    goal: {
      skillId: s.question.conceptId,
      objective: s.decision.objective,
      successCriteria:
        "Explain the idea and solve a fresh problem independently.",
      nextMove: "Listen to the learner’s first attempt.",
    },
  });
  memory.recentReasoning ??= [];
  memory.recentTutorQuestions ??= [];
  memory.attempts ??= [];
  memory.hintHistory ??= [];
  memory.genuineAttempts ??= {};
  memory.revealedQuestions ??= [];
  memory.assistanceLedger ??= [];
  memory.reasoningPath ??= [];
  memory.wordShare ??= { student: 0, tutor: 0 };
  memory.introducedPrompts ??= [];
  memory.goal ??= {
    skillId: s.question.conceptId,
    objective: s.decision.objective,
    successCriteria:
      "Explain the idea and solve a fresh problem independently.",
    nextMove: "Listen to the learner’s first attempt.",
  };
  return memory;
}
function addAssistance(
  s: LearningSession,
  kind: TeachingMemory["assistanceLedger"][number]["kind"],
) {
  const m = memoryFor(s);
  m.assistanceLedger.push({
    questionId: s.question.id,
    conceptId: s.question.conceptId,
    strategy: s.decision.strategy,
    kind,
    level: Math.max(1, s.decision.scaffoldingLevel),
    turn: m.reasoningPath.length,
    supportedSuccess: false,
    independentlyVerified: false,
  });
  m.assistanceLedger = m.assistanceLedger.slice(-40);
}
export function weakestPrerequisite(s: LearningSession, l: Learner) {
  const c = conceptById[s.question.conceptId];
  return c.prerequisites
    .map((id) => ({ id, score: l.states[id]?.masteryScore ?? 0.2 }))
    .sort((a, b) => a.score - b.score)[0]?.id;
}
export function descend(s: LearningSession, l: Learner) {
  const m = memoryFor(s),
    id = weakestPrerequisite(s, l);
  if (!id || m.returnStack.some((f) => f.skillId === id)) return false;
  m.returnStack.push({
    skillId: s.question.conceptId,
    question: s.question,
    state: s.state,
    step: s.step,
    strategy: s.decision.strategy,
  });
  s.question = getQuestion(id, ++m.responseOrdinal + 73);
  s.decision = chooseDecision(l, id);
  s.decision.strategy = "prerequisite_review";
  s.decision.strategyId = "prerequisite_review";
  s.decision.pedagogicalMove = "review_prerequisite";
  s.decision.scaffoldingLevel = 5;
  s.decision.reason = `Review ${conceptById[id].name} before returning to ${conceptById[m.returnStack[0].skillId].name}.`;
  s.state = "REMEDIATION";
  s.assistance = 2;
  s.feedback = null;
  m.hintLevel = 0;
  m.signals.confusion = 0;
  m.signals.supportSuccesses = 0;
  m.signals.attemptedStrategies = [];
  m.checkpoint = undefined;
  addAssistance(s, "prerequisite");
  return true;
}
export function returnFromPrerequisite(s: LearningSession, l: Learner) {
  const m = memoryFor(s),
    frame = m.returnStack.pop();
  if (!frame) return false;
  s.question = getQuestion(frame.skillId, ++m.responseOrdinal + 83);
  s.state = frame.state;
  s.step = frame.step;
  s.decision = chooseDecision(l, frame.skillId);
  s.decision.strategy = "guided_questioning";
  s.decision.strategyId = "guided_questioning";
  s.decision.pedagogicalMove = "explain";
  s.decision.scaffoldingLevel = 1;
  s.decision.personalization = `That foundation is clearer. Let’s return to ${conceptById[frame.skillId].name.toLowerCase()}.`;
  s.assistance = 1;
  s.feedback = null;
  m.hintLevel = 0;
  m.signals.confusion = 0;
  m.signals.supportSuccesses = 0;
  m.signals.attemptedStrategies = [];
  m.checkpoint = undefined;
  return true;
}
function checkpointPrompt(s: LearningSession) {
  const q = s.question,
    material = materialFor(
      q,
      getQuestion(q.conceptId, Number(q.id.split(":")[1] ?? 0) + 1),
    ),
    fraction =
      q.conceptId.includes("fraction") ||
      [
        "numerator",
        "denominator",
        "generate_equivalent",
        "common_denominators",
      ].includes(q.conceptId);
  switch (s.decision.strategy) {
    case "visual_fraction_model":
      return "What do you notice about the amounts in the model?";
    case "concrete_real_world_example":
    case "analogy":
    case "story_context":
      if (fraction)
        return "What stayed the same even when the number of pieces changed?";
      if (q.subject === "English")
        return q.responseType === "writing"
          ? "Which idea from the example could strengthen your own writing?"
          : "Which words in the text support your thinking?";
      if (q.subject === "Science")
        return "Which observation from the example helps explain what happened?";
      if (q.subject === "Social Studies")
        return "Which fact, place, or event from the example helps you decide?";
      return "Which quantity in the example matches the one you need to find?";
    case "worked_example":
    case "partial_worked_example":
    case "step_by_step_scaffold":
      return "What is the first step you would borrow from that example?";
    case "symbolic_first":
    case "pattern_discovery":
      return "What relationship or operation do you notice?";
    case "compare_contrast":
      return "What stays the same, and what changes?";
    case "error_analysis":
      return material.errorQuestion;
    case "diagram_first":
    case "guided_annotation":
    case "evidence_first":
      return "Which part of the visual gives you the strongest clue?";
    case "manipulative":
      return "What changes when you move or regroup the objects?";
    case "simplified_case":
    case "progressive_complexity":
      return "What first step would you take in this smaller case?";
    default:
      return "What is one useful thing you notice in this new approach?";
  }
}
export function applySupport(
  s: LearningSession,
  l: Learner,
  child: Child,
  kind: "hint" | "another" | "easier" | "show",
  allowDescent = true,
) {
  const m = memoryFor(s),
    signals = m.signals,
    previous = s.decision.strategy,
    concept = conceptById[s.question.conceptId];
  const supportKey = s.question.assessmentKey ?? s.question.prompt;
  if (m.usedSupportPlans?.questionId !== supportKey)
    m.usedSupportPlans = { questionId: supportKey, ids: [] };
  const ranked = rankStrategies({
    learner: l,
    subject: concept.subject,
    domain: concept.domain,
    current: previous,
    signals,
    question: s.question,
    mastery: l.states[concept.id]?.masteryScore ?? 0.25,
    age: child.age,
  });
  const plan = selectSupportPlan(
    supportPlans(
      s.question,
      getQuestion(
        s.question.conceptId,
        Number(s.question.id.split(":")[1] ?? 0) + 1,
      ),
    ).filter(
      (p) =>
        kind === "hint" ||
        (p.strategy !== previous && !signals.strategyFailures[p.strategy]),
    ),
    m.usedSupportPlans.ids,
    kind === "show",
    ranked.map((strategy) => strategy.id),
  );
  if (kind !== "hint") {
    m.usedSupportPlans.ids = [...m.usedSupportPlans.ids, plan.id].slice(-12);
    m.supportPlan = { ...plan, questionId: s.question.id };
  } else m.supportPlan = undefined;
  if (kind === "hint") {
    m.hintLevel = Math.min(7, m.hintLevel + 1);
    signals.hintCount++;
    m.hintHistory.push({
      questionId: s.question.id,
      skillId: concept.id,
      level: m.hintLevel,
      type: [
        "attention",
        "guiding_question",
        "strategy",
        "visual",
        "partial_step",
        "parallel_example",
        "prerequisite",
      ][m.hintLevel - 1],
    });
    s.assistance = m.hintLevel;
    s.decision.scaffoldingLevel = Math.min(5, m.hintLevel);
    s.decision.pedagogicalMove = supportMove(kind, m.hintLevel);
    addAssistance(s, m.hintLevel >= 4 ? "worked_example" : "hint");
    if (m.hintLevel === 7 && descend(s, l))
      return {
        previous,
        next: s.decision.strategy,
        descended: true,
        reason: s.decision.reason,
      };
    return {
      previous,
      next: previous,
      descended: false,
      reason: `Progressive hint ${m.hintLevel}; the target answer stays unrevealed.`,
    };
  }
  signals.confusion += kind === "show" ? 0 : 1;
  signals.frustration = Math.min(
    5,
    signals.frustration + (kind === "show" ? 0 : 1),
  );
  if (kind !== "show") {
    m.attempts.push({
      questionId: s.question.id,
      skillId: concept.id,
      strategyId: previous,
      timestamp: new Date().toISOString(),
      studentResponse: m.lastUtterance ?? "Requested another approach",
      outcome: "confused",
      understandingDelta: 0,
      assistanceLevel: s.assistance,
    });
    m.attempts = m.attempts.slice(-40);
    signals.strategyFailures[previous] =
      (signals.strategyFailures[previous] ?? 0) + 1;
    const index = l.strategies.findIndex(
      (e) =>
        e.strategyId === previous &&
        e.conceptDomain === concept.domain &&
        (!e.subject || e.subject === concept.subject),
    );
    const ev = updateStrategy(
      index < 0 ? undefined : l.strategies[index],
      child.id,
      previous,
      concept.domain,
      false,
      -0.01,
      new Date(),
      concept.subject,
      concept.id,
    );
    if (index < 0) l.strategies.push(ev);
    else l.strategies[index] = ev;
  }
  if (!signals.attemptedStrategies.includes(previous))
    signals.attemptedStrategies.push(previous);
  if (
    allowDescent &&
    (signals.confusion >= 3 || kind === "easier") &&
    descend(s, l)
  )
    return {
      previous,
      next: s.decision.strategy,
      descended: true,
      reason: s.decision.reason,
    };
  const selected = ranked.find((x) => x.id === plan.strategy);
  s.decision.strategy = plan.strategy;
  s.decision.strategyId = s.decision.strategy;
  s.decision.pedagogicalMove = supportMove(kind, m.hintLevel);
  s.decision.scaffoldingLevel = selected?.support ?? 1;
  s.assistance = Math.min(2, Math.max(1, s.decision.scaffoldingLevel));
  s.decision.reason =
    selected?.reason ?? "Use an unused explanation grounded in this question.";
  s.decision.personalization =
    "That approach wasn’t helping. Let’s change how we look at it.";
  m.hintLevel = 0;
  if (kind === "easier") {
    s.question = getQuestion(s.question.conceptId, 0);
    s.decision.strategy = "simplified_case";
    s.decision.strategyId = "simplified_case";
    s.decision.pedagogicalMove = "worked_example";
  }
  m.checkpoint = {
    questionId: s.question.id,
    strategy: s.decision.strategy,
    prompt:
      m.supportPlan?.questionId === s.question.id
        ? plan.prompt
        : checkpointPrompt(s),
  };
  addAssistance(
    s,
    kind === "show"
      ? "visual"
      : kind === "easier"
        ? "worked_example"
        : "representation",
  );
  return {
    previous,
    next: s.decision.strategy,
    descended: false,
    reason: s.decision.reason,
  };
}
export function spokenTeaching(s: LearningSession) {
  const m = memoryFor(s),
    q = s.question,
    example = getQuestion(q.conceptId, Number(q.id.split(":")[1] ?? 0) + 1),
    material = materialFor(q, example);
  let visuals: Visual[] = [],
    message = "";
  if (m.hintLevel) {
    message = [
      s.decision.strengthToLeverage
        ? `Use what you know about ${conceptById[s.decision.strengthToLeverage].name.toLowerCase()}. Which relationship could help here?`
        : s.decision.strategy === "visual_fraction_model"
          ? "Look at the model. Compare the whole before counting its parts."
          : `${material.attention} What do you notice there?`,
      s.decision.strategy === "symbolic_first"
        ? "Which operation connects the old number to the new number?"
        : material.guidingQuestion,
      material.strategyHint,
      `Look at the parallel model. ${material.guidingQuestion}`,
      material.partialStep,
      material.workedSupport,
      "Let’s rebuild a smaller idea first.",
    ][m.hintLevel - 1];
    if (m.hintLevel >= 4) visuals = example.visuals;
  } else
    switch (s.decision.strategy) {
      case "visual_fraction_model":
        message =
          "Look at these equal-sized wholes. What do you notice about the amounts?";
        visuals = q.visuals;
        break;
      case "symbolic_first":
        message =
          "Let’s use the number relationship. Which operation connects these quantities?";
        break;
      case "concrete_real_world_example":
      case "analogy":
        message = material.analogy;
        visuals = q.visuals;
        break;
      case "worked_example":
        message = material.workedSupport;
        visuals = example.visuals;
        break;
      case "partial_worked_example":
        message = material.partialStep;
        visuals = example.visuals;
        break;
      case "concrete_to_abstract":
        message = `${material.analogy} How could you draw that idea, then write it using symbols?`;
        visuals = example.visuals;
        break;
      case "example_non_example":
        message = `Compare a useful example with an error. ${material.errorExample} ${material.errorQuestion}`;
        visuals = [
          { type: "passage", text: example.explanation, highlights: [] },
        ];
        break;
      case "compare_contrast":
        message =
          "Compare the two cases. What stays the same, and what changes?";
        visuals = q.visuals.length
          ? q.visuals
          : [
              {
                type: "passage",
                text: `Case A: ${q.prompt}\nCase B: ${example.prompt}`,
                highlights: [],
              },
            ];
        break;
      case "error_analysis":
        message = `${material.errorExample} ${material.errorQuestion}`;
        break;
      case "teach_back":
        message = "Explain it in your own words. What makes your idea work?";
        break;
      case "prerequisite_review":
        message = `Let’s check ${conceptById[q.conceptId].name.toLowerCase()} first. We’ll come back to the bigger idea.`;
        visuals = q.visuals;
        break;
      case "simplified_case":
        message = "Let’s start with a smaller case. Take just one step.";
        visuals = q.visuals;
        break;
      case "progressive_complexity":
        message = "Start with the part you know. Then add one more step.";
        break;
      case "manipulative":
        message =
          "Try moving or selecting the objects. What changes when you regroup them?";
        visuals = q.visuals.length
          ? q.visuals
          : [
              {
                type: "manipulative",
                total: 8,
                label: "Explore equal groups. Count the objects you select.",
              },
            ];
        break;
      case "story_context":
        message = material.analogy;
        break;
      case "diagram_first":
        message =
          "Look at the connections in this diagram. What happens first?";
        visuals = q.visuals.length
          ? q.visuals
          : [
              {
                type: "diagram",
                title: conceptById[q.conceptId].name,
                nodes: ["Observe", "Predict", "Check evidence"],
                links: [
                  [0, 1],
                  [1, 2],
                ],
              },
            ];
        break;
      case "evidence_first":
      case "guided_annotation":
        message =
          "Point to a detail that supports your thinking. What does that detail tell us?";
        visuals = [{ type: "passage", text: q.prompt, highlights: [] }];
        break;
      case "retrieval_practice":
        message = "Think back to what you learned. Try this without the model.";
        break;
      case "transfer_problem":
        message =
          "This is a new setting for the same idea. How could you use what you know?";
        break;
      case "pattern_discovery":
        message = `Look for what repeats. ${material.attention}`;
        break;
      default:
        message = material.guidingQuestion;
    }
  if (
    s.assistance === 0 &&
    [
      "WARMUP",
      "DIAGNOSTIC",
      "PROBE",
      "INDEPENDENT_PRACTICE",
      "MASTERY_CHECK",
    ].includes(s.state)
  ) {
    message = "Let’s see what you think. Take your time.";
    visuals =
      [
        "fraction_meaning",
        "fraction_number_line",
        "numerator",
        "denominator",
        "equal_parts",
      ].includes(q.conceptId) || q.conceptId.endsWith("_fractions")
        ? q.visuals
        : q.visuals.filter((v) =>
            ["table", "map", "timeline", "passage"].includes(v.type),
          );
  }
  // A support plan is an item-grounded contract between speech and canvas.
  // Do not attach a generic diagram or unrelated example to this explanation.
  const grounded =
    m.supportPlan?.questionId === q.id && s.assistance > 0
      ? m.supportPlan
      : undefined;
  if (grounded) {
    message = `${grounded.message} ${grounded.prompt}`;
    visuals = grounded.visuals;
  }
  const cues: CanvasCue[] = [
    {
      id: "model",
      atWord: 0,
      action: visuals.length ? "show" : "clear",
      visuals,
      label: conceptById[q.conceptId].name,
    },
    {
      id: "question",
      atWord: message.split(/\s+/).length,
      action: "question",
      visuals: [],
      label: m.checkpoint?.prompt ?? q.prompt,
    },
  ];
  if (visuals.length)
    cues.splice(1, 0, {
      id: "focus",
      atWord: Math.min(6, message.split(/\s+/).length - 1),
      action: "highlight",
      visuals: [],
      label: "Look here",
      highlight: material.attention,
    });
  let canvasActions = visualActionSequence(
    visuals,
    m.hintLevel >= 6 ||
      ["worked_example", "partial_worked_example"].includes(
        s.decision.strategy,
      ),
  );
  if (
    !grounded &&
    s.question.conceptId === "equivalent_fractions" &&
    s.decision.strategy === "visual_fraction_model" &&
    s.assistance > 0 &&
    !m.hintLevel
  ) {
    const d = s.question.prompt.includes("1/3") ? 2 : 3;
    message = `Try a different example: one of ${d} equal parts is colored. Now split every part in two. There are ${d * 2} parts, with two colored. The amount stays the same. What changed, and what stayed the same?`;
    const actions = fractionSequence(1, d);
    canvasActions = actions;
    cues.splice(
      0,
      cues.length,
      ...actions.map((action) => ({
        id: action.type === "clearTutorLayer" ? "clear" : action.id,
        atWord: action.atWord,
        action:
          action.type === "showFractionBar"
            ? ("show" as const)
            : ("highlight" as const),
        visuals:
          action.type === "showFractionBar"
            ? [
                {
                  type: "fraction_bar" as const,
                  numerator: action.numerator,
                  denominator: action.denominator,
                },
              ]
            : [],
        label: "Parallel example",
        highlight: action.type === "addText" ? action.text : undefined,
      })),
      {
        id: "question",
        atWord: 35,
        action: "question",
        visuals: [],
        label: m.checkpoint?.prompt ?? s.question.prompt,
      },
    );
    visuals = [{ type: "fraction_bar", numerator: 1, denominator: d }];
  }
  return {
    message,
    visuals,
    cues,
    actions: canvasActions,
  };
}
