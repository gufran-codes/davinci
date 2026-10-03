# Da Vinci — product and technical context

Snapshot: 3 October 2026. This document is intended to be uploaded to ChatGPT as context. It describes the repository, distinguishes working features from product ambitions, and contains no credentials or real student records.

## 1. The concept

**Da Vinci is a tutor that learns how to teach each child.**

It is a web-based, voice-first learning workspace for students in Grades 1–10, with a separate parent space. The subjects are Math, English Language Arts (internally `English`), Science, and Social Studies.

The differentiator is evidence-based adaptation. Two children studying the same skill should receive different teaching when their knowledge, prerequisite gaps, misconceptions, or history of useful teaching approaches differ. This is more than using a child's name or changing the difficulty.

Example: a child with strong multiplication knowledge might connect equivalent fractions to multiplying both counts by the same factor. Another child may begin with a fraction model and reason about splitting equal parts. A third may need a diagnostic question about what the denominator means. Successful supported practice is followed by a fresh check with less help.

The product was previously named Primer. User-facing branding is Da Vinci; internal names such as `primer.sqlite`, LiveKit room/agent names, and `PRIMER_*` environment variables remain intentionally unchanged. Do not rename infrastructure for cosmetic consistency.

## 2. Product principles

- Educational correctness is separate from personalization. Curriculum, answers, rubrics, prerequisites, and learning objectives define what is true and what counts as evidence.
- Personalization determines the method, representation, pacing, difficulty, scaffolding, examples, remediation, and when to remove help.
- Do not label children as fixed “visual learners.” Store scoped observations with evidence and uncertainty.
- The language model does not choose pedagogy or decide mastery from a generic tutor prompt.
- A request for another explanation should change the teaching method, not merely rephrase it.
- Voice, visible questions, answer controls, and teaching visuals must refer to the same active task.
- The experience should feel like a calm tutoring desk: a clear task, useful workspace, conversational tutor, and obvious answer area.
- Parent insights should explain what the tutor noticed and what it will do differently, with supporting evidence.

Aristotle/heyaristotle.com has been a UX and interaction reference. Da Vinci retains its own branding, curriculum, implementation, and personalization. We do not have access to Aristotle's private teaching policy or code; observed behavior must not be described as knowledge of its internal architecture.

## 3. Student experience

The student enters their learning space, uses their assigned grade, selects a subject or skill, and begins or resumes a lesson. A parent can manage the child's grade and enabled subjects. Grade is an expected learning level, not a wall: the tutor can revisit earlier prerequisites and return to the original target.

The existing experience includes:

- Grade → subject → domain/topic → skill browsing and search.
- Diagnostics, lessons, guided practice, independent checks, remediation, reflection, and session summaries.
- Voice conversations, typed answers/questions, multiple-choice selections, and student whiteboard work.
- Progressive hints, another-method requests, step-by-step support for supported math templates, pause/resume, and questions about concepts or vocabulary.
- Parent-controlled access to correct answers. Revealing an answer is logged and does not earn mastery; fresh verification is required.
- Persistent session state and learner evidence.
- A library/homework flow and study scheduling. Homework recognition identifies the relevant concept; this is not an unrestricted homework-answer service.

Voice connects when the lesson opens, requests microphone permission, and speaks the opening turn. A browser that blocks playback offers an explicit Enable sound control. Voice off stops the microphone. The web app and voice worker must both be running.

## 4. Parent experience

Parents can create and manage separate child profiles, choose grades/subjects, set answer-access controls, and inspect:

- A lead observation about learning or teaching effectiveness.
- Skill progress and subject-level learning maps.
- Correct responses with and without assistance.
- Demonstrated strengths and areas needing further work.
- Teaching strategy outcomes and how future instruction changes.
- Session history, summaries, and next steps.

The overview and teaching-insight pages use an editorial hierarchy with a prominent observation, quieter supporting metrics, and expandable evidence. Demo family records are illustrative, not real learning outcomes. Account export and deletion flows exist.

## 5. Core architecture

```text
Student voice / text / choice / canvas
    ↓
Active task snapshot + structured utterance interpretation
    ↓
Relevant learner state + prerequisites + teaching history + working memory
    ↓
Deterministic teaching policy / TeachingDecision
    ↓
Grounded response plan + authored teaching content
    ↓
Optional LLM wording → bounded quality checks → one repair attempt if needed
    ↓
Voice + controlled Teaching Canvas + next student interaction
    ↓
Assessment → evidence → persistent learner-model update
```

The order within a turn matters: the response is assessed against the question the child actually answered. If assessment advances the lesson, the system retains that input-task snapshot separately from the next visible question.

The current stack is Next.js 16, React 19, TypeScript, Node.js, Zod, CSS, and Lucide icons. The runtime database is **SQLite**, through a server-only repository layer. It needs persistent disk. It is not currently a complete Supabase-backed production deployment.

OpenAI is an optional server-side provider for bounded interpretation, conversational wording, and homework recognition. LiveKit handles realtime transport, Deepgram transcribes speech, Cartesia synthesizes tutor speech, and Silero supplies voice activity detection.

