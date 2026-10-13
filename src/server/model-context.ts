import type {
  ConversationInterpreter,
  ConversationSpeaker,
} from "./understanding";
import type { TeachingState } from "../lib/types";

function dialogueContext(state: TeachingState) {
  const academic = state.academicContext ?? {};
  const memory = academic.dialogueMemory as
    | {
        preference?: string;
        responseDepth?: string;
        activeGapId?: string;
        gaps?: {
          id: string;
          description: string;
          understood?: string;
          status: string;
          question: { id: string; prompt: string };
        }[];
      }
    | undefined;
  return (
    memory && {
      preference: memory.preference,
      responseDepth: memory.responseDepth,
      activeGapId: memory.activeGapId,
      gaps: memory.gaps?.map((g) => ({
        id: g.id,
        description: g.description,
        understood: g.understood,
        status: g.status,
        question: { id: g.question.id, prompt: g.question.prompt },
      })),
    }
  );
}

/** Extraction needs the student's referents, not the answer key, mastery ledger,
 * diagram payloads, full lesson or repeated response plans. */
export function interpreterContext(
  input: Parameters<ConversationInterpreter["understand"]>[0],
) {
  const academic = input.state.academicContext ?? {};
  return {
    transcript: input.transcript,
    question: input.question,
    choices: input.choices,
    state: {
      student: input.state.student,
      subject: input.state.subject,
      targetSkill: input.state.targetSkill,
      academicContext: {
        dialogueFocus: academic.dialogueFocus,
        choiceLabels: academic.choiceLabels,
        dialogueMemory: dialogueContext(input.state),
      },
    },
    history: input.history.slice(-4).map((t) => ({
      student: t.student_transcript,
      tutorDelivered: t.spoken_tutor_text,
    })),
  };
}

/** Keep authoritative lesson content and guardrails once, not nested again in
 * state.responsePlan, dialogueMemory.plan and approvedDraft. */
export function speakerContext(
  input: Parameters<ConversationSpeaker["render"]>[0],
) {
  const academic = { ...input.state.academicContext };
  for (const key of [
    "responsePlan",
    "activeTask",
    "studentInputTask",
    "interpretedUtterance",
    "dialogueFocus",
    "question",
    "choices",
    "choiceLabels",
    "choiceMode",
    "expectedAnswer",
    "acceptableAnswers",
    "recentTutorTurns",
    "whiteboard",
    "workingMemory",
    "teachingAttempts",
    "hintHistory",
  ])
    delete academic[key];
  academic.dialogueMemory = dialogueContext(input.state);
  const plan = input.responsePlan && { ...input.responsePlan };
  if (plan) plan.approvedDraft = ""; // The draft is already a top-level field.
  return {
    ...input,
    responsePlan: plan,
    state: {
      student: input.state.student,
      subject: input.state.subject,
      selectedStrategy: input.state.selectedStrategy,
      interactionRule: input.state.interactionRule,
      independentCheckPending: input.state.independentCheckPending,
      academicContext: academic,
    },
    recentDialogue: input.recentDialogue?.slice(-4).map((t) => ({
      student: t.student_transcript,
      tutorDelivered: t.spoken_tutor_text,
    })),
  };
}
