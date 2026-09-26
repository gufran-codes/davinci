import { LearningSession, TutorContent } from "./types";
export function authoredContent(session: LearningSession): TutorContent {
  const { question: q, decision: d, state } = session;
  const independent =
    ["INDEPENDENT_PRACTICE", "MASTERY_CHECK", "DIAGNOSTIC"].includes(state) &&
    session.assistance === 0;
  let message = "What do you notice? Take your time.";
  let ui = q.visuals;
  if (
    d.nextAssessmentType === "teachback" &&
    ["MASTERY_CHECK", "INDEPENDENT_PRACTICE"].includes(state) &&
    session.assistance === 0
  ) {
    message =
      "You’ve got this. Can you teach it back — explain it in your own words?";
    ui = [];
  } else if (independent) {
    message = "Your turn. Try this one on your own.";
    ui = [
      "fraction_meaning",
      "fraction_number_line",
      "numerator",
      "denominator",
      "equal_parts",
    ].includes(q.conceptId)
      ? q.visuals
      : [];
  } else
    switch (d.strategy) {
      case "visual_fraction_model":
        message =
          "Let’s look at the amount first. What do the equal parts show?";
        break;
      case "symbolic_first":
        message =
          q.subject === "English"
            ? "Look at the exact words. What do they tell you?"
            : q.subject === "Science"
              ? "Look at what changed. What caused it?"
              : q.subject === "Social Studies"
                ? "Look at the details. What do they show?"
                : "Look at the numbers. What relationship can you use?";
        ui = [];
        break;
      case "concrete_real_world_example":
        message = q.concrete;
        ui = [];
        break;
      case "worked_example":
        message = `Here’s a way to think about this: ${q.explanation}`;
        break;
      case "guided_questioning":
        message = q.hint;
        ui = [];
        break;
      case "pattern_discovery":
        message = `Look for a pattern. ${q.hint}`;
        ui = [];
        break;
      case "prerequisite_review":
        message =
          "Let’s check a building block first. What do you already know?";
        break;
      case "step_by_step_scaffold":
        message = q.hint;
        break;
    }
  return {
    message,
    ui,
    pedagogicalIntent: d.objective,
    expectedResponseType: q.choices
      ? "choice"
      : q.subject === "Math"
        ? "math"
        : "text",
  };
}