## 6. Structured student memory

There is no `memory.md` per child. Memory is stored in the database and isolated by child ID.

- **Knowledge:** per-skill mastery, confidence, independent/assisted/incorrect attempts, scaffolding, practice/demonstration/review dates, and evidence.
- **Misconceptions:** hypotheses with confidence, suspected/confirmed/resolved status, observations, probes, and counterevidence. A single weak signal is not confirmation.
- **Teaching effectiveness:** strategy outcomes scoped to subject/domain and, where relevant, skill. It tracks attempts, successes, failures, improvement, confidence, recency, and evidence.
- **Strengths:** demonstrated skills that can support other learning.
- **Recent learning:** compact important events and summaries rather than sending all historical conversations to a model.
- **Session working memory:** current question/checkpoint/guided step, hints, assistance ledger, strategies and examples tried, return stack, pending independent checks, recent reasoning and tutor turns, and the current response plan.

New trace fields live in existing session/turn JSON; the latest grounding work does not introduce a second database or duplicate memory subsystem.

## 7. Teaching decisions and assessment

A typed TeachingDecision includes the target skill, strategy, scaffolding, difficulty, pedagogical move, objective, reason, and optional strength or misconception to investigate. Developer views expose why the method was chosen.

The policy is deterministic and configurable. It uses low mastery for more concrete support, stronger evidence for reduced support/transfer, repeated difficulty for diagnostic/remediation work, misconception evidence for targeted probes, and prior strategy outcomes for choosing among relevant methods.

The strategy registry includes questioning, visual/concrete approaches, manipulatives, worked and partial examples, analogy, comparison, pattern discovery, error analysis, teach-back, remediation, simplified cases, progressive complexity, diagrams, context stories, retrieval, transfer, evidence-first reading, and annotation. Registry availability does not mean every skill has equally rich authored content for every strategy.

Math uses deterministic checking where supported. Open-ended work uses explicit rubrics; the current rubric evaluator is largely based on terms and patterns and is not a reliable general-purpose assessor of arbitrary prose.

Current mastery policy values are roughly:

| Evidence                            | Base score change |
| ----------------------------------- | ----------------- |
| Independent correct                 | +0.08             |
| Transfer correct                    | +0.12             |
| Correct with light help             | +0.04             |
| Correct with heavier help           | +0.01             |
| Correct but low-confidence/guessing | +0.05             |
| Incorrect                           | −0.04             |

Scores are bounded to 0–1. Qualifying independent reasoning can add +0.02. Other evidence counters, confidence, recency, and independent verification matter; a score alone is not a formal school grade. Revealed answers and intermediate guided substeps do not receive ordinary independent mastery credit. These are MVP heuristics, not validated psychometric estimates.

## 8. LLM grounding and conversation quality

The model receives a bounded structured context: grade, subject/course, skill, active question and choices, expected answer/rubric, learner evidence, prerequisites, relevant strengths/weaknesses, misconceptions, recent learning, hint history, selected decision, active canvas actions, and student-board state.

Utterances are classified into answer attempts, reasoning, questions/definitions, confusion, hints, another-method requests, pause/resume, corrections, social exchanges, or unclear/off-topic speech. Interpretation distinguishes a guided substep from the full task. Ambiguous interpretations request clarification without grading. A literal clicked option bypasses model reinterpretation.

The renderer verbalizes the response plan. Its structured output identifies the current question and strategy. Bounded checks look for an incorrect focus, repeated explanations, selected forms of irrelevant subject content, unplanned math quantities, obvious answer disclosure, and excessive length. Invalid output gets one repair attempt and then uses the policy-approved draft.

These checks are useful safeguards, not proof of semantic correctness for every possible response. Generated text is tracked separately from text reported as actually spoken; an interrupted spoken prefix is not the same as a fully delivered explanation.

## 9. Teaching Canvas and interaction

The Canvas uses typed, validated actions, not arbitrary model-generated frontend code. Supported visuals/actions include number lines and jumps, equations and steps, highlighted terms, fraction bars/comparisons, arrays/counters, place value, coordinate points, geometry, highlighting, and clearing.

Visuals support the chosen teaching move. Important steps can align with tutor speech. A separate student whiteboard stores editable work with revision checks.

The task stays visible. Available choices are placed prominently above the canvas, with clear selection and a separate submit action. Long choices stack vertically. During guided math steps, original-task choices remain visible but disabled until the step sequence returns to the full problem. Tasks without choices expose a central written-response area.

## 10. Curriculum and database reality

The current catalog contains 412 skills: 30 original authored skills, 282 additional Grade 1–5 skills, and 100 Grade 6–10 starter skills. The secondary collection has 420 items. This is a working starter catalog, **not a complete, educator-approved Grades 1–10 curriculum**.

The hierarchy supports subject, optional course, domain, topic, skill, grade/range, prerequisite edges, objectives, misconceptions, strategies, standards references, assessment metadata, and status/versioning. High-school courses can include Algebra I, Geometry, Biology, Chemistry, English I/II, and history/civics courses. Mastery remains keyed primarily by skill ID.

