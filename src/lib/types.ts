import type {
  TeachingMemory,
  ConversationPresentation,
} from "./teaching/types";
export type Subject = "Math" | "English" | "Science" | "Social Studies";
export type Domain = string;
export const strategies = [
  "symbolic_first",
  "visual_fraction_model",
  "guided_questioning",
  "concrete_real_world_example",
  "worked_example",
  "pattern_discovery",
  "prerequisite_review",
  "step_by_step_scaffold",
  "partial_worked_example",
  "analogy",
  "compare_contrast",
  "error_analysis",
  "teach_back",
  "simplified_case",
  "progressive_complexity",
  "manipulative",
  "story_context",
  "diagram_first",
  "evidence_first",
  "guided_annotation",
  "retrieval_practice",
  "transfer_problem",
  "example_non_example",
  "concrete_to_abstract",
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
  partial_worked_example: "Start one step together",
  analogy: "A familiar connection",
  compare_contrast: "Compare two cases",
  error_analysis: "Find the mistake",
  teach_back: "Explain it back",
  simplified_case: "A simpler case",
  progressive_complexity: "Build up gradually",
  manipulative: "Move and explore",
  story_context: "A story to reason through",
  diagram_first: "Start with a diagram",
  evidence_first: "Start with evidence",
  guided_annotation: "Mark what matters",
  retrieval_practice: "Recall what you know",
  transfer_problem: "Try a new context",
  example_non_example: "Example and non-example",
  concrete_to_abstract: "From objects to symbols",
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
  | { type: "counters"; total: number; groups: number }
  | { type: "passage"; text: string; highlights: string[] }
  | {
      type: "diagram";
      title: string;
      nodes: string[];
      links: [number, number][];
    }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "timeline"; events: { date: string; label: string }[] }
  | { type: "map"; grid: string[][]; prompt: string }
  | { type: "manipulative"; total: number; label: string }
  | {
      type: "geometry";
      shape: "rectangle" | "triangle" | "circle" | "cube";
      width: number;
      height: number;
      depth?: number;
      label: string;
    };
export type ResponseMode =
  | "voice"
  | "multiple_choice"
  | "numeric"
  | "short_text"
  | "whiteboard"
  | "manipulative";
export interface AnswerOption {
  id: string;
  content: string;
  correct: boolean;
  misconceptionId?: string;
  diagnosticMeaning?: string;
}
export interface Question {
  responseModes?: ResponseMode[];
  options?: AnswerOption[];
  purpose?: "diagnosis" | "practice" | "transfer";
  qualityStatus?: "draft" | "authored";

  id: string;
  conceptId: string;
  subject: Subject;
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
  rubricId?: string;
  assessmentKey?: string;
  responseType?: "short" | "writing";
  acceptableAnswers?: string[];
}
export interface Concept {
  id: string;
  name: string;
  subject: Subject;
  domain: Domain;
  topic: string;
  gradeRange: number[];
  description: string;
  gradeBand: [number, number];
  /** Recommended placement, not an eligibility boundary. */
  recommendedGradeRange?: [number, number];
  /** Present for course-scoped secondary skills such as Algebra I. */
  courseId?: string;
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
  subjects: Subject[];
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
  outcome?: AssessmentOutcome;
  reason?: string;
  reasoningQuality?: number;
  confidence?: "unknown" | "low" | "medium" | "high";
}
export type AssessmentOutcome =
  | "independent_success"
  | "assisted_success"
  | "transfer_success"
  | "guessing"
  | "incorrect";
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
  lastDemonstratedAt?: string | null;
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
  status: "suspected" | "confirmed" | "resolved";
  lastObservedAt: string | null;
  resolvedAt: string | null;
  evidence: {
    at: string;
    questionId: string;
    observed: boolean;
    counterEvidence?: boolean;
    confidence: number;
  }[];
}
export interface StrategySkillOutcome {
  attempts: number;
  successes: number;
  failures: number;
  averageImprovement: number;
}
export interface TeachingEvidence {
  childId: string;
  strategyId: Strategy;
  subject: Subject | "";
  conceptDomain: Domain;
  attempts: number;
  successfulOutcomes: number;
  unsuccessfulOutcomes: number;
  averageImprovement: number;
  confidence: number;
  lastUsedAt: string;
  skillOutcomes: Record<string, StrategySkillOutcome>;
  evidence: {
    at: string;
    skillId?: string;
    correct: boolean;
    improvement: number;
  }[];
}
export interface RecentLearningMemory {
  id: string;
  childId: string;
  sessionId: string;
  skillId: string;
  kind: "assessment" | "misconception" | "remediation" | "strategy" | "summary";
  summary: string;
  evidence: Record<string, unknown>;
  createdAt: string;
}
export interface Learner {
  states: Record<string, LearnerConceptState>;
  strategies: TeachingEvidence[];
  misconceptions: MisconceptionState[];
  strengths: StudentStrength[];
  recentLearning: RecentLearningMemory[];
}
// Scaffolding scale: 0 independent, 1 guiding question, 2 hint,
// 3 partial worked example, 4 step-by-step assistance, 5 re-teach prerequisite.
export type AssessmentType =
  "probe" | "practice" | "transfer" | "teachback" | "remediation";
