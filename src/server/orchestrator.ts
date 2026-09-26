import {
  applySupport,
  memoryFor,
  returnFromPrerequisite,
} from "../lib/teaching/adaptive";
import { randomUUID } from "node:crypto";
import { conceptById, getQuestion } from "../lib/curriculum";
import {
  chooseDecision,
  deriveInsight,
  diagnosticNext,
  diagnosticStart,
  initialState,
  planLesson,
  updateMastery,
  updateMisconception,
  updateStrategy,
} from "../lib/learning";
import { assessStudentResponse } from "../lib/education";
import { Child, Learner, LearningSession, Phase, Subject } from "../lib/types";
import { run, transaction } from "./db";
import {
  event,
  HttpError,
  learnerFor,
  now,
  recordLearningMemory,
  saveLearner,
  saveSession,
  sessionById,
  sessionsFor,
} from "./repository";
import { questionKey } from "./learning-controls";
import { analytics } from "./analytics";
const lessonPhases: Phase[] = [
  "WARMUP",
  "DIAGNOSTIC",
  "PROBE",
  "TEACH",
  "GUIDED_PRACTICE",
  "GUIDED_PRACTICE",
  "INDEPENDENT_PRACTICE",
  "MASTERY_CHECK",
  "MASTERY_CHECK",
  "SESSION_REVIEW",
];
function assistanceFor(s: LearningSession) {
  if (!["TEACH", "GUIDED_PRACTICE", "REMEDIATION"].includes(s.state)) return 0;
  return s.decision.scaffoldingLevel === 0
    ? 0
    : s.decision.scaffoldingLevel >= 3
      ? 2
      : 1;
}
function questionEvent(s: LearningSession) {
  const memory = memoryFor(s);
  memory.goal = {
    skillId: s.question.conceptId,
    objective: s.decision.objective,
    successCriteria:
      "Explain the idea and solve a fresh problem independently.",
    nextMove: memory.activeIndependentCheck
      ? "Check the same skill independently with a fresh problem."
      : s.assistance === 0
        ? "Observe the learner’s independent reasoning."
        : "Use the smallest useful scaffold, then return the thinking to the learner.",
  };
  event(s, "concept_selected", { conceptId: s.question.conceptId });
  event(s, "strategy_selected", {
    strategy: s.decision.strategy,
    reason: s.decision.reason,
  });
  event(s, "question_asked", { questionId: s.question.id });
  if (s.state === "PROBE")
    event(s, "probe_asked", { conceptId: s.question.conceptId });
  if (s.decision.nextAssessmentType === "teachback")
    event(s, "teachback_offered", { questionId: s.question.id });
  if (s.assistance > 0) {
    event(s, "explanation_shown", { strategy: s.decision.strategy });
    if (s.decision.strategy === "visual_fraction_model")
      event(s, "visual_shown", {
        components: s.question.visuals.map((v) => v.type),
      });
  }
}
export function startSession(
  child: Child,
  kind: LearningSession["kind"],
  target?: string,
  homeworkId?: string,
  subject?: Subject,
): LearningSession {
  return transaction(() => {
    const active = sessionsFor(child.id).find((s) => !s.completedAt);
    if (active) return active;
    const learner = learnerFor(child.id),
      plan = planLesson(child, learner, new Date(), subject);
    if (kind === "diagnostic")
      plan.targetConcept = diagnosticStart(child.grade, subject);
    if (target) {
      const selected = conceptById[target];
      if (
        !selected ||
        selected.gradeBand[0] > child.grade ||
        selected.gradeBand[1] < child.grade
      )
        throw new HttpError(
          400,
          `Choose a skill from Grade ${child.grade}. Foundation review is selected by your tutor when needed.`,
        );
      plan.targetConcept = target;
      plan.warmupConcept = target;
    }
    const first =
      kind === "diagnostic" ? plan.targetConcept : plan.warmupConcept;
    const s: LearningSession = {
      id: randomUUID(),
      childId: child.id,
      kind,
      state: kind === "diagnostic" ? "DIAGNOSTIC" : "WARMUP",
      step: 0,
      version: 0,
      plan,
      decision: chooseDecision(learner, plan.targetConcept),
      question: getQuestion(first, sessionsFor(child.id).length * 11),
      assistance: 0,
      failures: 0,
      successes: 0,
      answeredConcepts: [],
      startedAt: now(),
      completedAt: null,
      correct: 0,
      attempts: 0,
      feedback: null,
      homeworkId,
    };
    saveSession(s);
    run("INSERT INTO lesson_plans VALUES(?,?)", s.id, JSON.stringify(plan));
    event(s, "session_started", { kind });
    questionEvent(s);
    analytics.track(
      child.parentId,
      kind === "diagnostic"
        ? "diagnostic_started"
        : sessionsFor(child.id).filter((x) => x.kind !== "diagnostic")
              .length === 1
          ? "first_session_started"
          : "session_started",
      { childId: child.id },
    );
    return s;
  });
}
export type SessionAction = {
  action:
    "answer" | "hint" | "another" | "continue" | "reflect" | "note" | "explain";
  version: number;
  answer?: string;
  reflection?: string;
  note?: string;
  confidence?: "guessing" | "pretty_sure" | "very_sure";
};
export function advanceSession(
  child: Child,
  id: string,
  input: SessionAction,
): LearningSession {
  return transaction(() => {
    const s = sessionById(id);
    if (s.childId !== child.id) throw new HttpError(404, "Lesson not found.");
    if (input.version !== s.version)
      throw new HttpError(
        409,
        "This lesson changed in another tab. Reload to continue.",
      );
    if (s.state === "COMPLETE") return s;
    const learner = learnerFor(child.id);
    s.version++;
    if (input.action === "reflect") {
      if (s.state !== "SESSION_REVIEW")
        throw new HttpError(409, "Finish your questions first.");
      s.reflection = input.reflection;
      s.state = "COMPLETE";
      s.completedAt = now();
      s.summary = summary(child, s, learner);
      recordLearningMemory(
        s,
        "summary",
        `${s.summary.workedOn}: ${s.summary.improved} ${s.summary.developing}`,
        {
          correct: s.correct,
          attempts: s.attempts,
          reflection: s.reflection,
          summary: s.summary,
        },
      );
      if (s.kind === "diagnostic")
        run("UPDATE children SET diagnostic_complete=1 WHERE id=?", child.id);
      saveSession(s);
      event(s, "session_completed", {
        correct: s.correct,
        attempts: s.attempts,
        reflection: s.reflection,
      });
      analytics.track(
        child.parentId,
        s.kind === "diagnostic"
          ? "diagnostic_completed"
          : sessionsFor(child.id).filter(
                (x) => x.completedAt && x.kind !== "diagnostic",
              ).length === 1
            ? "first_session_completed"
            : "session_completed",
        { childId: child.id },
      );
      return s;
    }
    if (s.state === "SESSION_REVIEW")
      throw new HttpError(409, "Choose how the lesson felt.");
    if (input.action === "hint" || input.action === "another") {
      if (s.feedback)
        throw new HttpError(409, "Continue to the next question first.");
      const change = applySupport(s, learner, child, input.action);
      event(
        s,
        input.action === "hint" ? "hint_requested" : "teach_another_way",
        { ...change, level: memoryFor(s).hintLevel },
      );
      if (input.action === "another") event(s, "strategy_changed", change);
      saveLearner(child.id, learner);
      saveSession(s);
      return s;
    }
    if (input.action === "note" || input.action === "explain") {
      const text = (input.note ?? "").trim();
      if (!text && !input.confidence)
        throw new HttpError(400, "Write a little something first.");
      if (input.action === "explain") {
        if (s.decision.nextAssessmentType !== "teachback")
          throw new HttpError(409, "Answer the question first.");
        event(s, "teachback_response", {
          questionId: s.question.id,
          words: text.split(/\s+/).filter(Boolean).length,
          note: text.slice(0, 500),
        });
      } else {
        if (input.confidence)
          event(s, "confidence_reported", {
            level: input.confidence,
            questionId: s.question.id,
          });
        if (text)
          event(s, "student_reasoning", {
            questionId: s.question.id,
            note: text.slice(0, 500),
          });
      }
      s.version++;
      saveSession(s);
      return s;
    }
    if (input.action === "answer") {
      if (s.feedback) throw new HttpError(409, "This answer is already saved.");
      const answer = input.answer ?? "";
      const accessMemory = memoryFor(s);
      if (accessMemory.revealedQuestions.includes(questionKey(s)))
        throw new HttpError(
          409,
          "This solution was shown. Continue to a fresh question to demonstrate understanding.",
        );
      if (!answer.trim()) throw new HttpError(400, "Try an answer first.");
      accessMemory.genuineAttempts[questionKey(s)] =
        (accessMemory.genuineAttempts[questionKey(s)] ?? 0) + 1;
      const correct = assessStudentResponse(s.question, answer),
        q = s.question,
        memory = memoryFor(s),
        independentCheck =
          memory.activeIndependentCheck?.questionId === q.id
            ? memory.activeIndependentCheck
            : undefined;
      const before =
        learner.states[q.conceptId] ?? initialState(child.id, q.conceptId);
      const after = updateMastery(
        before,
        correct,
        s.assistance,
        q.transfer,
        s.decision.strategy,
        q.id,
        s.id,
        new Date(),
        { confidence: memory.signals.confidence },
      );
      learner.states[q.conceptId] = after;
      memory.attempts.push({
        questionId: q.id,
        skillId: q.conceptId,
        strategyId: s.decision.strategy,
        timestamp: now(),
        studentResponse: answer.slice(0, 500),
        outcome: correct ? "correct" : "incorrect",
        understandingDelta: after.masteryScore - before.masteryScore,
        assistanceLevel: Math.max(s.assistance, memory.hintLevel),
      });
      memory.attempts = memory.attempts.slice(-40);
      for (const hint of memory.hintHistory)
        if (hint.questionId === q.id) hint.studentSucceededAfterHint = correct;
      const domain = conceptById[q.conceptId].domain,
        subject = conceptById[q.conceptId].subject,
        evidenceStrategy = independentCheck?.strategy ?? s.decision.strategy,
        index = learner.strategies.findIndex(
          (e) =>
            e.strategyId === evidenceStrategy &&
            e.conceptDomain === domain &&
            (!e.subject || e.subject === subject),
        );
      // Diagnostic sessions assess knowledge, not the success of an explanation.
      // Lesson probes use the selected strategy's representation, so their
      // outcomes count as strategy evidence too.
      if (
        s.kind !== "diagnostic" &&
        (s.assistance > 0 ||
          Boolean(independentCheck) ||
          s.state === "TEACH" ||
          s.state === "GUIDED_PRACTICE" ||
          s.state === "PROBE")
      ) {
        const ev = updateStrategy(
          index < 0 ? undefined : learner.strategies[index],
          child.id,
          evidenceStrategy,
          domain,
          correct,
          after.masteryScore - before.masteryScore,
          new Date(),
          subject,
          q.conceptId,
        );
        if (index < 0) learner.strategies.push(ev);
        else learner.strategies[index] = ev;
      }
      const option = q.options?.find(
        (option) =>
          option.content.toLowerCase() === answer.trim().toLowerCase(),
      );
      const diagnosticQuestion = option?.misconceptionId
        ? {
            ...q,
            misconception: {
              id: option.misconceptionId,
              answer: option.content,
            },
          }
        : q;
      const mi = learner.misconceptions.findIndex(
          (m) => m.id === diagnosticQuestion.misconception?.id,
        ),
        m = updateMisconception(
          mi < 0 ? undefined : learner.misconceptions[mi],
          child.id,
          diagnosticQuestion,
          answer,
        );
      if (m) {
        const prev = mi < 0 ? undefined : learner.misconceptions[mi];
        if (mi < 0) learner.misconceptions.push(m);
        else learner.misconceptions[mi] = m;
        if (m.status !== prev?.status || m.matches > (prev?.matches ?? 0)) {
          const lifecycleEvent =
            m.status === "confirmed"
              ? "misconception_confirmed"
              : m.status === "resolved"
                ? "misconception_resolved"
                : "misconception_suspected";
          event(s, lifecycleEvent, {
            id: m.id,
            confidence: m.confidence,
            evidenceCount: m.evidence.length,
          });
          recordLearningMemory(
            s,
            "misconception",
            `${m.id} is ${m.status} after ${m.checks} distinct checks.`,
            {
              misconceptionId: m.id,
              status: m.status,
              confidence: m.confidence,
              questionId: q.id,
            },
          );
        }
      }
      s.attempts++;
      if (correct) {
        s.correct++;
        s.successes++;
        s.failures = 0;
      } else {
        s.failures++;
        s.successes = 0;
      }
      s.answeredConcepts.push(q.conceptId);
      if (option?.diagnosticMeaning)
        event(s, "option_diagnosis", {
          questionId: q.id,
          option: option.id,
          meaning: option.diagnosticMeaning,
          misconceptionId: option.misconceptionId,
          status: "hypothesis",
        });
      s.feedback = correct
        ? "That’s right. What helped you decide?"
        : "That answer doesn’t fit yet. Let’s look at it another way.";
      recordLearningMemory(
        s,
        "assessment",
        `${correct ? "Correct" : "Incorrect"} ${q.transfer ? "transfer" : "practice"} response with assistance level ${s.assistance}.`,
        {
          questionId: q.id,
          correct,
          assistance: s.assistance,
          transfer: q.transfer,
          strategy: s.decision.strategy,
          masteryBefore: before.masteryScore,
          masteryAfter: after.masteryScore,
          outcome: after.evidence.at(-1)?.outcome,
        },
      );
      if (correct) {
        if (s.assistance === 0) memory.signals.independentSuccesses++;
        else memory.signals.supportSuccesses++;
        memory.signals.frustration = Math.max(
          0,
          memory.signals.frustration - 1,
        );
      }
      if (independentCheck) {
        event(s, "independent_check_result", {
          conceptId: q.conceptId,
          sourceQuestionId: independentCheck.sourceQuestionId,
          correct,
        });
        if (correct) {
          for (const entry of memory.assistanceLedger)
            if (
              entry.conceptId === q.conceptId &&
              entry.questionId === independentCheck.sourceQuestionId
            )
              entry.independentlyVerified = true;
        } else
          memory.pendingIndependentCheck = {
            ...independentCheck,
            dueAfterStep: s.step + 2,
            questionId: undefined,
          };
        memory.activeIndependentCheck = undefined;
      } else if (correct && s.assistance > 0) {
        const ledger = [...memory.assistanceLedger]
          .reverse()
          .find(
            (entry) =>
              entry.questionId === q.id && !entry.independentlyVerified,
          );
        if (ledger) ledger.supportedSuccess = true;
        memory.pendingIndependentCheck = {
          conceptId: q.conceptId,
          sourceQuestionId: q.id,
          strategy: s.decision.strategy,
          supportLevel: s.assistance,
          dueAfterStep: s.step + 1,
        };
        event(s, "independent_check_scheduled", {
          conceptId: q.conceptId,
          sourceQuestionId: q.id,
          afterStep: s.step + 1,
        });
      }

      run(
        "INSERT INTO practice_attempts VALUES(?,?,?,?,?,?,?,?,?,?)",
        randomUUID(),
        s.id,
        child.id,
        q.conceptId,
        q.id,
        correct ? 1 : 0,
        s.assistance,
        s.decision.strategy,
        correct
          ? s.assistance >= 2
            ? "correct_after_example"
            : s.assistance
              ? "correct_after_hint"
              : "correct_independently"
          : "incorrect",
        now(),
      );
      event(s, "answer_submitted", {
        questionId: q.id,
        assistance: s.assistance,
      });
      event(s, correct ? "answer_correct" : "answer_incorrect", {
        conceptId: q.conceptId,
      });
      event(s, "mastery_updated", {
        conceptId: q.conceptId,
        before: before.masteryScore,
        after: after.masteryScore,
        delta: after.masteryScore - before.masteryScore,
      });
      saveLearner(child.id, learner);
      saveSession(s);
      return s;
    }
    if (!s.feedback)
      throw new HttpError(409, "Try the question before continuing.");
    const wasCorrect =
      learner.states[s.question.conceptId]?.evidence.at(-1)?.correct === true;
    s.step++;
    s.feedback = null;
    s.assistance = 0;
    const memory = memoryFor(s);
    if (memory.returnStack.length && wasCorrect) {
      s.step--;
      returnFromPrerequisite(s, learner);
      saveSession(s);
      questionEvent(s);
      return s;
    }
    memory.hintLevel = 0;

    if (
      memory.pendingIndependentCheck &&
      s.step >= memory.pendingIndependentCheck.dueAfterStep
    ) {
      const check = memory.pendingIndependentCheck;
      s.state = "INDEPENDENT_PRACTICE";
      s.decision = chooseDecision(learner, check.conceptId);
      s.decision.strategy = "retrieval_practice";
      s.decision.strategyId = "retrieval_practice";
      s.decision.pedagogicalMove = "check_understanding";
      s.decision.scaffoldingLevel = 0;
      s.decision.difficulty = 3;
      s.decision.difficultyBand = "transfer";
      s.decision.reason =
        "Check whether supported learning transfers to a fresh problem without help.";
      s.question = getQuestion(
        check.conceptId,
        sessionsFor(child.id).length * 17 + ++memory.responseOrdinal + 97,
        true,
      );
      s.assistance = 0;
      memory.activeIndependentCheck = {
        ...check,
        questionId: s.question.id,
      };
      memory.pendingIndependentCheck = undefined;
      memory.goal.nextMove =
        "Check the same skill independently with a fresh problem.";
      saveSession(s);
      event(s, "independent_check_started", {
        conceptId: check.conceptId,
        sourceQuestionId: check.sourceQuestionId,
        questionId: s.question.id,
      });
      questionEvent(s);
      return s;
    }

    if (
      s.step >= lessonPhases.length - 1 ||
      Date.now() - Date.parse(s.startedAt) > 20 * 60 * 1000
    ) {
      s.state = "SESSION_REVIEW";
      saveSession(s);
      return s;
    }
    let target = s.plan.targetConcept;
    if (s.kind === "diagnostic") {
      s.state = "DIAGNOSTIC";
      target = diagnosticNext(
        s.question.conceptId,
        wasCorrect,
        s.answeredConcepts,
        child.grade,
      );
    } else {
      s.state = lessonPhases[s.step];
      if (s.step === 1 && s.plan.reviewConcept) target = s.plan.reviewConcept;
      if (lessonPhases[s.step] === "PROBE")
        target = s.decision.prerequisiteToProbe ?? s.plan.warmupConcept;
      if (s.failures >= 2 && s.step < 7) {
        const prerequisite = conceptById[target].prerequisites.find(
          (p) => (learner.states[p]?.masteryScore ?? 0) < 0.7,
        );
        if (prerequisite) {
          target = prerequisite;
          s.state = "REMEDIATION";
        }
      }
    }
    const decision = chooseDecision(
      learner,
      target,
      s.failures,
      (15 * 60 * 1000 - (Date.now() - Date.parse(s.startedAt))) / 60000,
    );
    // Preserve an explicitly chosen alternate through guided practice, then check independently.
    if (
      s.kind !== "diagnostic" &&
      s.step <= 4 &&
      s.step > 2 &&
      s.decision.strategy !== "prerequisite_review"
    ) {
      decision.strategy = s.decision.strategy;
      decision.strategyId = s.decision.strategy;
      decision.pedagogicalMove = s.decision.pedagogicalMove;
    }
    s.decision = decision;
    s.question = getQuestion(
      target,
      sessionsFor(child.id).length * 11 + s.step,
      ["INDEPENDENT_PRACTICE", "MASTERY_CHECK"].includes(s.state),
    );
    s.assistance = assistanceFor(s);
    saveSession(s);
    questionEvent(s);
    return s;
  });
}
function summary(child: Child, s: LearningSession, l: Learner) {
  const evidence = Object.values(l.states)
    .flatMap((x) => x.evidence)
    .filter((e) => e.sessionId === s.id);
  const independent = evidence.filter(
      (e) => e.correct && e.assistance === 0,
    ).length,
    assisted = evidence.filter((e) => e.correct && e.assistance > 0).length;
  const insight = deriveInsight(child, l);
  return {
    workedOn: conceptById[s.plan.targetConcept].name,
    improved: independent
      ? `${independent} questions answered independently${assisted ? `, with ${assisted} more supported successes` : ""}.`
      : "We found the places where a little more support could help.",
    developing: evidence.some((e) => !e.correct)
      ? "Some ideas still need another example and a fresh check."
      : "We’ll check again later to see what sticks.",
    noticed: insight.observation,
    next:
      s.kind === "homework"
        ? "Now try the original homework problem yourself."
        : s.kind === "diagnostic"
          ? `Start with ${conceptById[planLesson(child, l).targetConcept].name.toLowerCase()}.`
          : "Revisit this idea with less support, then check it again after a break.",
    parentAction: "Nothing needed from you today.",
  };
}
