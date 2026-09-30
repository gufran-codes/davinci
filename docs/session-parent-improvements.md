# Session intelligence and parent evidence

The active SQLite store remains unchanged. Optional `teaching.intelligence` and
`learningPreferences` fields live in existing session JSON; older sessions are
initialized lazily. No new database migration or cloud dependency is needed.

## Teaching decisions

The working memory supplements existing question history, hint history,
reasoning, assistance ledger, and prerequisite return stack. It contains the
current adaptive plan, recent explanation text and strategies, observations,
canvas cue/action summaries, and competing diagnostic hypotheses. The live
student board still comes from the existing board store.

Plan stages are diagnose, teach, guided, fade, independent, transfer/review,
remediate, and complete. They are synchronized when session state is persisted.
The existing policy, strategy ranking and assistance checks execute the plan;
repeated difficulty with a known error pattern now adds a foundation probe
before selecting more support. A correct independent probe reduces support
for the prerequisite-gap hypothesis and returns to the original target. A
failed probe opens remediation and keeps that return target.

Hypothesis confidence is a bounded heuristic, not a calibrated probability.
Competing causes are not mutually exclusive and their confidences do not need
to sum to one. Hypotheses never directly confirm a persistent misconception;
the existing distinct-question misconception lifecycle retains that authority.

The LLM sees a compact subset: three plan revisions, four hypotheses with two
observations each, six outcomes, three explanations, and canvas summaries. The
development lesson debugger exposes the complete bounded working memory.

Correctness remains curriculum-controlled. Correct answers with sufficient,
non-contradictory rubric-based reasoning earn an extra 0.02 mastery only when
unassisted and not reported as guessing. Standalone reasoning never grants
correct-answer credit. A correct answer without reasoning is recorded as an
unsupported answer, not automatically labelled lucky or fully understood.

Independent/mastery checks disallow answer reveal. Help requests remain
available but turn the attempt into assisted practice. Assisted success cannot
mark the previous teaching support independently verified; another fresh check
is scheduled. Existing strategy failure recording and scaffolding reduction
are reused.

## Parent experience

The overview adds a skill-level distribution and counts of recorded responses
with/without help over the last seven days that have practice. These show
observations, not scores or grades. Evidence summaries show supporting dates,
skills/question IDs and outcomes. Suggested next steps are identified separately.
The learning journey expands Subject → Domain → Skill, with recent outcomes,
last practice, support use and likely next steps. Historical skills remain visible
when grade or enabled subjects change.

Parent-facing levels:

- Not started: no response evidence.
- Starting: evidence exists, internal estimate below 0.40.
- Developing: estimate at least 0.40, but secure requirements not met.
- Secure: estimate at least 0.75 and three independent successes.
- Strong: estimate at least 0.90, five independent successes, recent three
  responses independent/correct, and recorded successful transfer.

Edit grade (1–10) and enabled subjects in the child's dashboard or family settings.
PATCH `/api/children/:id` checks ownership, validates both fields and changes only
that child. Mastery, misconceptions, strategy history and session history remain.
Active lessons retain a settings snapshot; updated preferences apply to the next
lesson. Disabled subjects are excluded from planning and new session creation.
Grades 6–10 can be stored but have no active curriculum lessons yet, so these
pages explicitly show pending curriculum rather than assigning an earlier grade.

## Verification

- `node --import tsx --test tests/*.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run format:check`
- `npx next build --webpack`
- With a development server: `E2E_BASE_URL=http://localhost:3002 npx playwright test tests/e2e/parent-learning.spec.ts`

Manual checks: open a child overview and inspect chart counts/evidence; expand
Math → Fractions → a skill; change one child's grade/subjects and reload both
siblings; finish a saved lesson; during independent verification request help
and confirm the next check is still required in the developer debugger.

Deferred: calibrated diagnostic inference, richer authored diagnostic item banks,
longitudinal controlled strategy-effectiveness analysis, Grades 6–10 curriculum
ingestion, and Supabase deployment. No live provider or voice-audio test is implied
by the deterministic test suite or parent UI smoke test.
