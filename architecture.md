# ExamCraft AI — Architecture

ExamCraft AI is a Next.js 15 application that generates Cambridge English exam practice (KET → CPE), grades attempts with an LLM, and tracks user mistakes so they can be re-drilled. The stack is intentionally small: Next.js App Router on the frontend and edge middleware, Supabase (Postgres + Auth + RLS) for persistence, and OpenRouter (Gemini 3.5 Flash) for generation and grading.

## High-level shape

```
Browser
  │
  ▼
Next.js App Router  ──►  Server Actions  ──►  Supabase (Postgres + Auth, RLS-enforced)
  │  (RSC + Client comps)        │
  │                              └─►  OpenRouter / Gemini 3.5 Flash
  ▼
Edge middleware (auth gate, session refresh)
```

There is no separate API layer. Everything that touches data goes through **server actions** in [src/actions/](src/actions/), which call typed Supabase clients and Zod-validated schemas. Client components are thin — they render forms, collect answers, and invoke actions.

## Directory map

- [src/app/](src/app/) — App Router routes.
  - [(auth)/](src/app/(auth)/) — login / signup / reset-password (public). [actions.ts](src/app/(auth)/actions.ts) holds auth server actions.
  - [auth/](src/app/auth/) — Supabase auth callback handlers.
  - [dashboard/](src/app/dashboard/) — authenticated home, with sub-routes for [history/](src/app/dashboard/history/), [mistakes/](src/app/dashboard/mistakes/), and [writing/](src/app/dashboard/writing/).
  - [practice/](src/app/practice/) — exam selector plus dynamic `[exam]/[part]` route that renders a generated paper, and [mistakes/](src/app/practice/mistakes/) for targeted drilling.
- [src/actions/](src/actions/) — server actions: [practice.ts](src/actions/practice.ts) (generate + submit), [writing.ts](src/actions/writing.ts) (writing flow + AI feedback), [history.ts](src/actions/history.ts) (load/delete attempts, mistake log), [practice-types.ts](src/actions/practice-types.ts) (shared action types).
- [src/components/](src/components/) — UI. Top level holds feature shells (e.g. [PracticeSession.tsx](src/components/PracticeSession.tsx), [MistakeLibrary.tsx](src/components/MistakeLibrary.tsx)). [exercises/](src/components/exercises/) holds one renderer per task type (Open Cloze, Key Word Transformation, etc.). [ui/](src/components/ui/) is the design-system primitives.
- [src/lib/](src/lib/) — non-React logic.
  - [exercises/](src/lib/exercises/) — domain core: [types.ts](src/lib/exercises/types.ts) (Zod schemas + types per exam/part), [generate.ts](src/lib/exercises/generate.ts), [validators.ts](src/lib/exercises/validators.ts) (scoring), [aiCheck.ts](src/lib/exercises/aiCheck.ts) (LLM second-look for fuzzy answers), [writing*.ts](src/lib/exercises/) (writing-specific flows), [mistakeLog.ts](src/lib/exercises/mistakeLog.ts) + [mistakeGrouping.ts](src/lib/exercises/mistakeGrouping.ts), [fallbacks.ts](src/lib/exercises/fallbacks.ts).
  - [gemini/](src/lib/gemini/) — OpenRouter client ([client.ts](src/lib/gemini/client.ts) — model id `google/gemini-3.5-flash`), [prompts.ts](src/lib/gemini/prompts.ts), [schemas.ts](src/lib/gemini/schemas.ts).
  - [supabase/](src/lib/supabase/) — three flavored clients: [client.ts](src/lib/supabase/client.ts) (browser), [server.ts](src/lib/supabase/server.ts) (RSC + actions), [middleware.ts](src/lib/supabase/middleware.ts) (edge session refresh).
  - [security/](src/lib/security/) — [rateLimit.ts](src/lib/security/rateLimit.ts) for action-level throttling, [authRateLimit.ts](src/lib/security/authRateLimit.ts) for login/signup endpoints.
  - [env.ts](src/lib/env.ts), [errors.ts](src/lib/errors.ts), [utils.ts](src/lib/utils.ts).
- [src/middleware.ts](src/middleware.ts) — edge guard. Refreshes the Supabase session on every request and redirects unauthenticated users away from non-public paths.
- [supabase/migrations/](supabase/migrations/) — authoritative schema, applied in order `0001` → `0011`.

## Request flow — generating a practice paper

1. User picks exam + part in [PracticeSelectorForm.tsx](src/components/PracticeSelectorForm.tsx) and lands on `/practice/[exam]/[part]`.
2. The page (server component) calls a server action in [src/actions/practice.ts](src/actions/practice.ts).
3. That action checks the rate limiter ([rateLimit.ts](src/lib/security/rateLimit.ts) → Postgres `api_usage` table, migration `0010`), builds a prompt via [gemini/prompts.ts](src/lib/gemini/prompts.ts), and calls `chatCompletion` in [gemini/client.ts](src/lib/gemini/client.ts) with `json: true`.
4. The raw model response is parsed through the Zod schema in [exercises/types.ts](src/lib/exercises/types.ts) (`exerciseSchema`). On schema failure, [fallbacks.ts](src/lib/exercises/fallbacks.ts) supplies a deterministic backup so the user never sees a broken page.
5. The validated exercise is persisted to Supabase (one row per attempt) and streamed back to the client renderer in [components/exercises/](src/components/exercises/), dispatched by [ExerciseRenderer.tsx](src/components/ExerciseRenderer.tsx).

