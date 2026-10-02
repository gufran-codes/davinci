# Da Vinci — A tutor that learns how to teach your child

Da Vinci is a personalized tutor for Grades 1–5 across Math, English, Science,
and Social Studies. Same grade, same subject, different child, different
teaching. Its core loop is: model what the child knows (knowledge model), track
how they learn best (teaching model), choose the teaching strategy the evidence
supports, then teach differently next time — and show that adaptation to the
parent.

Lessons are organized by assigned grade → subject → domain → topic → skill.
New lessons stay within that grade. Prerequisite recovery may briefly revisit
a lower-grade foundation and then return to the original grade-level target.

The product lives under `/app` (parent) and `/learn` (child). The `/` home page
is a lightweight marketing page in the same brand.

## Setup

Requires Node.js >= 22.13 and persistent disk for SQLite (do not deploy the
SQLite adapter to ephemeral serverless hosts).

```bash
npm install
cp .env.example .env   # then fill in values, never commit .env
npm run dev            # http://localhost:3000
```

## Environment variables

| Variable                                                                       | Required     | What it does                                                                             |
| ------------------------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------- |
| `DATABASE_PATH`                                                                | No           | SQLite file location. Defaults to `./data/primer.sqlite`.                                |
| `OPENAI_API_KEY`                                                               | No           | Enables broader utterance interpretation, bounded content phrasing, and homework vision. |
| `OPENAI_MODEL`                                                                 | No           | Model for those bounded tasks. Defaults to `gpt-4.1-mini`.                               |
| `APP_ORIGIN`                                                                   | Yes          | HTTPS production origin; non-GET API requests must carry it as `Origin`.                 |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `PRIMER_WORKER_SECRET` | No           | Enable the LiveKit transport. All four are required together.                            |
| `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID`                    | With LiveKit | Speech recognition, speech generation, and the selected tutor voice.                     |
| `DEEPGRAM_MODEL`, `CARTESIA_MODEL`                                             | No           | Voice model overrides. Defaults to `nova-3` and `sonic-3`.                               |
| `PRIMER_SERVER_URL`                                                            | With LiveKit | Da Vinci origin reachable by the private worker.                                         |
| `DEMO_PASSWORD`                                                                | Dev only     | Seeds the demo family via `npm run db:seed` (min 10 chars, dev only).                    |

## Database

Schema lives in `migrations/` and is applied automatically on first DB access
(`src/server/db.ts`, tracked in `schema_migrations`), which also seeds the
312-skill curriculum graph, misconception hypotheses, and teaching strategies. No separate
migrate step is needed. Auth sessions, rate limits, learner states, sessions,
events, practice attempts, homework uploads, and product analytics all live in
the same SQLite file with foreign keys and cascading deletes.

Learner memory is structured rather than transcript-based. Per-skill knowledge
states retain mastery, confidence, independent and assisted attempts, current
scaffolding, review dates, and evidence. Separate records track misconception
lifecycle, strategy effectiveness by subject/domain/skill, demonstrated
strengths, and compact recent learning events. The educational curriculum and
deterministic assessment rules remain learner-independent; memory changes how
Da Vinci teaches, never what counts as correct.

## AI configuration and mock mode

The browser uses built-in speech services when the realtime provider block is
not configured. With LiveKit configured, the worker uses Deepgram for STT and
Cartesia for TTS. Both transports call the same Da Vinci conversation policy;
neither voice provider chooses lesson content or teaching strategy.

`tutorModelProvider` (`src/server/provider.ts`) picks the optional language
renderer. The core questions, grading, teaching decision, prerequisite
navigation, hints, and canvas cues remain deterministic and server-owned:

