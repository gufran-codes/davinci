# Conversational tutor upgrade

Preserve existing accounts, child IDs, curriculum IDs, evidence, session history, upload flows and design. Add migrations rather than replacing the database.

1. Structured content: grade/subject/domain/topic/skill records, objective, prerequisite graph, misconception probes, question variants, rubrics, standards references, and honest review status. Expand every grade/subject; validate graphs and coverage; provide draft/review/approve tooling.
2. Teaching: evidence-ranked strategies with representation/abstraction/participation differences; six progressive hints; prerequisite return stack; rubric assessment; evolving independence.
3. Conversation: validated intents, deterministic scoring, clarification and reasoning turns, persisted conversational signals, idempotent turns and speech-delivery receipts. Record generated vs actually spoken text separately.
4. Voice: default conversational surface, shared text fallback, interruption cancellation, child-paced endpointing, synchronized canvas cues, browser transport plus LiveKit/Deepgram/Cartesia adapter. All transports call Primer, not a free-running realtime model.
5. Regression and scenario tests, browser journeys and responsive inspection; build and format checks. Live provider quality is a separate verification gate if credentials are unavailable.

Baseline assumption: US-oriented grades 1–5, with Common Core Math/ELA, NGSS-informed science and broad elementary social studies. Standards references describe scope; generated content remains draft until a human reviews it. No accreditation or exhaustive standards alignment is claimed.
