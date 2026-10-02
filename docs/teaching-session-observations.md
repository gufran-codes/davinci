# Live reference session and focused dialogue changes

Observed an authenticated Aristotle Algebra 1 session on October 2, 2026.
Student messages were typed; tutor responses were inspected through live captions
and the whiteboard. This was not a microphone or acoustic-quality test. The sample
session was ended through its normal controls. No proprietary implementation or
curriculum was imported.

## What was actually observed

- The opening asked about level and learning goal.
- A question about applying operations to both sides led to a balance model.
- A deliberately incorrect proposal was examined using the learner's own numbers:
  the tutor derived its consequence and checked whether the original equality held.
- A request for another explanation produced a smaller numerical equality before
  returning to a one-step equation.
- An intermediate operation was acknowledged, followed by a question about why
  that operation was appropriate.
- After reasoning, the tutor supplied a fresh independent problem, then proposed
  applying the same principle to multiplication.

This is evidence about one visible interaction, not knowledge of Aristotle's
internal pedagogy, learner model, or reliability across subjects.

## Changes in Da Vinci

- `dialogueFocus` derives the active response target from persisted session state:
  observation, reasoning, final answer, reflection, pause/resume, or completion.
  Compact model context includes this focus. The interpreter receives the teaching
  prompt rather than always receiving the original assessment question.
- The repetition guard repairs a repeated/irrelevant question while retaining a
  bounded explanation. Unsafe or wholly repetitive output still falls back.
  Repaired checkpoint prompts are synchronized with the question cue on the canvas.
- A count mentioned during a visual checkpoint is not automatically a wrong final
  answer. Explicit final answers, supplied choices, fraction-shaped attempts for
  fraction questions, canvas submissions, and correct original answers retain
  assessment behavior. This is a conservative heuristic, not general step solving.
- Checkpoint observations record rubric matches and contradictions. Unrelated
  comments retain the checkpoint; contradictory explanations prompt another
  representation. Observations alone no longer increment supported-success counts.
- Mentioning a first or second _step_ no longer accidentally selects a choice.
- Social acknowledgements do not automatically acquire an extra assessment question.

Existing strategy selection, prerequisite remediation, independent checks, learner
memory, answer-access policy, and voice transport remain in place. No migration or
new environment variable is required.

## Verification

`npm test` includes focused cases for intermediate responses, contradictory
observations, persisted dialogue context, preserving explanations, and step/choice
disambiguation. Run `npm run lint`, `npm run typecheck`, and `npm run build` too.

Manual check: start an equivalent-fractions lesson, request another approach,
describe the visual, ask about the first step, and then submit an explicit final
answer. Check that only an actual assessed attempt changes mastery. Compare two
learner profiles to verify their existing evidence-based strategy differences.

## Limits

The current open-ended rubric remains based on authored criteria and term matches;
it is not a reliable general-purpose semantic proof checker. Intermediate numeric
answers remain ambiguous in some tasks. Dynamic generation of arbitrary validated
substeps/counterexamples and full competitor parity are not implemented here.
Da Vinci microphone/audio behavior was not retested in this change.

The subsequent [guided teaching update](./guided-teaching.md) adds checked
substeps and concrete error feedback for a bounded set of existing math skills.
