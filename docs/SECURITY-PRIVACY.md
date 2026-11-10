# Security and privacy limits

- Gemini and Supabase credentials are read only from server environment variables. Never add a `NEXT_PUBLIC_` prefix to them.
- Supabase tables have row-level security enabled and no visitor policies. Public and authenticated roles are denied table access. The server uses the service-role key only for controlled operations; that key bypasses RLS.
- The public question endpoint returns playground content without `correct_answer`, split, or validation fields. The experiment endpoint only reveals correctness after both stages complete.
- PostgreSQL quota reservations fail closed. If quota storage is unavailable, the server does not call Gemini.
- The visitor identifier is a random HTTP-only cookie. Only a SHA-256 hash is stored for quota accounting; raw IP addresses are not read or stored. Clearing cookies can reset an anonymous visitor limit, so it is a basic abuse control, not strong identity verification.
- Model prompts and outputs are stored in private experiment tables for reproducibility. Do not put personal or sensitive information into the question dataset.
- Anonymous use is not research participation. M0 does not collect human answers, judgments, or study demographics.
- No hosted database, remote migration, model call, or deployment is performed by automated tests.
