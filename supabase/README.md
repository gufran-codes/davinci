# Supabase preparation

Da Vinci currently runs on the server-only SQLite adapter in `src/server/db.ts`.
There was no Supabase/Postgres adapter in the repository when the curriculum
architecture was added.

The migration in this directory is the Postgres projection of the normalized
curriculum tables. It intentionally assumes the existing application tables
(`children`, `concepts`, and `teaching_strategies`) have first been ported.
Do not run it against an empty Supabase project by itself.

Before deployment, add the Supabase auth/ownership model, enable RLS, translate
the import writer to a transaction-capable Postgres client, and test a complete
SQLite-to-Postgres migration on a disposable project.
