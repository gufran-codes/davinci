# Guided math teaching

Say or type **“Walk me through this step by step”** in a supported lesson.
Da Vinci presents one curriculum-backed substep, checks its numeric answer, and
returns to the original question after the steps. The selected personalized
strategy is retained; the TeachingDecision records the increased scaffolding and
the reason for it.

Supported templates: equivalent fractions, generating equivalent numerators,
common-denominator renaming, adding unlike fractions, and the existing equal-group
multiplication skills (`equal_groups`, `multiplication_basics`, and facts for
2, 4, 5, and 10). This does not add high-school curriculum or a universal solver.
Unsupported tasks continue using the existing hints and strategy search.

The substeps are derived from structured curriculum quantities and checked against
the question's answer key. Blank equations and source quantities use existing,
validated CanvasActions. The student sees the current step instead of the final
multiple-choice options while guided practice is active. Voice and text use the
same conversation route; the LLM may verbalize the turn but cannot replace the
question being checked.

An incorrect value receives a deterministic consequence/check. Two errors on a
step return control to the existing strategy-search policy. An ambiguous response
asks for clarification without grading it. Pausing, asking why, or reloading
preserves the current step. Asking for another approach exits the step sequence.

Progress is stored in the existing per-session teaching JSON, with a question ID,
step index, and failure count. `guided_practice_started` and `guided_step_checked`
events record evidence. The development personalization panel includes the active
guided state. No migration or environment variable is needed.

**Mastery:** intermediate steps award no mastery and do not count as independent
answers. The assistance ledger records the support. The final answer is assessed
as assisted practice, and the existing independent-verification policy still
applies. Parent answer-access controls remain effective.

## Check locally

1. Start an equivalent-fractions lesson and request step-by-step help.
2. For the initial `1/2` example, answer `three` to the factor question. Verify
   that the tutor explains that `2 × 3 = 6` misses the target of `4`.
3. Answer `two`; the tutor should ask about the numerator next.
4. Reload or pause/resume. The numerator step should remain active.
5. Answer `two`, then choose the whole fraction in the original task.
6. Inspect the development personalization panel and learner evidence: substeps
   are not independent correct attempts.

```sh
npm test
npm run lint
npm run typecheck
npm run build
E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/guided-teaching.spec.ts
```

Remaining limits: free-form algebraic proofs and arbitrary procedural answers are
not evaluated by these templates. Numeric input uses a bounded arithmetic parser
and common spoken-number forms. Broader curriculum needs authored step validators;
it must not rely on the LLM declaring its own generated steps correct.
