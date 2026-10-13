# Da Vinci dialogue, progression and curriculum update

October 10, 2026. Extends the existing implementation and preserves saved skill IDs and existing question positions.

## Follow-up: task continuity, selective visuals and teaching quality

- Help no longer silently descends into a prerequisite, starts a diagnostic after incorrect answers, or replaces the item when the student asks for an easier explanation. Legacy prerequisite sessions return to their exact saved question. A lower-level continue request cannot advance an incorrect answer. Correct-answer auto-advance remains intact.
- Retry IDs retain the original assessment identity, including older multi-segment IDs. Genuine attempts survive hints, alternate explanations, social conversation and reloads. Hints themselves are not attempts. Parent reveal policy and independent-check restrictions remain authoritative; showing the solution never earns mastery.
- The tutor now receives an explicit teaching brief with the stated request, understood part, unresolved gap, recent attempts and failed mechanisms. The response contract uses the Aristotle study's useful behaviors: address the whole message, repair the missing connection, change teaching mechanism after failure, and allow natural conversation without a compulsory quiz. Topic routing uses task/lesson vocabulary and still defers free-form interpretation to the model. It is not a general semantic correctness proof.
- Atomic-number hints distinguish proton count, charge and mass. The worked example stays on atomic-number counting instead of selecting an unrelated isotope/reactivity item just because it shares a skill ID. Generic “what changed” scaffolds require an actual source relationship.
- Canvas generation is optional. Copied prompts and automatic prose-to-arrow diagrams are removed. Interactive particle views use only explicit counts. Handwritten notes and their speech share a validated text excerpt; the browser draws real glyph strokes, with replay and readable-text/reduced-motion alternatives. See `GENERATIVE_UI_PLAN.md` for the bounded component contract.
- `OPENAI_INTERPRETER_MODEL` and `OPENAI_TUTOR_MODEL` can be configured separately; both retain `OPENAI_MODEL` and the existing default as fallbacks. No paid model upgrade or new provider was silently selected. Explicit in-depth requests can receive longer explanations. A limited-conversation indicator exposes missing credentials/provider failures instead of silently presenting the authored fallback as full AI conversation.

The initial live credential check returned `401 invalid_api_key`; the subsequent Sol recovery below supersedes that credential limitation. This work does not establish production readiness, educator-reviewed accuracy, or human-teacher equivalence. Next LLM work should benchmark teaching models against multi-turn doubts, wrong answers, tangents and interruptions; add reviewed lesson retrieval and domain-specific checking; then compare quality, latency and cost before rollout. Fine-tuning is not a substitute for fixing state transitions, source quality and evaluation. The evaluation approach follows [official OpenAI guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices).

### Sol connection recovery

After the local credential was replaced, the API confirmed access to `gpt-6.1-sol`. The old six-second interpreter deadline still failed on a real structured interpretation request. Sol now uses explicit `low` reasoning effort, reasoning-aware output budgets and bounded per-role timeouts. The voice transport allows the bounded interpreter, speaker and one repair pass to finish. Existing non-Sol request limits are preserved.

Provider diagnostics distinguish timeouts, credentials, configuration and invalid responses without exposing API keys or response bodies. A changed key/model clears the old configuration's cooldown; elapsed cooldown alone does not falsely mark recovery. A successfully parsed response clears the limited-service state.

All five live synthetic dialogue probes subsequently used model interpretation and model speech with no fallback, covering a compound answer/question, conceptual confusion, a worked example, a tangent and a reference to an earlier example. End-to-end turns took approximately 7–11 seconds. This verifies connectivity and those scenarios, not acceptable production voice latency or general teaching quality. Tests used a temporary database, not learner history.

## Correct answers and spoken choices

- Spoken letters, explicit option numbers, ordinal choices, full answer text, displayed labels and uniquely identifying keywords resolve against **all** current options. The correct key is not used to guess what the student meant. Shared keywords, negations and competing choices do not receive automatic correctness credit.
- An explicit final-option selection can bypass a teaching checkpoint. A bare number during guided steps still answers that step, not a coincidentally matching final answer. Writing starters remain scaffolds rather than completed writing.
- Correct responses are assessed once and advance without a confirmation gate. A brief acknowledgement and transition are retained even if a model returns only the next question. A recognized option may be acknowledged by its letter without asking the student to click or confirm it.
- Question selection excludes prompts already served in the session, including separate worked examples recorded by the dialogue engine. Exhausting the bounded question bank moves to review rather than disguising the same prompt with a new ID. This is not evidence of mastery.
- Targeted voice-sync packets carry the turn ID. Duplicate and stale packets cannot restart an already spoken turn. Explicit reconnect and blocked-playback recovery can still replay the saved turn. Restart the voice worker to load agent-code changes.

## Deeper dialogue engine

The first three recommendations in the Aristotle study are implemented below the wording layer:

