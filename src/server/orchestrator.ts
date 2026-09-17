import { randomUUID } from "node:crypto";
import { conceptById, getQuestion } from "../lib/curriculum";
import {
  alternateStrategy,
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
import { gradeAnswer } from "../lib/math";
import { Child, Learner, LearningSession, Phase } from "../lib/types";
import { run, transaction } from "./db";
import {
  event,
  HttpError,
  learnerFor,
  now,
  saveLearner,
  saveSession,
  sessionById,
  sessionsFor,
} from "./repository";
import { analytics } from "./analytics";
const lessonPhases: Phase[] = [
  "WARMUP",
  "DIAGNOSTIC",
  "TEACH",
  "GUIDED_PRACTICE",
  "GUIDED_PRACTICE",
  "INDEPENDENT_PRACTICE",
  "MASTERY_CHECK",
  "MASTERY_CHECK",
  "SESSION_REVIEW",
];
function assistanceFor(s: LearningSession) {
  return ["TEACH", "GUIDED_PRACTICE", "REMEDIATION"].includes(s.state)
    ? s.decision.strategy === "worked_example"
      ? 2
      : 1
    : 0;
}
function questionEvent(s: LearningSession) {
  event(s, "concept_selected", { conceptId: s.question.conceptId });
  event(s, "strategy_selected", {
    strategy: s.decision.strategy,
    reason: s.decision.reason,
  });
  event(s, "question_asked", { questionId: s.question.id });
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
): LearningSession {
  return transaction(() => {
    const active = sessionsFor(child.id).find((s) => !s.completedAt);
    if (active) return active;
    const learner = learnerFor(child.id),
      plan = planLesson(child, learner);
    if (kind === "diagnostic")
      plan.targetConcept = diagnosticStart(child.grade);
    if (target) plan.targetConcept = target;
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
  action: "answer" | "hint" | "another" | "continue" | "reflect";
  version: number;
  answer?: string;
  reflection?: string;
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
      if (input.action === "hint") {
        s.assistance = Math.min(2, s.assistance + 1);
        event(s, "hint_requested", { level: s.assistance });
      } else {
        const previous = s.decision.strategy;
        s.decision.strategy = alternateStrategy(previous);
        s.assistance =
          s.decision.strategy === "worked_example"
            ? 2
            : Math.max(1, s.assistance);
        event(s, "teach_another_way", {
          previous,
          newStrategy: s.decision.strategy,
        });
        event(s, "strategy_changed", {
          previous,
          newStrategy: s.decision.strategy,
        });
        event(s, "explanation_shown", { strategy: s.decision.strategy });
        if (s.decision.strategy === "visual_fraction_model")
          event(s, "visual_shown", {
            components: s.question.visuals.map((v) => v.type),
          });
      }
      saveSession(s);
      return s;
    }
    if (input.action === "answer") {
      if (s.feedback) throw new HttpError(409, "This answer is already saved.");
      const answer = input.answer ?? "";
      const correct = gradeAnswer(answer, s.question.answer, s.question.exact),
        q = s.question;
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
      );
      learner.states[q.conceptId] = after;
      const domain = conceptById[q.conceptId].domain,
        index = learner.strategies.findIndex(
          (e) =>
            e.strategyId === s.decision.strategy && e.conceptDomain === domain,
        );
      // Diagnostic and unsupported recall assess knowledge, not the success of an explanation.
      if (
        s.kind !== "diagnostic" &&
        (s.assistance > 0 ||
          s.state === "TEACH" ||
          s.state === "GUIDED_PRACTICE")
      ) {
        const ev = updateStrategy(
          index < 0 ? undefined : learner.strategies[index],
          child.id,
          s.decision.strategy,
          domain,
          correct,
          after.masteryScore - before.masteryScore,
        );
        if (index < 0) learner.strategies.push(ev);
        else learner.strategies[index] = ev;
      }
      const mi = learner.misconceptions.findIndex(
          (m) => m.id === q.misconception?.id,
        ),
        m = updateMisconception(
          mi < 0 ? undefined : learner.misconceptions[mi],
          child.id,
          q,
          answer,
        );
      if (m) {
        const prev = mi < 0 ? undefined : learner.misconceptions[mi];
        if (mi < 0) learner.misconceptions.push(m);
        else learner.misconceptions[mi] = m;
        if (m.matches > (prev?.matches ?? 0))
          event(
            s,
            m.confirmed
              ? "misconception_confirmed"
              : "misconception_hypothesized",
            { id: m.id, confidence: m.confidence },
          );
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
      s.feedback = correct
        ? "That’s right. You found it!"
        : `Good try. ${q.explanation}`;
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
    const wasCorrect = s.feedback.startsWith("That");
    s.step++;
    s.feedback = null;
    s.assistance = 0;
    if (s.step >= 8 || Date.now() - Date.parse(s.startedAt) > 20 * 60 * 1000) {
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
      if (s.failures >= 2 && s.step < 6) {
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
    )
      decision.strategy = s.decision.strategy;
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