export type PedagogicalMove =
  | "probe"
  | "explain"
  | "hint"
  | "ask_reasoning"
  | "show_visual"
  | "worked_example"
  | "switch_strategy"
  | "check_understanding"
  | "reduce_scaffolding"
  | "review_prerequisite"
  | "encourage_retry"
  | "complete";
export interface TeachingDecision {
  targetSkillId: string;
  targetConceptId: string;
  objective: string;
  strategyId: Strategy;
  strategy: Strategy;
  scaffoldingLevel: number;
  pedagogicalMove: PedagogicalMove;
  strengthToLeverage?: string;
  prerequisiteToProbe?: string;
  misconceptionToTest?: string;
  misconceptionToProbe?: string;
  nextAssessmentType: AssessmentType;
  reasoningProbe?: string;
  confidenceCheck?: boolean;
  difficulty: 1 | 2 | 3;
  difficultyBand: "introduce" | "practice" | "transfer";
  shouldProbePrerequisite: boolean;
  reason: string;
  personalization: string;
  alternativesConsidered: {
    strategyId: Strategy;
    reason: string;
  }[];
}
export type Decision = TeachingDecision;
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
  "PROBE",
  "TEACH",
  "GUIDED_PRACTICE",
  "INDEPENDENT_PRACTICE",
  "MASTERY_CHECK",
  "SESSION_REVIEW",
  "COMPLETE",
] as const;
export type Phase = (typeof phases)[number] | "REMEDIATION";
export interface LearningSession {
  learningPreferences?: { grade: number; subjects: Subject[] };
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
  teaching?: TeachingMemory;
  conversation?: ConversationPresentation;
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
  expectedResponseType: "math" | "choice" | "text";
}
// Structured pedagogical state handed to the AI renderer. The LLM turns this
// into a natural interaction; it must not overwrite the teaching policy.
export interface TeachingState {
  academicContext?: Record<string, unknown>;
  student: { grade: number; age: number };
  subject: Subject;
  targetSkill: string;
  mastery: number;
  strengths: { skill: string; confidence: number }[];
  weaknesses: string[];
  prerequisites?: {
    skill: string;
    mastery: number;
    confidence: number;
  }[];
  misconceptions: {
    id: string;
    confidence: number;
    status: "suspected" | "confirmed" | "resolved";
  }[];
  strategyEvidence: {
    strategy: Strategy;
    subject: Subject | "";
    domain: Domain;
    confidence: number;
    attempts: number;
    successfulOutcomes: number;
  }[];
  selectedStrategy: Strategy;
  scaffoldingLevel: number;
  sessionState: Phase;
  assessment: AssessmentType;
  interactionRule: "ask_before_telling";
  teachingGoal?: {
    objective: string;
    successCriteria: string;
    nextMove: string;
  };
  assistance?: {
    kind: string;
    level: number;
    supportedSuccess: boolean;
    independentlyVerified: boolean;
  }[];
  independentCheckPending?: boolean;
  wordShare?: { student: number; tutor: number };
  recentLearning?: {
    skillId: string;
    kind: RecentLearningMemory["kind"];
    summary: string;
    createdAt: string;
  }[];
  decision?: {
    targetSkillId: string;
    strategyId: Strategy;
    scaffoldingLevel: number;
    difficulty: number;
    pedagogicalMove: PedagogicalMove;
    strengthToLeverage?: string;
    misconceptionToProbe?: string;
    objective: string;
    reason: string;
  };
}
export interface StudentStrength {
  childId: string;
  skillId: string;
  subject: Subject;
  strengthConfidence: number;
  independentCorrect: number;
  lastDemonstratedAt?: string | null;
  evidenceReason?: string;
}
export interface Insight {
  title: string;
  observation: string;
  adaptation: string;
  confidence: string;
  strategy?: Strategy;
  attempts: number;
}
