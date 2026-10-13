# Contextual tutoring and secondary practice

## Interaction changes

### Conversational wording (October 7)

- Removed recurring success and help preambles from the deterministic speech path. Correct answers receive a brief acknowledgement and the next policy-selected question; independent tasks do not get an extra coaching question.
- The speech renderer receives the last four exchanges with only confirmed delivered tutor speech, plus the current student utterance. Generated recent turns remain available for wording avoidance, not as evidence the student heard them.
- Completed-task feedback includes its authored explanation, response mode, and support level. The renderer must not infer reasoning, effort, or independent understanding from a correct selection alone.
- Stock transitions and repeated conversational openings are checked separately from whole-response similarity. One repair is allowed before the existing safe draft fallback; required question text, short acknowledgements, and academic terminology are exempt from the opening check.
- Conceptual questions take priority over a strategy's generic coaching style; social acknowledgements need not end in a quiz. Explicit repeat requests bypass rewriting. Safety repairs return to the actual task instead of adding another generic slogan.
- Verified with focused dialogue, grading, grounded-support, and whiteboard integration tests. Naturalness is still a qualitative judgment; these checks do not establish human-tutor equivalence.

The October 2 Aristotle review was limited to an already-saved Algebra I session, not a live tutor conversation. Its boards contrasted changing one side of an equation with maintaining equality on both sides, then offered a transfer question. This informed explicit relationships and concrete checks; no comparator curriculum or implementation was copied.

- `grounded-support.ts` supplies distinct item-grounded moves rather than treating a new strategy label as a new explanation. Fraction, equal-group, and linear-equation tasks have specific alternatives; other tasks use authored clues, contexts, and separate worked examples.
- Per-item used-plan memory survives reloads. Exhaustion asks the learner to identify the missing part instead of cycling through the same scripts. Existing prerequisite remediation and independent verification remain in place.
- Alternative requests are recognized before requests to reveal an answer. Conceptual questions are not graded as answers. Local relationship explanations precede glossary lookup. The optional language renderer can answer a conceptual question from supplied academic context instead of merely rewriting a generic clarification.
- Direct conceptual/social responses retain the current board. The displayed response uses the same verified speech as audio. The original task stays visible separately during smaller checkpoints.
- Two-step linear equations support checked numeric substeps; their completion is assisted practice, not independent mastery.
- Fraction number lines use actual numerical coordinates and subdivisions. Negative jumps include their destination. Counter distribution preserves totals. Diagrams follow declared links rather than inventing chains. Rectangle/triangle proportions use supplied dimensions.

This is not an unrestricted semantic mathematics solver. Without the language provider, unknown conceptual questions ask for clarification. Open-ended reasoning still uses the existing bounded rubric; automated checks do not establish educator-level understanding of arbitrary prose.

## Grades 6–10

The catalog includes **100 additional skills / 420 items**: eight math skills and four each in English, science, and social studies per grade. Total catalog: 412 skills. Existing IDs and saved learner evidence are unchanged.

The secondary modules contain original questions, explanations, hints, evidence, diagnostic contrasts, prerequisite edges, and diagnostic/practice/mastery roles. They are schema-validated and registered through the existing SQLite catalog. Selected high-school skills carry existing course IDs. Grade/subject filtering, scheduling, parent views, lesson launch, and coverage reporting use the same catalog.

### Scope references

- [Common Core Mathematics](https://www.thecorestandards.org/Math/): middle-school ratios, numbers, expressions, equations, geometry, statistics; an Algebra I / Geometry secondary sequence.
- [Common Core ELA](https://www.thecorestandards.org/ELA-Literacy/): evidence, interpretation, informational texts, argument, research, and language.
- [NGSS topic arrangements](https://www.nextgenscience.org/overview-topics): middle/high-school science scope.
- [C3 Framework](https://www.socialstudies.org/standards/c3): historical inquiry, geography, economics, and civics.

NGSS and C3 use grade bands; grade placements here are a Da Vinci sequence, not a nationally mandated course order. Reference codes are scope references, not claims that a short item fully assesses a standard.

### Remaining curriculum work

This is a working **starter collection**, not a complete US grade 6–10 curriculum. All new content remains `draft`, without fabricated educator approval. Full standards coverage, extended reading/writing, laboratory and inquiry tasks, deeper item banks, and independent educator review remain required. Passing graph and answer-key checks is not curricular certification.

Use `npm run curriculum -- validate` and `npm run curriculum -- coverage`. Secondary review/approve commands store reviewer metadata in `content/curriculum/secondary-review.json`, keeping the authored content and primary catalog separate. As in the existing primary catalog, drafts are available locally; production publication policy remains a separate decision.

## Verification

`grounded-support.test.ts` covers request routing, distinct plans, conceptual replies, fraction coordinates, and checked algebra substeps. `secondary-curriculum.test.ts` checks each item, choice uniqueness, visual actions, planning, provenance, and assessment roles. Existing tests retain ownership, persistence, answer-policy, assistance, and mastery checks.

## October 6: conversational flow and recovery fixes

- Correct assessed answers now advance in the same turn, including spoken option letters and “the correct option is …”. The former mandatory reasoning follow-up is removed. Choice recognition still earns recognition credit, not independent mastery. Writing starters and intermediate guided steps retain their separate contracts. Older saved reasoning gates can advance without recording a duplicate answer.
- Exact choice values and labels bypass model reinterpretation. Ambiguous references such as “that one” still need clarification; the tutor does not guess the correct answer.
- First hints use the authored clue; subsequent hints use unused grounded teaching plans. A neutral request for another method is not by itself evidence of frustration or strategy failure.
- Conceptual replies may use up to 140 words (support turns: 100), rather than forcing every explanation into 65 words. The renderer receives the selected support plan and authored hint, with explicit instructions to explain mechanisms, answer the student's actual question, and avoid interrogating an already-correct answer. Existing answer/quantity guards and fallback remain. Prompt changes use the [official OpenAI guidance on clear instructions and relevant context](https://developers.openai.com/api/docs/guides/prompt-engineering); no model, API key, or provider migration is required.
- Source chains written with `→`, `->`, or literal `arrow` separators compile to diagram nodes and SVG connectors even when a passage is also present. Descriptions such as “the arrow connects food to its consumer” are not mistaken for chains. Unsupported relationships are not invented; this remains a source-backed canvas, not unrestricted illustration generation.
- Voice failure retires the failed connection attempt, releases its retry lock, and ignores stale callbacks. LiveKit disconnect rejects a pending handshake. Reconnection does not reuse a tutor dispatch whose jobs have finished or failed, and dispatch lookup errors are no longer silently treated as an empty room.

Focused checks cover conversation/grounding, hint progression, source diagrams, dispatch eligibility, and browser choice advancement, visual playback, and unexpected voice-failure recovery. Browser voice checks use a simulated speech provider; real microphone/network/STT/TTS recovery still needs a live-device check.