- `OPENAI_API_KEY` set → ambiguous or open-ended learner speech gets structured
  intent interpretation, and the speech renderer can make the policy-approved
  tutor draft more conversational (max two sentences, ask-before-telling,
  never reveals the answer). `OpenAITutorProvider` can also rephrase authored
  content and identify schoolwork skills from photos and PDFs. Both receive structured
  pedagogical state (grade, subject, mastery, strengths, weaknesses,
  misconceptions, strategy evidence, the policy's decision) — never names or
  transcripts. Every response is Zod-validated; anything invalid falls back to
  authored content.
- Unset → `LocalTutorProvider`: the whole app runs on authored questions and
  deterministic tutoring templates. Common social turns, spoken answers,
  requests for explanations, progressive hints, and strategy changes still
  work, but arbitrary conversation remains intentionally limited.

Conversational turns retain the child transcript, generated tutor text, and
the prefix reported as actually spoken. Interrupted, unheard tutor text is not
fed back as conversation history. These records are included in parent account
export and removed by the existing account/child cascade deletion.

## Curriculum workflow

`content/curriculum/grades-1-5.json` contains 282 data-driven Grade 1–5 draft
skills. The original 30 authored skills remain intact, giving 312 total skills
across Math, English, Science, and Social Studies. Every generated record stays
`draft` until the review workflow changes it; scope references are not claims
of complete standards alignment or educator approval.

```bash
npm run curriculum -- validate
npm run curriculum -- draft 4 Science Energy
npm run curriculum -- review SKILL_ID "Reviewer name"
npm run curriculum -- approve SKILL_ID "Reviewer name"
npm run curriculum:import -- content/curriculum/samples/grades-6-10-architecture.json --dry-run
```

The normalized Grades 1–10, optional high-school course, provenance, and future
Supabase architecture is documented in `docs/curriculum-architecture.md`.

## Demo account

Development only — demo routes refuse production.

- One click: on `/login`, **Explore with a demo family** creates a fresh parent
  plus Maya, Adam, and Sofia, each with illustrative starting evidence across
  subjects (Maya: visual-fraction success but guided-question wins in Science;
  Adam: multiplication strength plus independent map skills; Sofia: possible
  misconceptions in fractions and energy).
- Or deterministic seed: `DEMO_PASSWORD=<10+ chars> npm run db:seed` creates
  `alex@primer.local` with the same three children.
- The banner `Demo family · Starting learning records are illustrative` marks
  seeded data. New sessions record real interactions.
- Dev inspector (owner-scoped, dev only): `/dev/[childId]` shows the target
  skill and mastery, strengths/weaknesses/misconceptions, per-subject strategy
  evidence, the selected strategy with ranked alternatives, scaffolding and
  assessment type, why the policy chose it, last-session outcome with mastery
  deltas, plus the raw plan, sessions, and event log.

## Architecture

```text
Skill Graph → Knowledge Model + Teaching Model → Teaching Policy
      → Tutor Orchestrator → LLM / Content Renderer → Student interaction
      → Independent check → Both models update → Better next session
```

- `content/curriculum/` and `src/lib/curriculum.ts` — 312 skills across Math,
  English, Science, and Social Studies (Grade → Subject → Domain → Topic →
  Skill), prerequisite links, misconception probes, rubrics, question phases,
  standards scope references, and review status.
- `src/lib/learning.ts` — mastery updates (+0.08 independent, +0.12 transfer,
  +0.04 light hint, +0.01 heavy scaffold, −0.04 incorrect; capped 0–1),
  hypothesis → test → confidence misconception tracking, subject-scoped
  strategy evidence, strengths/weaknesses derivation, rules-based
  `chooseDecision` (strategy, 0–5 scaffolding, assessment type, probes),
  spaced review (1/3/7/14/30 days), per-subject lesson planner with grade as
  the lesson boundary, per-subject adaptive diagnostic routing.
- `src/lib/education.ts` — learner-independent curriculum truth and assessment
  boundary. `src/lib/teaching/policy.ts` — configurable evidence thresholds,
  mastery bands, strategy rules, and pedagogical-move selection.
- `migrations/005_structured_memory.sql` — persistent strengths and compact
  recent learning memory; the existing JSON-backed learner tables retain
  evidence-rich knowledge, misconception, and teaching models.
- `src/server/orchestrator.ts` — server-side session state machine
  (WARMUP → DIAGNOSTIC → PROBE → TEACH → … → SESSION_REVIEW → COMPLETE),
  version-guarded transitions, transactional writes, reasoning/confidence/
  teach-back actions that never fabricate mastery.
- `src/server/provider.ts` — renderer abstraction plus `buildTeachingState`;
  the LLM gets compact relevant prerequisites, strengths, misconception state,
  strategy evidence, recent learning, and the complete policy decision rather
  than an open-ended pedagogy prompt.
- `src/server/conversation.ts` — idempotent conversational turns, progressive
  hints, prerequisite return stacks, pause/clarification/reasoning behavior,
  per-turn response verification, and separate canvas, generated, and actually
  delivered speech records.
- `src/lib/teaching/` — focusing-question policy, assistance ledger, reasoning
  path, learner/tutor word-share tracking, and a fresh independent check after
  supported success.
- `src/components/voice/` and `agents/primer.ts` — swappable browser and
  LiveKit transports with child-paced endpointing, immediate barge-in, and
  speech-aligned canvas cues.
- `src/lib/math.ts` — bounded arithmetic parser (never `eval`); `2/4` grades
  equivalent to `1/2` unless `exact` is set.
- `src/server/analytics.ts` — provider-agnostic product events, separate from
  learning events.

Auth is email/password (scrypt, SHA-256 session tokens, 30-day cookie).
Children belong to a parent account and need no login; a child PIN can be added
later. A parent only ever accesses their own children (ownership checks +
cross-account E2E coverage).

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm run format:check
npm test            # node:test unit + persistence suites (tsx)
npm run curriculum -- validate
npm run test:e2e    # Playwright: signup → diagnostic → lesson → homework →
                    # return; demo personalization at 4 widths; API isolation
```

For the full local experience, start both the web app and voice worker together:

```bash
npm run dev:all
```

Or, if the web app is already running, start voice in a second terminal:

```bash
npm run voice:download # first run only; downloads the Silero VAD model
npm run voice:dev
```

The voice scripts load `.env` and `.env.local`, with `.env.local` taking
precedence. `VOICE_WORKER_SECRET` remains accepted as a legacy alias.

Entering a lesson automatically connects voice, requests microphone access,
and speaks the opening teaching turn. Allow microphone access when prompted.
If the browser requires a gesture before playing audio, tap **Enable sound**;
this unlocks audio and replays the current tutor turn. **Voice off** stops the
microphone until you choose **Reconnect voice**. A missing worker or failed
speech service produces an explicit error instead of a false listening state.
The local worker must remain running for realtime voice; `npm run dev` alone
starts only the web app. `PRIMER_SERVER_URL` must match its reachable URL/port.

In development, the lesson page exposes **Teaching decisions** below the voice
controls. It shows the active goal, teaching move, cognitive load, response
verification, assistance ledger, pending independent check, reasoning path,
and learner/tutor word share without exposing secrets.

E2E runs against `E2E_BASE_URL` (default `http://localhost:3001`, Chrome
channel, headless). Key personalization scenario (symbolic struggle → “Teach me
another way” → visual success → next session starts visual) is covered by
`tests/persistence.test.ts` and `tests/e2e/flows.spec.ts`. The ten completion
tests (same skill → different teaching, strength anchoring, misconception
repair, another-way outcomes, scaffolding fade, parent narrative, persistence
across loads, per-subject strategies, grade-as-context) live in
`tests/{learning,persistence,skills,policy,tutoring,schoolwork,demo,
onboarding,completion}.test.ts`.

