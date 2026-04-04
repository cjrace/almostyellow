# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev           # Start dev server (auto-opens browser at localhost:3000)
pnpm build         # Lint + production build
pnpm test          # Format + lint + build + Playwright E2E tests (full CI suite)
```

Playwright tests run against the production build via `next start`. **Always run `pnpm build` before running tests**, otherwise Playwright will use a stale build and tests may fail against outdated code. To run a single test file:

```bash
pnpm build && npx playwright test tests/public/00_initial_load.spec.ts
```

Husky pre-commit hooks run Prettier automatically on staged files.

## Architecture

**Next.js App Router** with the `src/` directory. Package manager is **pnpm**.

### Key directories

- `src/app/` — Pages using App Router conventions
  - `(homepage)/` — Home page (route group, no URL segment)
  - `admin/` — Protected admin area: whisky journal CRUD, film list CRUD, Chopin Liszt shopping list, holidays
  - `cocktails/`, `films/`, `whiskyjournal/`, `games/`, `decisionmaker/` — Public-facing features
- `src/components/` — All React components in a flat structure (no subdirectories)
- `src/services/` — Server-side Postgres query functions (`authenticate.ts`, `chopinliszt.ts`, `filmlist.ts`, `whiskyjournal.ts`)
- `src/actions/` — Next.js server actions (currently only `signOutAction.ts`)
- `src/styles/` — Global CSS, CSS modules, and the Mantine theme (`acalat.tsx`)

### Auth split (important)

Auth.js uses two config files intentionally:

- `src/auth.config.ts` — Edge-runtime-safe config (route protection callbacks, sign-in page redirect). Used by middleware.
- `src/auth.ts` — Full Node.js auth config with the credentials provider (bcrypt + Postgres). Not safe for Edge.
- `src/proxy.ts` — Acts as `middleware.ts`; re-exports the edge-compatible auth. All routes under `/admin` require authentication.

### Database

Vercel Postgres (hosted on Neon), accessed via `@vercel/postgres`. The `.env` file must have credentials — see `.env.example`. Tables: `users`, `whisky_journal`, `film_list`, `chopin_liszt`.

Database seeding is done by creating a temporary `src/app/seed/route.ts` (git-ignored) and hitting `http://localhost:3000/seed` locally. See `src/seed.md` for the full pattern and table schemas.

### UI

[Mantine](https://mantine.dev/) v8 with a custom theme (`acalat`), dark mode by default. Icons from Tabler. PostCSS is configured for Mantine via `postcss-preset-mantine`.

### Tests

Playwright E2E tests in `tests/`, split into three folders:

- `tests/public/` — Public pages, no auth needed
- `tests/public-database/` — Public pages that read from the database
- `tests/admin/` — Admin area (requires auth)

Tests run against Mobile Chrome, Desktop Chrome, and Firefox (Safari/WebKit disabled).
