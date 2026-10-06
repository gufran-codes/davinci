# Answer choices and understanding checks

Implemented 5 October 2026.

The initial audit found 1,074 items without choices among 1,356 stored/representative tasks across 412 skills. All four subjects and Grades 1–10 now produce choices. Coverage is not a claim of educator approval.

- `choices` retains canonical grading values; `choiceLabels` provides longer card text. Math values stay numeric. Speaking a full label maps back to its value.
- Primary source JSON stores options and labels. Secondary/parameterized questions use the same bounded preparation function. Authored conceptual contrasts live in `content/curriculum/choices/contrasts.ts`. Numeric alternatives reject mathematically equivalent answers. Unknown conceptual keys fail instead of receiving arbitrary distractors.
- Existing authored ordering is preserved. New sets rotate by item/seed. Binary questions retain two meaningful alternatives.
- Older starter prompts no longer include their full solution before asking. Duplicate solution text is removed from first hints/context. Later worked support still follows policy.
- Correct selections request reasoning. Recognition earns limited credit (0.02; 0.01 with heavy assistance), does not increment independent successes, and does not advance review intervals. Independently explained answers provide stronger evidence.
- Writing options are `writing_support`: choosing a model records assistance, awards no assessment/mastery credit, and asks for the child's own response. Existing writing rubrics remain in use.
- Guided substeps keep their existing assessment contract; final-task options do not answer an intermediate step.

New options remain draft material. Numeric distractors, binary tasks, and general label templates need educator review for diagnostic value and reading load. Longer text alone is not better teaching. Existing review tooling continues to flag unreviewed distractors.

Run:

```sh
node --import tsx scripts/audit-answer-choices.ts
node --import tsx --test tests/choice-coverage.test.ts tests/task-grounding.test.ts tests/conversation.test.ts tests/secondary-curriculum.test.ts
npm run typecheck
```

The coverage test checks extra seeds and transfer variants, unique correct choices, labels, writing scaffolds, and recognition credit. Start a fresh lesson to see the new question data; active sessions retain their saved task state.
