export type Domain = "Multiplication" | "Division" | "Fractions";
export const strategies = [
  "symbolic_first",
  "visual_fraction_model",
  "guided_questioning",
  "concrete_real_world_example",
  "worked_example",
  "pattern_discovery",
  "prerequisite_review",
  "step_by_step_scaffold",
] as const;
export type Strategy = (typeof strategies)[number];
export const strategyNames: Record<Strategy, string> = {
  symbolic_first: "Number relationships",
  visual_fraction_model: "Visual representations",
  guided_questioning: "Guided questions",
  concrete_real_world_example: "Everyday examples",
  worked_example: "Worked examples",
  pattern_discovery: "Pattern discovery",
  prerequisite_review: "Foundation review",
  step_by_step_scaffold: "Small steps",
};
export type Visual =
  | {
      type: "fraction_bar";
      numerator: number;
      denominator: number;
      label?: string;
    }
  | { type: "comparison"; a: number; b: number; c: number; d: number }
  | { type: "number_line"; numerator: number; denominator: number }
  | { type: "array"; rows: number; columns: number }
  | { type: "counters"; total: number; groups: number };
export interface Question {
  id: string;
  conceptId: string;
  prompt: string;
  answer: string;
  hint: string;
  explanation: string;
  concrete: string;
  visuals: Visual[];
  choices?: string[];
  misconception?: { id: string; answer: string };
  exact?: boolean;
  transfer: boolean;
}
export interface Concept {
  id: string;
  name: string;
  domain: Domain;
  description: string;
  gradeBand: [number, number];
  prerequisites: string[];
  learningObjectives: string[];
  misconceptionIds: string[];
  teachingStrategyIds: Strategy[];
  diagnosticItems: string[];
  practiceItems: string[];
  masteryItems: string[];
}
export interface Child {
  id: string;
  parentId: string;
  nickname: string;
  age: number;
  grade: number;
  goal: string;
  diagnosticComplete: boolean;
  createdAt: string;
}
export interface Evidence {
  at: string;
  questionId: string;
  correct: boolean;
  assistance: number;
  delta: number;
  strategy: Strategy;
  sessionId: string;
}
export interface LearnerConceptState {
  childId: string;
  conceptId: string;
  masteryScore: number;
  masteryConfidence: number;
  successfulIndependentAttempts: number;
  assistedAttempts: number;
  incorrectAttempts: number;
  lastPracticedAt: string | null;
  lastMasteredAt: string | null;
  scaffoldingLevel: number;
  nextReviewAt: string | null;
  reviewStage: number;
  evidence: Evidence[];
}
export interface MisconceptionState {
  childId: string;
  id: string;
  conceptId: string;
  matches: number;
  checks: number;
  confidence: number;
  confirmed: boolean;
  questionIds: string[];
}
export interface TeachingEvidence {
  childId: string;
  strategyId: Strategy;
  conceptDomain: Domain;
  attempts: number;
  successfulOutcomes: number;
  unsuccessfulOutcomes: number;
  averageImprovement: number;
  confidence: number;
  lastUsedAt: string;
}
export interface Learner {
  states: Record<string, LearnerConceptState>;
  strategies: TeachingEvidence[];
  misconceptions: MisconceptionState[];
}
export interface Decision {
  targetConceptId: string;
  objective: string;
  strategy: Strategy;
  scaffoldingLevel: number;
  difficulty: "introduce" | "practice" | "transfer";
  shouldProbePrerequisite: boolean;
  reason: string;
  personalization: string;
}
export interface LessonPlan {
  warmupConcept: string;
  reviewConcept: string | null;
  targetConcept: string;
  estimatedMinutes: number;
  reason: string;
}
export const phases = [
  "WARMUP",
  "DIAGNOSTIC",
  "TEACH",
  "GUIDED_PRACTICE",
  "INDEPENDENT_PRACTICE",
  "MASTERY_CHECK",
  "SESSION_REVIEW",
  "COMPLETE",
] as const;
export type Phase = (typeof phases)[number] | "REMEDIATION";
export interface LearningSession {
  id: string;
  childId: string;
  kind: "lesson" | "diagnostic" | "homework";
  state: Phase;
  step: number;
  version: number;
  plan: LessonPlan;
  decision: Decision;
  question: Question;
  assistance: number;
  failures: number;
  successes: number;
  answeredConcepts: string[];
  startedAt: string;
  completedAt: string | null;
  correct: number;
  attempts: number;
  feedback: string | null;
  homeworkId?: string;
  reflection?: string;
  summary?: SessionSummary;
}
export interface SessionSummary {
  workedOn: string;
  improved: string;
  developing: string;
  noticed: string;
  next: string;
  parentAction: string;
}
export interface SessionEvent {
  id: string;
  sessionId: string;
  childId: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
export interface TutorContent {
  message: string;
  ui: Visual[];
  pedagogicalIntent: string;
  expectedResponseType: "math" | "choice";
}
export interface Insight {
  title: string;
  observation: string;
  adaptation: string;
  confidence: string;
  strategy?: Strategy;
  attempts: number;
}
