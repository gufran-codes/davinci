import type { Strategy, Subject } from "../types";

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
      "Acknowledge the learner briefly, then ask the policy-approved question without adding help.",
    focusing:
      "React to what the learner just communicated, focus attention on one feature, and end with one question.",
    guided:
      "Offer one useful clue or connection, then end with one answerable next-step question.",
    explicit:
      "Explain one small step plainly, say why it helps, and give the learner a clear next move.",
  };
  return {
    ageDirection: younger
      ? "Use familiar words, short clauses, and concrete verbs appropriate for an early elementary learner."
      : "Use natural school-age language without sounding babyish or overly formal.",
    strategyDirection: strategyDirections[input.strategy],
    turnShape:
      shapeByLoad[input.cognitiveLoad ?? ""] ??
      "Respond directly, make one teaching move, and leave a clear turn for the learner.",
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
    ],
  };
}