1. Structured interpretation preserves answer evidence, reasoning, follow-up requests, student-reported gaps, understood portions and explicit teaching preferences. Source spans are checked against the actual transcript. Grading remains deterministic.
2. A persisted response plan selects feedback, hint, direct explanation, worked example, clarification, analogy repair or tangent before speech generation. A no-quiz preference suppresses unsolicited follow-up questions without unlocking the answer key. Compound answers keep the original task for explanation while the next task remains active.
3. Explanations carry an instructional mechanism, relationship, mappings, steps and boundary. Authored mappings cover fraction equivalence, supported linear equations and equal groups. Other topics use curriculum/source material without fabricated analogy mappings. Failed approaches and mechanisms are retained per gap; rejected examples use stable content identities rather than seed IDs. Exhaustion is acknowledged instead of cycling the same method.

Session memory holds up to eight gaps and twelve recent explanations; each gap retains up to 32 failed approach IDs and 16 failed mechanisms. It initializes lazily for older sessions. An explanation is not treated as understood merely because it was generated or delivered. Voice delivery receipts distinguish heard prefixes from unheard text. This is session-local memory, not an indefinite learner diagnosis.

Official OpenAI guidance informed the structured interpretation and explicit context handling: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) and [conversation state](https://developers.openai.com/api/docs/guides/conversation-state). The configured model was not changed.

## Curriculum scope

The packaged curriculum now contains 382 structured skills and 1,386 question records, including **40 expanded lessons and 120 new tasks**: one expanded lesson per subject per grade, grades 1–10. The earlier skill bank remains available; these counts are not claims that every existing skill has received the same depth upgrade.

Each expanded lesson contains a core idea, three teaching steps, a separate worked example, a common-error description and a transfer goal. New tasks vary the reasoning demand instead of only changing numbers. Lessons are wired into the tutor's academic context, deterministic explanation fallback and structured curriculum catalog.

| Grade | Math                        | English                  | Science                                | Social Studies                  |
| ----- | --------------------------- | ------------------------ | -------------------------------------- | ------------------------------- |
| 1     | Place value                 | Story sequence           | Sound and vibration                    | Rules and fairness              |
| 2     | Money and change            | Main topic               | Plant investigations                   | Map interpretation              |
| 3     | Area and missing sides      | Evidence-based inference | Balanced forces                        | Scarcity and opportunity cost   |
| 4     | Fraction operations         | Combining texts          | Weathering and erosion                 | Historical sources              |
| 5     | Volume                      | Contextual word meaning  | Conservation of matter                 | Public decisions                |
| 6     | Unit-rate comparisons       | Textual evidence         | Particle models                        | Sourcing and corroboration      |
| 7     | Multi-step percent change   | Argument evaluation      | Photosynthesis and respiration         | Trade and its effects           |
| 8     | Systems and constraints     | Conflicting sources      | Natural selection                      | Constitutional checks           |
| 9     | Quadratic roots in context  | Rhetorical analysis      | Genetics and probability               | Independent historical evidence |
| 10    | Similarity and area scaling | Validity of arguments    | Reaction ratios and limiting reactants | Data, rates and causal claims   |

Scope references: [CCSS Math](https://www.thecorestandards.org/wp-content/uploads/Math_Standards.pdf), [CCSS ELA](https://www.thecorestandards.org/ELA-Literacy/), [NGSS evidence expectations](https://www.nextgenscience.org/resources/evidence-statements), and the [C3 Framework](https://www.socialstudies.org/sites/default/files/c3/c3-framework-for-social-studies-rev0617.pdf). Grade placement within secondary science and social studies is an app sequence, not a nationwide mandated course order. The content is original and marked **draft, educator review pending**. It is not a complete accredited curriculum or a claim of full standards coverage.

## Verification and operational limit

Targeted tests cover spoken-answer acceptance, ambiguity, grading, compound messages, guided steps, transitions, question exhaustion, delivery receipts, voice-sync policy, schema validation and curriculum answer keys. All 120 added tasks are reachable and have exactly one grading-correct option. Their displayed labels are accepted as spoken answers.

Follow-up local verification: 162 targeted tests passed, including unresolved-task continuity, reveal counters across hints/reloads, source-backed scenes, dialogue routing and provider-health recovery. Six targeted browser tests passed; the handwriting/particle mobile test was rerun after its final typography adjustment. TypeScript checking, targeted ESLint and `git diff --check` passed. Browser tests used an isolated temporary database with the model disabled; no production learner records were used.

The initial October 10 live smoke check returned `401 invalid_api_key`; after the credential update and Sol request fixes, all five live probes passed as recorded above. Microphone-to-audio playback is still **not verified** by that text/API check. To repeat the opt-in live check after restarting the relevant app/voice processes, run:

```sh
node --env-file-if-exists=.env --env-file-if-exists=.env.local --import tsx scripts/dialogue-smoke.ts
```

This opt-in check makes model requests and reports whether the semantic and speech stages used the model or fell back. The key itself is never printed.
