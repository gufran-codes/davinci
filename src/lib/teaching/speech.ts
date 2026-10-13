import type { Strategy, Subject } from "../types";
import { tutorSpeechBudget } from "./response-budget";

// Catch verbal padding separately from whole-turn similarity: the task after
// the opener changes on every successful answer, hiding a repeated catchphrase.
const stockTransition =
  /\b(?:let['’]s build on (?:it|that|this)|let['’]s pause on one idea|let['’]s see what you think|here['’]s one small step|we can look at it another way|(?:let['’]s )?see what['’]?s changed)\b/i;
export function dialogueStyleChecks(
  speech: string,
  recent: string[],
  requiredQuestion?: string,
) {
  const checks: string[] = [];
  // A curriculum question is not a conversational opener; preserve it exactly.
  const preamble =
    requiredQuestion && speech.includes(requiredQuestion)
      ? speech.slice(0, speech.indexOf(requiredQuestion))
      : speech;
  if (stockTransition.test(preamble)) checks.push("stock_transition");
  const opening = (text: string) => {
    const first = text
      .split(/[.!?]/)[0]
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim();
    // Do not reject recurring subject vocabulary or short acknowledgements.
    if (
      !/^(?:lets|that|you|we|great|good|nice|okay|alright|heres|take|thanks)\b/.test(
        first,
      )
    )
      return "";
    const words = first.split(/\s+/);
    return words.length >= 4 ? words.slice(0, 6).join(" ") : "";
  };
  const lead = opening(preamble);
  if (lead && recent.some((text) => opening(text) === lead))
    checks.push("repeated_opening");
  return checks;
}

export function tutorWordLimit(intent: string, utterance = "", mode?: string) {
  return tutorSpeechBudget({ intent, utterance, mode }).maxWords;
}

export interface TutorSpeechProfile {
  ageDirection: string;
  strategyDirection: string;
  turnShape: string;
  tone: string;
  avoid: string[];
}

const strategyDirections: Record<Strategy, string> = {
  symbolic_first:
    "Use precise mathematical or subject language and make the key relationship explicit.",
  visual_fraction_model:
    "Use spatial language and direct attention to one meaningful feature of the visual.",
  guided_questioning:
    "Sound curious and ask one open question that leaves the important reasoning to the learner.",
  concrete_real_world_example:
    "Ground the idea in one short, familiar situation before reconnecting it to the task.",
  worked_example:
    "Narrate only the next worked step, explain why it is valid, and then hand the next move back.",
  pattern_discovery:
    "Invite the learner to notice and name a pattern instead of announcing the rule.",
  prerequisite_review:
    "Reassure the learner that you are checking one useful building block, then focus on that foundation.",
  step_by_step_scaffold:
    "Give exactly one manageable step and pause for the learner to do the next piece.",
  partial_worked_example:
    "Complete the beginning of the reasoning only, then ask the learner to continue it.",
  analogy:
    "Use one compact analogy and state the exact connection the learner should examine.",
  compare_contrast:
    "Place two cases side by side and ask the learner to identify the difference that matters.",
  error_analysis:
    "Treat the error as useful evidence and invite the learner to locate or repair one specific step.",
  teach_back:
    "Invite the learner to teach the idea back in their own words; sound interested rather than evaluative.",
  simplified_case:
    "Use a smaller or cleaner version of the same relationship, without changing the learning goal.",
  progressive_complexity:
    "Connect the current step to the previous success and add only one new complication.",
  manipulative:
    "Use action words such as move, group, split, or combine and direct one concrete action.",
  story_context:
    "Use a brief relevant situation, then explicitly connect its quantities or evidence to the task.",
  diagram_first:
    "Start with what the diagram shows and ask the learner to interpret one relationship in it.",
  evidence_first:
    "Point to the relevant evidence before asking for a claim or conclusion.",
  guided_annotation:
    "Direct the learner to mark one useful word, detail, quantity, or relationship and explain why it matters.",
  retrieval_practice:
    "Prompt recall with minimal help and allow a quiet, confident pause for the learner to answer.",
  transfer_problem:
    "Make the new context feel like a challenge and ask which known idea still applies.",
  example_non_example:
    "Contrast an example with a non-example and ask which defining feature separates them.",
  concrete_to_abstract:
    "Name the concrete action first, then connect it directly to the symbol or academic term.",
};

export function tutorSpeechProfile(input: {
  strategy: Strategy;
  subject: Subject;
  grade: number;
  intent: string;
  teachingMove?: string;
  cognitiveLoad?: string;
}): TutorSpeechProfile {
  const younger = input.grade <= 3;
  const shapeByLoad: Record<string, string> = {
    independent:
      "Ask the policy-approved question without adding help. A brief acknowledgement is optional; do not add a motivational preamble.",
    focusing:
      "React to the learner and focus on one feature. Ask a question only when the response plan calls for one.",
    guided:
      "Offer one useful clue. Add at most one next-step question when permitted by the response plan.",
    explicit:
      "Explain one small step plainly, say why it helps, and give the learner a clear next move.",
  };
  return {
    ageDirection: younger
      ? "Use familiar words, short clauses, and concrete verbs appropriate for an early elementary learner."
      : "Use natural school-age language without sounding babyish or overly formal.",
    strategyDirection: strategyDirections[input.strategy],
    turnShape: ["why", "define"].includes(input.intent)
      ? "Answer the actual question directly, using the response plan's speech budget. A definition usually needs only one or two sentences. Do not turn the explanation into another quiz."
      : input.teachingMove === "acknowledge_and_advance"
        ? "Briefly confirm the checked answer, then ask the new required question. Do not infer the student's reasoning or demand an explanation."
        : (shapeByLoad[input.cognitiveLoad ?? ""] ??
          "Respond directly, make one teaching move, and leave a clear turn for the learner."),
    tone:
      input.intent === "confused" || input.intent === "feedback"
        ? "Calm, responsive, and matter-of-fact; acknowledge the difficulty without generic praise."
        : input.teachingMove === "independent_retest"
          ? "Warm and confident, with minimal coaching."
          : `Conversational and attentive for ${input.subject}; vary the opening from recent tutor turns.`,
    avoid: [
      "generic praise such as good job or great thinking",
      "repeating the whole problem when it is already visible",
      "announcing the strategy by name",
      "asking more than one question",
      "using the same opening as the previous tutor turn",
      "stock transitions such as let's build on it, let's pause on one idea, or here's one small step",
      "adding a question to every response, including a definition or a social acknowledgement",
    ],
  };
}