## Request flow — submitting answers

1. The client posts answers to a submit action in [src/actions/practice.ts](src/actions/practice.ts) (or [writing.ts](src/actions/writing.ts) for writing).
2. [validators.ts](src/lib/exercises/validators.ts) scores deterministic parts. For tasks that allow paraphrase / spelling variation, [aiCheck.ts](src/lib/exercises/aiCheck.ts) does a second LLM pass and the result is merged into `per_item` and `ai_accepted` columns.
3. Wrong items are written to the per-user `mistake_log` (see [mistakeLog.ts](src/lib/exercises/mistakeLog.ts), migration `0007`). The dashboard's [MistakeLibrary.tsx](src/components/MistakeLibrary.tsx) reads from this table and feeds [MistakePracticeSession.tsx](src/components/MistakePracticeSession.tsx) for targeted drilling.
4. `revalidatePath` is called so the history / mistakes pages re-fetch fresh data on next navigation.

## Data model (Supabase)

The schema is built incrementally across [supabase/migrations/](supabase/migrations/):

- `0001_init` — core `attempts` table (exam, part, exercise JSON, answers JSON, per-item scoring, RLS by `user_id`).
- `0002_ai_grading` + `0005_ai_grading_columns_live_fix` — `ai_accepted` columns and indexes for LLM-graded items.
- `0003_dismissed_mistakes` — lets users hide individual mistakes from drill rotation.
- `0004_optimize_history_rls` — RLS / index tuning for the history page.
- `0006_add_lower_cambridge_exams` — adds KET/PET/FCE to the exam enum.
- `0007_add_mistake_log` — normalized mistake log used by the practice-from-mistakes flow.
- `0008_custom_drill_sets` — user-defined drill collections.
- `0009_writing_attempts` — writing-specific attempt storage (briefs, drafts, AI feedback notes).
- `0010_api_usage` — per-user counters powering rate limiting + cost guardrails.
- `0011_auth_rate_limit` — per-IP / per-email throttle for login + signup.

All tables are RLS-protected; the server-side Supabase client in [supabase/server.ts](src/lib/supabase/server.ts) runs as the signed-in user, so no row can leak across accounts even if an action has a bug.

## Auth

- Supabase Auth (email + password). Forms live under [src/app/(auth)/](src/app/(auth)/) and call actions in [(auth)/actions.ts](src/app/(auth)/actions.ts).
- [src/middleware.ts](src/middleware.ts) refreshes the Supabase session cookie on every request and redirects unauthenticated traffic away from anything that isn't `/`, `/login`, `/signup`, `/auth/*`, or `/reset-password`.
- `0011_auth_rate_limit` + [authRateLimit.ts](src/lib/security/authRateLimit.ts) cap login / signup attempts.

## LLM integration

- Single entry point: [src/lib/gemini/client.ts](src/lib/gemini/client.ts) talks to OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) with model `google/gemini-3.5-flash`. Imported with `"server-only"` so it can never leak into the browser bundle.
- Prompts are centralized in [prompts.ts](src/lib/gemini/prompts.ts); response shapes live in [schemas.ts](src/lib/gemini/schemas.ts) and the per-task schemas in [exercises/types.ts](src/lib/exercises/types.ts).
- Two distinct LLM uses:
  - **Generation** — produce a fresh exercise that conforms to a Zod schema.
  - **Grading** — judge whether a user's near-miss answer is acceptable ([aiCheck.ts](src/lib/exercises/aiCheck.ts), [aiWritingFeedback.ts](src/lib/exercises/aiWritingFeedback.ts)).
- Token + request budgets are enforced by [rateLimit.ts](src/lib/security/rateLimit.ts) against the `api_usage` table (migration `0010`).

## Front-end conventions

- Server components by default; client components (`"use client"`) only where state or events demand it (exercise renderers, forms, delete buttons).
- Forms submit via server actions, never via fetch to a route handler — there are essentially no API routes besides the Supabase auth callback.
- UI primitives live in [src/components/ui/](src/components/ui/) (Button, Card, Input, Select, Section, NavPill, Logo, BlobField) and are styled with Tailwind ([tailwind.config.ts](tailwind.config.ts)).
- One renderer per Cambridge task type in [src/components/exercises/](src/components/exercises/), wrapped by [PaperShell.tsx](src/components/PaperShell.tsx) for the practice page and [ReviewRenderer.tsx](src/components/ReviewRenderer.tsx) for post-submit review.

## Type & validation strategy

- Zod is the single source of truth: schemas in [exercises/types.ts](src/lib/exercises/types.ts) double as runtime guards (against LLM output) and as inferred TypeScript types throughout the app.
- Server actions return narrow result types (see [actions/practice-types.ts](src/actions/practice-types.ts)); errors are funneled through [lib/errors.ts](src/lib/errors.ts) (`safeActionError`) so the UI gets a predictable shape.

## Environment

Required env vars (see [src/lib/env.ts](src/lib/env.ts) and `.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase config.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, for privileged maintenance paths.
- `OPENROUTER_API_KEY`, optional `OPENROUTER_MAX_TOKENS` (default 4096).

`requireEnv` throws at module load, so a missing var fails the build/boot loudly rather than silently degrading at runtime.

## Deployment

- Vercel hosts the Next.js app; Supabase hosts Postgres + Auth.
- Migrations are applied manually via the Supabase SQL editor in numbered order. There is no migration runner in CI yet — adding one is the natural next step if the schema churn picks up.
