# ReflectCal

ReflectCal is an open-source research experimentation platform for studying whether language models recognize when they are wrong, how self-reflection changes answers, and how reported confidence relates to correctness. M0 implements a small, live paired experiment and the infrastructure for later research protocols.

> A live question is a demonstration, not statistical evidence.

## M0 experiment

1. **Direct answer:** Gemini receives one fixed multiple-choice question and its options, without the ground-truth answer. It returns a choice, subjective confidence from 0 to 1, and a short explanation.
2. **Self-reflection:** the same configured model receives the same question and options plus its previous answer, confidence, and explanation. The answer key is still withheld.
3. **Evaluation:** after both structured responses are validated and saved, ReflectCal reveals correctness, the correct answer, answer transition, confidence change, and per-response binary Brier score.

The confidence value is model-elicited self-report. It is not a guaranteed calibrated probability. Temperature is set to zero, but provider behavior and model updates can still introduce nondeterminism. Prompt and protocol versions and exact rendered prompts are stored with each response.

The default `gemini-3.1-flash-lite` ID is listed in Google's [Gemini model reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), which documents structured output support. The installed JavaScript client exposes `responseJsonSchema` and per-request timeout/retry controls in [`@google/genai`](https://googleapis.github.io/js-genai/). The model remains configurable and project access is checked by the actual request; a 404 is reported without switching models.

## Stack and layout

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, shadcn-style component primitives
- Bun, Vitest, Playwright
- `@google/genai` with Gemini structured JSON output and Zod validation
- Supabase PostgreSQL accessed from server code with `@supabase/supabase-js`

```text
src/app/                 Home, experiment, methodology, API routes
src/components/          Research UI and reusable UI primitives
src/lib/experiments/     Question schema, generator, prompts, scoring, orchestration
src/lib/gemini/          Gemini adapter, output contract, mock adapter
src/lib/rate-limit/      Env validation and atomic quota client
src/lib/supabase/        Server-only privileged client
supabase/migrations/     Versioned schema and quota RPCs
research/datasets/       Reproducible fixtures and future adapter contract
research/protocols/      M0 protocol notes
tests/                   Unit/integration and browser smoke tests
docs/                    Architecture and security notes
```

## Local development

Requirements: Bun, Node.js 20.9+, and (for local database use) the Supabase CLI and Docker.

```sh
bun install
cp .env.example .env.local
bun run dataset:generate
bun run dev
```

Home, methodology, and playground question browsing work without credentials. Live inference stays disabled until Gemini credentials, a Supabase URL/service-role key, and every quota value are configured. The default model ID is `gemini-3.1-flash-lite`; set `GEMINI_MODEL` to another model explicitly if that model is not enabled for your Google project. The server never silently switches models.

## Supabase local setup

No hosted database is modified by this repository's setup instructions or tests. For a local Supabase instance:

```sh
supabase start
bun run dataset:generate
supabase db reset
```

`db reset` applies `supabase/migrations/` and loads the generated `supabase/seed.sql` into the local stack. Copy the local API URL and service-role key from `supabase status` into the server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` variables. Never expose the service-role key to the browser.

## Environment variables

See [.env.example](.env.example). All four quota values must be positive integers or live inference is disabled. Set them to limits appropriate for your project; ReflectCal does not assume any Google free-tier RPM or RPD allowance.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-only Google AI Studio key |
| `GEMINI_MODEL` | Model ID; defaults to `gemini-3.1-flash-lite` |
| `GEMINI_REQUEST_TIMEOUT_MS` | Per-attempt timeout, bounded to 1–60 seconds |
| `SUPABASE_URL` | Server-side Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for privileged operations |
| `GEMINI_DAILY_REQUEST_BUDGET` | Global reserved request cap per Pacific calendar day |
| `GEMINI_MINUTE_REQUEST_BUDGET` | Global reserved request cap per UTC minute |
| `GEMINI_MINUTE_TOKEN_BUDGET` | Global conservative estimated tokens per UTC minute |
| `PUBLIC_VISITOR_DAILY_EXPERIMENT_LIMIT` | Per-cookie daily experiment cap; set to `2` for the default experience |

Each model attempt reserves budget before contacting Google. A transient provider failure can be retried once; the SDK retry policy is disabled so all attempts are visible to quota accounting. Stage B has its own reservation, so it can fail quota checks after Stage A and produce a partial run.

## Dataset

The checked-in seed fixtures are generated from arithmetic and elementary probability templates with fixed seed `20261110`. Ground truth is computed locally. Regenerate and validate:

```sh
bun run dataset:generate
bun run dataset:validate
```

Research and playground IDs are disjoint. Only playground questions are exposed, and the public serializer strips the key and split. A future MMLU-Pro adapter interface is documented at [research/datasets/adapters.ts](research/datasets/adapters.ts); M0 does not download MMLU-Pro.

## Verification

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:e2e
```

Vitest uses a mock adapter and makes no Gemini calls. Playwright smoke tests require the Chromium browser; install it with `bunx playwright install chromium` when needed. CI runs lint, typecheck, unit/integration tests, and a production build without credentials.

## Research and privacy limits

- A single observation cannot establish whether reflection improves accuracy or calibration.
- The fixture dataset is intentionally small and not a substitute for a controlled evaluation benchmark.
- No human behavioral responses or personal research data are collected. Anonymous visits are not enrolled as participants.
- A random HTTP-only cookie is hashed for a basic daily use limit. Users can clear cookies; this is not identity verification.
- Model responses and exact prompts are stored in private tables. The public API does not expose run records, quota counters, or ground truth.
- Google model nondeterminism, project availability, provider quota behavior, and model updates remain external factors.
- No authentication, human-AI study, aggregate calibration chart, hosted database migration, deployment automation, or deployment is included in M0.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SECURITY-PRIVACY.md](docs/SECURITY-PRIVACY.md), and [research/protocols/m0-paired-v1.md](research/protocols/m0-paired-v1.md).
