# Live teaching whiteboard

Implemented 6 October 2026 in the existing Teaching Canvas. No new service, API key, database migration, or animation dependency is required.

## What runs today

The teaching policy still chooses the strategy, assistance and source visuals. Source-backed visuals become typed CanvasActions. The server aligns their word positions against the final, verified spoken response and persists them with the conversation turn. The browser progressively renders those actions below the question; the student's drawing board remains separate and intact.

New actions:

- `writeText`: progressively writes escaped text; note, calculation or question styling.
- `drawDiagramNode`: draws a labeled node belonging to a diagram.
- `connectDiagramNodes`: animates a connection between visible nodes.
- `highlightText`: highlights source phrases in written text.

Existing math actions still render fraction bars, number-line jumps, arrays, counters and geometry. Calculation steps now retain prior lines. Counters animate into groups. Diagram nodes can be selected, then sent as a conceptual question through the normal conversation endpoint; selecting a node itself awards no mastery credit.

Diagrams use existing approved-by-policy visual data. Explicit arrow chains in a source question can be drawn directly (for example grass → rabbit → fox); the system does not invent causal relationships. Short passages become progressive writing and source highlights. Oversized passages/diagrams and tables/maps/timelines retain the existing static renderer. A support turn with no visual can write its already-verified opening statement. Independent tasks receive no new explanatory scaffold.

## Timing and controls

- During voice, the canvas follows delivered transcription boundaries. Diagram phrases are aligned to final wording; unmatched actions use bounded approximate positions.
- LiveKit partial segments accumulate within a turn. Old segment IDs, stale turn receipts and updates after cancellation cannot advance a newer/cancelled scene.
- Without voice, visual steps advance every 1.6 seconds. Pause, next and replay work without making a model request or changing assessment state.
- Pausing visuals during speech interrupts tutor speech. Replay is **visual-only**; it does not replay audio. A new tutor turn resets the old playback timer and scene.
- Reduced-motion preferences remove drawing/entrance animations while retaining the step sequence.
- The final speech receipt can bring the board to the last delivered step if individual word boundaries were absent. This is not guaranteed frame-accurate audio synchronization.

## Try it

Start the application with `npm run dev:all` (or web with `npm run dev` and worker with `npm run voice:dev`). Restart an existing voice worker so it publishes the new turn-tagged progress packets.

1. In a fresh Grade 3 Science ecosystem lesson, ask “Can you show me?” on the food-chain task. The source chain becomes connected nodes. Pause, advance, replay, select a node and ask about it.
2. In Grade 4 Math equivalent fractions, ask for a visual explanation. Observe the fraction models and progressive text. Ask for one step at a time to retain the existing guided assessment.
3. In Grade 4 Science matter, ask to see the information. The source passage writes onto the board. Question and answer choices stay above it.
4. Interrupt during speech. Later visual steps should stop; a new response should replace the old plan. Try voice-off playback and reduced motion too.

Focused checks:

```sh
node --import tsx --test tests/live-whiteboard.test.ts tests/live-whiteboard-integration.test.ts tests/guided-teaching.test.ts tests/grounded-support.test.ts tests/conversation.test.ts tests/task-grounding.test.ts tests/voice.test.ts tests/teaching-upgrade.test.ts
E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/live-whiteboard.spec.ts tests/e2e/task-grounding.spec.ts tests/e2e/voice-start.spec.ts
npm run typecheck
npm run lint
npm run build -- --webpack
```

Browser tests mock speech providers and the visual test's prepared turn; the server integration test separately exercises real curriculum → policy support → actions → persistence → public session → final-wording retiming. Audible Cartesia/Deepgram playback still needs a microphone/speaker check.

## Scope

This is a working source-backed animated renderer, not a free-form scientific illustration generator. It can compose the supported primitives during a lesson. Richer diagrams require suitable educational source data; arbitrary generated frontend code is never executed. Jev is not involved in this implementation.