Source metadata includes framework/reference, URL, version, license/usage-rights classification, attribution, and review status. Framework references do not prove complete standards alignment. Commercial content must not be copied without appropriate rights.

Curriculum files are version-controlled and validated before import. The normalized importer supports validation/dry-run and transactional SQLite writes. A Supabase/Postgres curriculum projection exists, but requires the base tables, ownership/auth model, RLS, a Postgres adapter/import writer, and migration testing before use.

The latest interaction work improves 12 Grade 4 questions across matter, investigation, maps, and historical sources. They remain drafts pending educator review. Many other primary Science/Social Studies tasks still need deeper item design; do not describe the entire bank as refreshed.

## 11. Useful repository map

| Area                              | Main files                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Student workspace                 | `src/components/conversation-lesson.tsx`, `student-home.tsx`, `skill-browser.tsx`                                                       |
| Parent progress                   | `src/components/parent-content.tsx`, `parent-learning.tsx`, `parent-progress.module.css`                                                |
| Core session orchestration        | `src/server/orchestrator.ts`, `conversation.ts`                                                                                         |
| Input interpretation and wording  | `src/server/understanding.ts`, `src/lib/conversation/intent.ts`, `interpretation.ts`                                                    |
| Task/response contract and guards | `src/lib/conversation/dialogue.ts`, `grounding.ts`                                                                                      |
| Context construction              | `src/server/provider.ts`                                                                                                                |
| Teaching policy and methods       | `src/lib/teaching/policy.ts`, `strategies.ts`, `adaptive.ts`, `grounded-support.ts`                                                     |
| Knowledge/evidence updates        | `src/lib/learning.ts`, `education.ts`                                                                                                   |
| Guided steps and session memory   | `src/lib/teaching/guided-steps.ts`, `session-intelligence.ts`, `src/server/guided-teaching.ts`                                          |
| Curriculum                        | `src/lib/curriculum.ts`, `src/lib/teaching/content.ts`, `content/curriculum/*`                                                          |
| Persistence                       | `src/server/db.ts`, `repository.ts`, `migrations/*`                                                                                     |
| Future Postgres projection        | `supabase/migrations/*`, `supabase/README.md`                                                                                           |
| Voice                             | `agents/primer.ts`, `src/server/voice/*`, `src/components/voice/*`                                                                      |
| Canvas/board                      | `src/lib/teaching/whiteboard.ts`, `src/server/whiteboard.ts`, canvas components                                                         |
| Focused regression coverage       | `tests/task-grounding.test.ts`, `conversation.test.ts`, `policy.test.ts`, `guided-teaching.test.ts`, `tests/e2e/task-grounding.spec.ts` |

## 12. Running and inspecting

```bash
npm install
npm run dev:all       # web + voice worker; default web URL http://localhost:3000
# Or run separately:
npm run dev
npm run voice:dev

npm run lint
npm run typecheck
node --import tsx --test tests/task-grounding.test.ts tests/conversation.test.ts tests/policy.test.ts
E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/task-grounding.spec.ts
```

Routes: `/app` for parents; `/learn/[childId]` for students; `/learn/[childId]/session` for the active lesson; `/dev/[childId]` and `/dev/curriculum` for signed-in development inspection.

The lesson's development-only **Teaching decisions** panel shows input/current tasks, interpreted intent, learner context, decision, selected strategy, response plan, final speech, and quality-guard results. Persisted conversation-turn data also records the trace.

Environment variable names include `OPENAI_API_KEY`, `OPENAI_MODEL`, `DATABASE_PATH`, `APP_ORIGIN`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID`, `PRIMER_WORKER_SECRET`, and `PRIMER_SERVER_URL`. Never upload their values or `.env.local` to ChatGPT as project context.

## 13. Important remaining work

1. Educator review, broader standards coverage, richer distractors and item-specific rubrics across the remaining curriculum.
2. Better semantic evaluation of open reasoning without letting the model redefine educational truth.
3. More authored substeps and misconception probes beyond the supported templates.
4. Task-grounding evaluations using diverse real speech, accents, interruptions, paraphrases, and ambiguous responses.
5. Production deployment of the voice worker, latency/reliability monitoring, and a tested persistent-data deployment strategy.
6. A complete Supabase migration if selected; its free tier alone does not connect this application or make external AI/voice providers free.
7. Further validation that parent narratives are supported by evidence and uncertainty, rather than causal claims inferred from a few successes.

## 14. Instructions for an AI helping with this project

Inspect the current repository before proposing work. Preserve working personalization, learner memory, voice, curriculum IDs, migrations, and TeachingDecision flow. Improve existing modules rather than introducing a parallel “brain” or generic chatbot. Distinguish implemented features, starter content, design goals, and unverified assumptions. Prioritize educational correctness, context alignment, evidence, maintainability, and a calm student experience. Test changed/high-risk logic and a few critical interactions instead of building an expensive exhaustive E2E suite.
