# Curriculum architecture

## Current source of truth

`concepts.id` remains Da Vinci's canonical `skill_id`. Learner mastery,
attempts, strengths, recent learning, homework, sessions, prerequisites, and
misconceptions continue to reference that identifier. The normalized
curriculum tables extend `concepts`; they do not replace it.

The running application uses SQLite through `src/server/db.ts`. There was no
Supabase or Postgres adapter in the repository when this architecture was
introduced. `supabase/migrations/202609280001_curriculum_architecture.sql` is a
future Postgres projection, not a claim that Supabase is currently connected.

## Hierarchy

The normalized hierarchy is:

`curriculum_subjects → curriculum_courses (optional) → curriculum_domains → curriculum_topics → concepts`

Each skill stores a recommended grade range from 1–10. This range is placement
metadata, not a prerequisite boundary. `concept_prerequisites` may point to an
earlier-grade skill, and the existing remediation return stack can return to
the original target after the prerequisite is repaired.

Secondary skills may reference a course such as Algebra I, Geometry, Biology,
Chemistry, English I, English II, World History, US History, or Civics. Course
membership does not change learner mastery: mastery remains keyed by
`concepts.id`.

## Provenance and review

`curriculum_sources` records the source URL, framework, version/year, license,
usage rights, and required attribution. A source is classified as one of:

- `public_domain`
- `open_license`
- `permission_granted`
- `internal_original`
- `reference_only`

The importer rejects curriculum content supplied by a `reference_only` source.
It also rejects copied standards statements from those sources. A reference
label can be retained without asserting that it is an official standard code.
Existing broad Grades 1–5 standards references are backfilled this way.

Skills and objectives retain `draft`, `reviewed`, or `approved` status.
`curriculum_releases` versions a group of imports, while
`curriculum_import_runs` stores the source filename, SHA-256 hash, counts, and
result.

## Import workflow

Authoritative source files should be checked into `content/curriculum/` when
their licenses permit redistribution. Each file must follow
`content/curriculum/import-schema.ts`.

Validate without writing:

```bash
npm run curriculum:import -- path/to/package.json --dry-run
```

Import into the configured SQLite database:

```bash
npm run curriculum:import -- path/to/package.json --apply
```

The pipeline validates identifiers, source rights, course/subject consistency,
recommended grade ranges, prerequisites, cycles, misconceptions, teaching
strategies, standards sources, and release status before one transactional
write.

For a later Supabase deployment, port the existing base tables first, apply the
Postgres projection, implement the same transaction against a server-side
Postgres client, and add RLS policies alongside the future auth adapter. The
version-controlled import package remains unchanged.

## Deliberate limits

The representative Grades 6–10 package verifies hierarchy and course support.
It is draft architecture data, has no official standards mappings, and is not
loaded into the tutoring runtime. No Grades 6–10 lesson bank, assessments,
official standards codes, or copyrighted source text were generated or
ingested.