Before declaring work complete: `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm test`, `next build`, plus the personalization check
above — if two different children don't get taught differently, or a returning
child isn't remembered, the thesis isn't implemented.

## Tutoring controls and shared working space

Parent Space → Settings has per-child **Learning controls**. Answer access is
`immediate`, `after_attempts` (default: three), or `disabled`. The server counts
real assessed attempts on the current question; hints, social turns, and request
replays do not unlock answers. A permitted reveal explains why, awards no mastery,
and offers a fresh independent question. Voice requests and buttons share this path.

Hints now progress through attention, guiding question, strategy cue, visual,
partial step, worked parallel example, and prerequisite remediation. Per-question
hint and teaching-attempt histories inform the learner model and parent summary.

The shared working space supports pen, highlighter, eraser, text/equations, shapes,
select/move, counters, undo/redo, and deleting selected student objects. **Save work**
persists the board. Selected typed equations/text and counter quantities can be
submitted as answers. Freehand strokes are saved but are not automatically read.
Tutor models remain a separate protected layer; fraction teaching uses a validated,
word-aligned sequence on a parallel example.

New migration `006_learning_controls.sql` stores answer policies and versioned
student boards. It applies automatically, including development hot reloads.
No new secrets or environment variables are needed.

`/dev/curriculum` (signed-in development only) inspects grade/subject skills,
prerequisites, misconceptions, standards references, instructional context, sample
questions, quality flags, and actual approval counts. Run
`node --import tsx scripts/curriculum.ts coverage` for the same coverage summary.
Structural question checks block review/approval if they fail. They do not certify
reading level, cultural suitability, or academic quality; educator review is still
required. See `docs/upgrade/teaching-audit.md` for implementation scope and limits.
