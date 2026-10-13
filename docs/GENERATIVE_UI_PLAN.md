# Da Vinci generative UI

## Implemented source-scene pipeline (10 October 2026)

The tutoring pipeline compiles approved source content into progressive CanvasActions: source evidence with exact-quote emphasis, curriculum-authored SVG connections, zero-based bar comparisons from numeric two-column tables, timelines, and separate-example calculations. Existing fraction bars, arrays, geometry and guided math remain in use. **No visual is a valid result.** The active question and its copied scenario are removed from the whiteboard, not repackaged into generic cards or flowcharts.

The optional OpenAI response includes bounded `visualDirection` and `teachingNote` fields alongside speech. It may emphasize exact source quotes or compare two sources. Prose-to-arrow proposals are now rejected: a textually faithful arrow can still be conceptually or spatially misleading. Teaching notes must be short, useful, exact excerpts of the final checked speech, not questions or copied prompts. Turn ID/version checks prevent stale plans from replacing the current board. No generated HTML, JSX or JavaScript is evaluated.

Atomic-structure help has an interactive particle model when a single atom's counts are explicitly supplied. It separates protons, neutrons and electrons, labels missing counts as unknown, and does not infer neutrality, isotopes or electron shells. The cloud is a schematic region, not a claimed electron trajectory. Unsupported or ambiguous cases do not produce an invented model. Separate atomic-number worked examples teach the same counting operation rather than jumping to the isotope question in the same broad skill bank.

Explanatory notes use original SVG pen-stroke glyphs with sequential drawing, a readable plain-text toggle, replay and reduced-motion support. Calculations retain conventional typography for legibility. Pausing/stepping settles the current drawing so it stays readable; replay remounts the strokes, including the first visual step.

No model round trip is needed for fallback scenes. Final speech retimes actions; playback supports pause, stepping, replay, interrupted turns and reduced motion. Mobile diagrams stack vertically for legible labels. Student drawings stay separate. Jev remains uninstalled and is not required for this implementation.

Verification: targeted unit/integration regressions and Chrome checks cover answer letters/full readings, guided-step escape to a final answer, idempotent progression, source validation, authored arrows, progressive charts, particle controls, pen strokes, replay, reduced motion and mobile overflow. Desktop and mobile screenshots were inspected. A live synthetic check on 10 October still returned `401 invalid_api_key`; live model conversation quality remains unverified until the configured key is corrected.

Browser checks can run beside the developer app with `PRIMER_E2E=1`, a temporary `DATABASE_PATH`, and an empty `OPENAI_API_KEY` on port 3001. This uses `.next/e2e` instead of the normal build directory. Do not point browser tests at family lesson data.

## Earlier proposal: Jev integration

Updated 6 October 2026 after the user identified https://jev-ai.pro/. This independently operated service provides hosted access to TypeSafe's Jev model, with its own keys and billing. No Jev integration, dependency, account, or key has been added. See the [service's description](https://jev-ai.pro/).

Jev evaluates typed questions against supplied state and chooses among provided candidates. It does not generate React components or tutor explanations. See the [official introduction](https://docs.typesafe.ai/introduction). The [CopilotKit generative UI example](https://docs.showcase.copilotkit.ai/cookbook/jev-generative-ui) likewise uses prepared controls and application-owned rendering.

## Recommended architecture

Student input → existing learner model and TeachingDecision → allowed component candidates → Jev chooses a candidate → code validates it → existing CanvasAction/React renderer → student interaction → existing assessment and memory updates.

Jev should select a presentation after the teaching policy has decided the move. It must not decide what is correct, change mastery, reveal an answer, or bypass prerequisite remediation. We can implement this with the existing React/LiveKit transport; another orchestration framework is not required for the first experiment.

## First implementation slice

1. Start with Grade 4 equivalent fractions. Register three prepared components: fraction comparison, guided step, and reasoning cards. Declare allowed skills, moves, assistance levels, source data, and whether each component exposes a solution.
2. Deterministically filter candidates using TeachingDecision. An independent check must not receive worked support. If only one candidate remains, no model call is needed.
3. Send candidate IDs and compact context to a server-only Jev adapter: grade, target skill, current task, selected strategy, permitted assistance, relevant learner evidence, available visuals, and recently used presentations. Exclude identities and full histories.
4. Request one component ID. Validate catalog membership, current question/decision version, required data, and reveal policy. Build component props from curriculum data; do not let the model invent numbers or answers independently of the question.
5. Attach the resulting UI plan to the existing spoken turn. Turn IDs, session versions, and word boundaries keep visuals synchronized and reject stale plans after interruption/completion.
6. Route every UI action through existing answer or guided-step endpoints. Keep deterministic grading and evidence updates.

A first plan can contain `sessionId`, `questionId`, `turnId`, `sessionVersion`, `componentId`, `sourceItemId`, `assistanceLevel`, and `revealAllowed`. React renders our catalog; never evaluate model-written JavaScript, JSX, arbitrary HTML, or SQL.

After fractions, add source-evidence cards for ELA, observation tables for Science, and map/timeline comparisons for Social Studies.

## Setup and fallback

For the service the user linked, create a key on the [Jev AI API page](https://jev-ai.pro/jev-api) and configure `JEV_AI_API_KEY` in `.env.local` and deployment secrets. Its endpoint is `POST https://jev-ai.pro/api/v1/systemone`. With the TypeSafe SDK, explicitly set `baseURL: 'https://jev-ai.pro/api'`; keys and balances are separate from TypeSafe's direct service. Never use a `NEXT_PUBLIC_` key. Follow the [Jev AI API documentation](https://jev-ai.pro/docs), verify authentication through `/api/v1/models`, then test a small decision call. A server-side HTTP adapter can avoid a new SDK dependency. Pin the model version evaluated before rollout.

Keep the existing renderer when the key is absent, a call times out, validation fails, or confidence is insufficient. Calibrate thresholds on our tutoring cases. Model confidence is not proof of educational correctness; see [TypeSafe's confidence documentation](https://docs.typesafe.ai/confidence).

## Validation and rollout

Start in shadow mode: log Jev's selection without changing the student's UI. Compare it with deterministic selection for low/high mastery, misconception probes, prerequisite detours, interruptions, and session completion. Inspect educational fit, answer leakage, repetition, latency, and later independent learning—not clicks alone.

Log eligible candidates, chosen component, fallback reason, TeachingDecision ID, and resulting evidence in the existing debugger. Enable student-facing selection only after this small evaluation is useful and stable.
