# Da Vinci student space

The reference inspection covered heyaristotle.com's public site and the signed-in family selector, learner dashboard, subject map and past-session review. The implementation uses its warm sidebar, clear next-session card, subject navigation and review patterns with Da Vinci branding, original artwork and the existing teaching engine. It is not a claim of complete Aristotle feature parity.

## Routes and behavior

- `/`: original landing page, product illustration, feature explanations and FAQs. The illustration is labelled; it is not a live lesson or fabricated customer evidence.
- `/learn/:childId`: personalized next lesson, subject cards for the saved grade, recent sessions, evidence-based teaching note and upcoming study times.
- `/learn/:childId/subjects/math` (also `english`, `science`, `social-studies`): grade-filtered skill map, search, evidence-based skill levels and lesson entry. Unavailable or disabled subjects do not produce invented lessons.
- `/learn/:childId/session`: the existing conversation, realtime voice, choices and canvas in the new shell. A saved lesson resumes directly without another creation request.
- `/learn/:childId/settings`: existing persistent grade/subject preferences. Active lesson snapshots and mastery remain intact. Onboarding now accepts the same Grades 1–10 / ages 6–16 supported by the database.
- `/learn/:childId/schedule`: save/cancel study times, timezone-aware display and overlap validation.
- `/learn/:childId/sessions` and `/sessions/:sessionId`: completed-session summaries, saved student whiteboard and transcript. Spoken text uses the delivery receipt; the written response is separately identified.
- `/learn/:childId/uploads`: existing private homework files with authenticated access. New uploads use the existing photo/PDF flow.

All student routes check parent ownership. Lesson creation still uses the existing orchestrator, TeachingDecision, assessments, learner evidence and voice transports. Skill levels reuse the parent evidence model. The home teaching note reuses recorded observations rather than inventing claims about a learning style.

## Persistence

SQLite migration `009_study_schedule.sql` adds `study_schedule`. It runs through the existing migration runner and does not change learner tables or skill IDs. Study times cascade with child deletion and are included in the account export. API GET/POST `/api/children/:id/schedule` and DELETE `/api/children/:id/schedule/:entryId` use the existing auth/CSRF flow. New records must use an enabled subject with available grade content, a future UTC timestamp within a year and a supported duration. Conflicting times are rejected inside a transaction.

The active application still uses SQLite. No live Supabase changes were made. A schedule-table projection and corresponding RLS must accompany any later Postgres runtime migration.

## Run and verify

```sh
npm run dev
npm run voice:dev
npm run lint
npm run typecheck
npm test
npm run build
E2E_BASE_URL=http://localhost:3000 npm run test:e2e -- tests/e2e/student-space.spec.ts tests/e2e/parent-learning.spec.ts tests/e2e/teaching-upgrade.spec.ts
```

Use `/login` and the development-only demo family button, then open a child's space. Explore a subject, search for a skill, start a lesson, take a break and resume. Add a future study time, reload, then cancel it. Change the grade to 6 and confirm the curriculum-pending state. Check navigation at tablet and phone widths. Existing teaching-upgrade coverage exercises answer access and persistent whiteboard work. For audio, run the worker, click Start talking, grant microphone permission, speak an answer and interrupt the tutor; no new audio pipeline was introduced.

## Deliberate limits

- Grades 6–10 curriculum ingestion is a separate task. Profiles and the UI support those grades; their lessons are not fabricated.
- Scheduling is a persistent study planner, not a tutor booking service. It does not send emails/push notifications, launch a lesson automatically, or constrain the teaching engine to the selected duration.
- Existing uploaded files are viewable; this is not a new full-text textbook reader or arbitrary PDF navigation system.
- Review shows the saved student board and recorded conversation; it does not reconstruct every historical tutor-canvas animation.
- The new UI does not add commercial subscriptions, school/classroom administration, or external integrations from the reference product.
