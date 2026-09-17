# Primer implementation plan

The provided workspace was empty: no marketing repository, assets, or existing backend were available to preserve. The product lives under /app and /learn. A minimal companion home page can be replaced by the existing public site when supplied.

1. Define normalized SQLite schema and isolated domain types.
2. Author 26 connected concepts, deterministic grading, evidence updates, review scheduling, teaching policy, and a bounded session state machine.
3. Add persistent email/password authentication, ownership checks, transactional writes, and authenticated upload storage.
4. Build calm parent pages and a purpose-built child lesson surface with deterministic mathematical visuals.
5. Add an optional validated OpenAI renderer/vision adapter, local fallback, event analytics, and development inspection.
6. Verify domain logic, account isolation, all core browser journeys, responsiveness, lint, types, formatting, and production build.

SQLite is selected to make the entire MVP usable without external credentials. It requires one Node server and persistent storage. Database access is server-only and ownership is enforced before each resource access. A hosted Supabase adapter is not included and must not be implied to exist.
