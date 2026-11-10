# Architecture

## Boundaries

- `src/lib/experiments/` contains normalized question types, deterministic fixtures, prompt templates, protocol versioning, orchestration, and pure scoring functions. It does not depend on React.
- `src/lib/gemini/` contains the server-only `@google/genai` adapter, model output validation, and a mock adapter for tests.
- `src/lib/supabase/` contains the server-only privileged client. There is no browser Supabase client or cookie-auth session.
- `src/lib/rate-limit/` validates environment configuration and reserves usage with PostgreSQL RPCs before provider calls.
- `src/app/api/` exposes sanitized playground questions and runs a live experiment. It never returns a key before the paired result is complete.
- `src/components/` and `src/app/` render the research workflow. They contain no scoring rules.
- `supabase/migrations/` stores the local-only schema. `research/datasets/` stores fixture/provenance tools, and `research/protocols/` documents the study procedure.

## Request path

The experiment endpoint validates a question ID against the validated playground set, creates an opaque random visitor cookie if needed, and hashes it before storage. It creates a private run record, atomically reserves the first request, then calls Gemini. After validation it stores Stage A before reserving and calling Stage B. The service returns the answer key only when both responses have passed validation and persistence.

The SQL quota RPCs serialize reservations through a PostgreSQL advisory transaction lock. They enforce a Pacific-time daily request window, a UTC minute request window, a UTC minute estimated-token window, and a per-cookie daily experiment cap. The database purges expired quota buckets during reservation.

## Future MMLU-Pro integration

`research/datasets/adapters.ts` is the normalization interface. M0 deliberately has no dataset download or upstream license dependency. A future adapter must pin source version and preserve provenance before data is split or used in research.
