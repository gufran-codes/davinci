# Teaching upgrade audit

The product remains Da Vinci. The attached requirements use the earlier Primer name.

## Delivered in this upgrade

- Rich compact instructional context: active question and solution, accepted answers,
  objective, domain/topic, grade expectations, glossary, prior teaching attempts,
  recent reasoning, hint events, structured student board and tutor visuals.
- Explicit teaching attempts and hard exclusion of failed strategies during recovery.
  Existing recursive prerequisite recovery and return stack are preserved.
- Seven structured hint levels, with assistance recorded in assessment evidence.
- Parent-controlled answer reveal, enforced by database settings on the server.
  Requests use current settings, genuine per-question attempts, and replay/version
  guards. Reveals do not award mastery; the old item cannot be graded afterward.
- Answer + explanation + fresh independent check, through both voice and button.
- Voice answer letters/ordinals, visible answer cards, diagnostic option metadata.
- Independently authored equivalent-fraction variants and 20 grade-specific
  arithmetic template families (four operations across five grades), with bounded
  values, inverse checks, intentional distractors and transfer contexts.
- Grade → subject → domain → skill browsing. Normal plans remain within assigned
  grade ranges, while prerequisite repair retains the original target.
- Curriculum inspector, structured skill view, real approval-count report, and
  structural question gates in the review/approval workflow.
- Persisted student working layer: pen/highlighter/eraser, text, shapes, counters,
  select/move/delete, undo/redo. Explicit Save work persists it. Selected text,
  equation result, or counter quantity enters the existing assessment path.
- Protected tutor layer with validated, speech-word-aligned fraction sequences.
- Parent reports show teaching attempts, outcomes, assistance, reveals and verified
  independent checks. Debugger includes the detailed attempts/hint record.
- Export includes learning controls and saved boards; existing deletion cascades apply.

## Content and product limits that are still real

- The existing 282 content records remain drafts. The new templates improve arithmetic
  and fraction teaching, not every item across all four subjects. A complete independent
  educator review and detailed standards-by-standards map are not claimed.
- Curriculum coverage percentages use the current explicit skill catalog as denominator;
  they are not a percentage of all CCSS/NGSS/C3 expectations. Zero approved is shown
  honestly until reviews are recorded.
- Unit defaults to the existing domain and subskills derive from authored objectives.
  A separately authored unit/subskill progression is still needed for richer sequencing.
- Structural quality gates check keys, choices, duplicate options, explanations, visuals,
  and distractor diagnostic metadata. They cannot establish reading level, cultural
  suitability, conceptual depth or absence of ambiguity by themselves. Secondary AI
  quality review and an educator review queue remain future work.
- Shared board MVP uses the existing SVG/React renderer. It is a bounded working space,
  not a full infinite-canvas editor. Tutor models and student objects have separate
  ownership. Arbitrary shared object co-editing and the complete proposed tutor action
  vocabulary are not implemented.
- Freehand writing is persisted but not OCR-graded. Typed equations and selected counters
  are supported; arbitrary drawings, circled tutor objects, and handwriting recognition
  require a separate interpretation path. The UI says so instead of awarding false credit.
- Staged animation is implemented for the fraction explanation; other visuals retain
  the existing speech-aligned cues. It is not a general animation authoring system.

## Reference basis and framework decision

Original questions were authored independently; no proprietary question bank was copied.
The Grade 4 fraction template follows the equivalence objective in CCSS 4.NF.A.1:
https://www.thecorestandards.org/Math/Content/4/NF/

Additional sequencing references (not a claim of completed alignment):

- CCSS ELA: https://www.thecorestandards.org/ELA-Literacy/RL/4/
- NGSS: https://www.nextgenscience.org/standards
- C3: https://www.socialstudies.org/sites/default/files/c3/c3-framework-for-social-studies-rev0617.pdf
- England primary mathematics: https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study
- Singapore primary syllabus: https://www.moe.gov.sg/-/media/files/primary/2021-primary-mathematics-syllabus-p1-to-p6-updated-dec-2024.pdf

Evaluated tldraw. Its production SDK needs a license key
(https://tldraw.dev/community/license). Extending the existing bounded teaching canvas
avoids adding that deployment dependency for the current scope. A full infinite canvas
should revisit a framework rather than keep expanding this small SVG editor indefinitely.
