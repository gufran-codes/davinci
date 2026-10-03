import type { Phase, Question, Strategy, Visual } from "../types";
export type ConversationIntent =
  | "reveal"
  | "answer"
  | "confused"
  | "hint"
  | "show"
  | "why"
  | "define"
  | "easier"
  | "wait"
  | "resume"
  | "repeat"
  | "reasoning"
  | "confidence"
  | "correction"
  | "rapport"
  | "feedback"
  | "finish" // Legacy persisted intent. New stopping commands use end_session.
  | "end_session"
  | "reflection"
  | "off_topic";
export interface ConversationSignals {
  confusion: number;
  frustration: number;
  confidence: "unknown" | "low" | "medium" | "high";
  hintCount: number;
  paceMs: number;
  lastResponseAt?: string;
  attemptedStrategies: Strategy[];
  strategyFailures: Partial<Record<Strategy, number>>;
  supportSuccesses: number;
  independentSuccesses: number;
}
export interface ReviewFrame {
  skillId: string;
  question: Question;
  state: Phase;
  step: number;
  strategy: Strategy;
}
export interface TeachingCheckpoint {
  questionId: string;
  strategy: Strategy;
  prompt: string;
}
export type AssistanceKind =
  | "focus"
  | "hint"
  | "visual"
  | "representation"
  | "worked_example"
  | "prerequisite";
export interface AssistanceLedgerEntry {
  questionId: string;
  conceptId: string;
  strategy: Strategy;
  kind: AssistanceKind;
  level: number;
  turn: number;
  supportedSuccess: boolean;
  independentlyVerified: boolean;
}
export interface IndependentCheck {
  conceptId: string;
  sourceQuestionId: string;
  strategy: Strategy;
  supportLevel: number;
  dueAfterStep: number;
  questionId?: string;
}
export interface ReasoningTrace {
  questionId: string;
  intent: ConversationIntent;
  studentWords: number;
  signal: "attempt" | "question" | "reasoning" | "support" | "social";
}
export interface SessionTeachingGoal {
  skillId: string;
  objective: string;
  successCriteria: string;
  nextMove: string;
}
export interface TeachingAttempt {
  questionId: string;
  skillId: string;
  strategyId: Strategy;
  timestamp: string;
  studentResponse: string;
  outcome: "confused" | "correct" | "incorrect";
  understandingDelta: number;
  assistanceLevel: number;
}
export interface HintEvent {
  questionId: string;
  skillId: string;
  level: number;
  type: string;
  studentSucceededAfterHint?: boolean;
}
export interface TeachingMemory {
  lastTurnTrace?: import("../conversation/grounding").TurnTrace;
  recentTutorTurns?: { turnId: string; questionId: string; text: string }[];
  supportPlan?: import("./grounded-support").SupportPlan & {
    questionId: string;
  };
  usedSupportPlans?: { questionId: string; ids: string[] };
  intelligence?: import("./session-intelligence").SessionIntelligence;
  recentReasoning: string[];
  recentTutorQuestions: string[];
  attempts: TeachingAttempt[];
  hintHistory: HintEvent[];
  genuineAttempts: Record<string, number>;
  revealedQuestions: string[];
  revealedAnswer?: { questionId: string; answer: string; explanation: string };

  signals: ConversationSignals;
  returnStack: ReviewFrame[];
  hintLevel: number;
  responseOrdinal: number;
  awaitingReasoning: boolean;
  paused: boolean;
  lastUtterance?: string;
  lastTurnId?: string;
  assessmentQuestionId?: string;
  reasoningAssessed?: string[];
  checkpoint?: TeachingCheckpoint;
  guidedPractice?: import("./guided-steps").GuidedPractice;
  assistanceLedger: AssistanceLedgerEntry[];
  pendingIndependentCheck?: IndependentCheck;
  activeIndependentCheck?: IndependentCheck;
  reasoningPath: ReasoningTrace[];
  wordShare: { student: number; tutor: number };
  introducedPrompts: string[];
  goal: SessionTeachingGoal;
}
export interface Rubric {
  criteria: {
    id: string;
    description: string;
    terms: string[];
    weight: number;
  }[];
  minScore: number;
  counterEvidence: string[];
  sampleExplanation: string;
}
export interface TeachingMaterial {
  attention: string;
  guidingQuestion: string;
  strategyHint: string;
  partialStep: string;
  workedSupport: string;
  analogy: string;
  errorExample: string;
  errorQuestion: string;
  glossary: Record<string, string>;
  rubric: Rubric;
  visuals: Visual[];
  example: Question;
}
export interface CanvasCue {
  id: string;
  atWord: number;
  action: "show" | "highlight" | "question" | "clear";
  visuals: Visual[];
  label: string;
  highlight?: string;
}
export interface ConversationPresentation {
  assessment?: {
    questionId: string;
    prompt: string;
    answer: string;
    correct: boolean;
  };
  turnId: string;
  text: string;
  spokenText?: string;
  cues: CanvasCue[];
  canvasActions?: import("./whiteboard").CanvasAction[];
  intent: ConversationIntent;
  canAnswer: boolean;
  listeningPrompt: string;
  paused: boolean;
  currentSkill: string;
  returningTo?: string;
  strategy: Strategy;
  hintLevel: number;
  teachingMove?: string;
  cognitiveLoad?: "independent" | "focusing" | "guided" | "explicit";
  verification?: {
    passed: boolean;
    revised: boolean;
    checks: string[];
  };
}
