# Tutor brevity and first latency improvements

October 13, 2026.

`responsePlan.speechBudget` is the shared response-length contract for the
speaker, model-output validation, repair instruction, and authored fallback.
Limits are ceilings, not targets:

| Turn                                         | Default explanation allowance  |
| -------------------------------------------- | ------------------------------ |
| Standalone definition                        | 35 words                       |
| Hint or ordinary feedback                    | 35 words                       |
| Conceptual explanation or worked example     | 70 words; 50 in grades 1–3     |
| Explicit detailed explanation                | 180 words; 120 in grades 1–3   |
| Explicit brief explanation                   | At most 35 words               |
| Ordinary social conversation                 | 30 words                       |
| Exact greetings / thanks / connection checks | Short authored acknowledgement |

A required curriculum question receives its own allowance and stays verbatim.
A long visible task does not enlarge an unrelated definition's allowance.
Exact repeats retain the prior wording. Authorized answer reveals and session
completion/review keep their existing delivery policy.

Length requests distinguish negated detail requests from requests for detail.
“Keep your answers short” and “from now on” persist a session preference;
requests for an individual answer temporarily override that preference. This
is deliberately bounded phrase recognition, not a general language parser.
Displayed answer selections cannot change the persisted preference.

Generated speech is validated before delivery. An overlong response receives
one repair attempt with the same budget, then uses the bounded authored draft.
Authored fallback prose is shortened only at sentence boundaries; it never
cuts numeric expressions or the required question. If no sentence fits, a
short clarification replaces the unusable prose. Full lesson and checked
example content remains in the teaching context and existing board sources.

## Calls avoided

- Exact greetings, thanks and connection checks bypass both model stages.
- Plain pause/resume commands use the existing deterministic response.
- Standalone definitions with explicit terms bypass interpretation and still
  use the tutor model, teaching context, and output validation.
- Compound utterances, backward references, answer reasoning and ambiguity
  retain semantic interpretation. “Thanks, but why…?” is not an acknowledgement.
- The existing correct-answer advancement shortcut remains in place.

Delivery receipts and telemetry now have independent ordered queues. The next
turn waits only for receipts, including interrupted speech. Telemetry has a
32-item backlog limit and a three-second request deadline. Receipt requests
have a five-second deadline; failed receipts are reported and are never
represented as delivered speech. Model-turn requests keep their existing
deadline. This does not introduce speculative grading or progressive audio.

## Verification

Regression coverage checks negation, age/depth budgets, persistent preferences,
long task prompts, exact repeat behavior, repair/fallback bounds, model-call
counts, compound turns, delivery receipts, and a blocked telemetry request.
Tests use synthetic records in temporary databases and injected model adapters.

```sh
node --import tsx --test tests/*.test.ts
npm run typecheck
```

These checks establish routing and response bounds, not live provider latency.
Restart the voice worker to load `agents/primer.ts` and `agents/persistence.ts`.
Progressive speech delivery and turn-detector tuning are subsequent work.
