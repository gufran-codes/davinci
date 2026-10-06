# Da Vinci generative UI: proposed Jev integration

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
