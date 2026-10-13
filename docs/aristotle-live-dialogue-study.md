# Aristotle live dialogue study — October 7, 2026

## Scope and limitations

One live Algebra 1 session in the user's existing Chrome account, with 12 typed probes and the microphone kept off. Observations come from visible captions, lesson boards, and UI states. This is a small qualitative study, not a benchmark or an inspection of Aristotle's prompts, model, code, or grading internals. Responses below are paraphrases, not a reproduced transcript. No Da Vinci application code was changed for this study.

The session resumed with a summary of the previous lesson and a choice of review, multiplication equations, or another Algebra 1 topic. The dashboard showed two sessions remaining before starting. Test activity was performed in the existing profile and may influence its saved learning record; it should not be treated as evidence about the user's ability.

## Probe log

| # | Student probe | Observed response | Takeaway |
| --- | --- | --- | --- |
| 1 | Why must we do the same thing to both sides? Why not subtract only from the left? | Put `3 = 3` on the board and asked what would happen after subtracting 2 from only the left. | Used a minimal counterexample instead of reciting a rule. |
| 2 | Left becomes 1 and right stays 3, but I still don't understand how this helps with x. | Acknowledged the correct comparison, introduced `x + 5 = 9`, and explained how changing one side breaks equality. | Responded to both the correct contribution and the remaining question. |
| 3 | Explain a completely different way using everyday life, not just different words. | Used two people with equal book totals, contrasting removal from one person's books with removal from both. | Changed context, but the analogy initially omitted a clear role for x. The board was text, not a diagram. |
| 4 | Draw an actual balance-scale diagram with removal arrows. | Displayed a balance with x and 5 on the left, 9 on the right, red subtraction arrows, and resulting values below. Narration referred to those visible elements. | The visual represented the mathematical transformation. It also displayed the solution, so this is teaching rather than an independent check. |
| 5 | x = 14 because I move +5 to the right and add it to 9. Is that right? | Recorded the proposed method, pointed to subtraction in the diagram, and asked what remains after removing 5 from 9. | Addressed the specific operation error without a generic restart. |
| 6 | I don't know; explain the subtraction directly instead of asking another question. | Worked through cancellation on the left and subtraction on the right, explained the inverse operation, and ended without a quiz. | Honored a switch from guided questioning to direct teaching. |
| 7 | Give me a new equation to try by myself. | Opened a new practice board with `y + 8 = 21`. | Separated teaching from a fresh practice item. Its claim that the core idea was understood was stronger than the visible independent evidence at that point. |
| 8 | y = 13. | Confirmed correctness, then asked which operation was used. | It did **not** automatically advance after a correct first attempt. This is a behavior the user explicitly does not want in Da Vinci. |
| 9 | I subtracted 8 from both sides; move on when I am right instead of asking me to explain every answer. | Acknowledged the preference, reported recording progress, and moved to multiplication/division equations. | Responsive to the preference in this turn; persistence across future sessions was not tested. |
| 10 | Why is negative times negative positive? Don't just tell me the rule. | Built a sequence with a positive first factor, then a negative first factor, and asked for the next value. Added both sequences to the board. | Built a reasoning path from a familiar pattern to the requested concept. This was an intuitive pattern explanation, not a formal proof. |
| 11 | Positive 3. Completely different question: why is the sky blue? | Accepted the numerical answer, gave a science explanation, then returned to its earlier multiplication-equation question. | Handled an answer and a tangent together, with a return point. The scientific details were not independently audited in this study. |
| 12 | In the earlier books example, what exactly was x? The equal totals made sense, but not the unknown. | Acknowledged that the first analogy had used only known numbers. Rebuilt it with an unknown main stack plus five extra books totaling nine. | Remembered an earlier representation and repaired a missing mapping rather than defending or repeating it. |

## Observed strengths

1. **Responds to the whole message.** A correct answer does not make a follow-up question disappear. A tangent does not erase the pending lesson.
2. **Changes the teaching move.** Counterexample, analogy, diagram, explicit worked step, and independent practice are substantively different responses, not just different openings.
3. **Makes relationships explicit.** The useful part of the diagram is not decoration: removal on both sides corresponds to the same operation in the equation.
4. **Can stop asking questions.** The explicit request to explain directly was respected.
5. **Repairs its own explanation.** The missing unknown in the analogy was acknowledged and corrected with an explicit mapping.

It still used stock praise and transitions, asked for reasoning after a correct answer, and produced an initially incomplete analogy. We should adapt the useful behaviors rather than copy its personality or assume all its pedagogical choices are desirable.

## What its answering logic appears to do

The observed behavior is consistent with retaining a pending lesson objective, the student's specific contribution, an unresolved question, representations already used, and conversational preferences. It then chooses a teaching move and coordinates narration with board content. This is an inference from behavior, **not** evidence of a particular model, memory store, agent architecture, or private prompt.

The meaningful distinction is not simply longer answers or more varied praise. It is selecting the appropriate response to the student's current need and being able to revise that selection mid-conversation.

## Implications for the current Da Vinci implementation

The recent wording improvements help remove repetition, but they do not fully address these structural gaps:

- `UnderstoodTurn` primarily selects one intent. It can attach reasoning to an answer, but it does not explicitly preserve a simultaneous question, explanation preference, or tangent as separate actionable parts.
- The conversation state machine chooses the action before the optional speech renderer runs. The renderer can improve phrasing, but cannot recover a follow-up question discarded during routing or change an inappropriate pedagogical move.
- Support plans are bounded, authored alternatives. They prevent arbitrary content but cannot yet reliably construct and validate a new analogy matching a student's precise missing connection.
- The speech instructions prohibit solving the active task. That is appropriate for assessment, but direct instruction needs a distinct path: use a checked separate example or an authorized worked solution, then test a fresh item. Parent answer-access policy must remain authoritative.
- Recent delivered dialogue helps continuity, but a durable semantic memory of unresolved questions, analogy mappings, failed explanations, and stated preferences would be more useful than transcript fragments alone.

## Recommended next implementation, not yet performed

### 1. Interpret compound student turns

Represent answer claims, reasoning, conceptual questions, uncertainty, and interaction preferences separately. For a correct answer plus a question, grade the answer once, address the question, and retain the next task without forcing an extra continuation command. A plain correct answer should still auto-advance.

### 2. Select a response mode before generating speech

Use explicit modes such as brief feedback, hint, direct explanation, worked example, clarification, analogy repair, and short tangent. Whether to ask a question should be a deliberate choice, not a universal suffix. Confusion about the concept must not be confused with ambiguity about which option was spoken.

### 3. Make alternative explanations structurally different

Track what relationship each representation teaches and what the student says is missing. An analogy should identify the unknown, known quantities, operation, and equality explicitly. A new attempt should change one of those instructional mechanisms, not simply select a new strategy label or paraphrase the prior response.

### 4. Generate speech and board from one checked teaching plan

The plan should specify its example, mathematical claims, visual entities, operations/arrows, and optional check question. Validate arithmetic and references before rendering into existing canvas primitives. Keep grading, mastery updates, and answer-access controls deterministic. Do not infer success from a solution already shown on screen.

### 5. Evaluate the interactions that matter

Replay these cases against Da Vinci: correct answer plus unresolved why-question; repeated confusion; request for no more questions; faulty student method; analogy with a missing mapping; correct first attempt; tangent followed by return; interrupted explanation; and exhausted alternatives. Check semantic progress, not just word overlap. Model and voice quality still need live qualitative review after deterministic regression tests pass.

Start with compound turns and response-mode selection. Another round of phrase replacement alone would leave the main architectural limitation intact.
