# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev           # Start dev server (auto-opens browser at localhost:3000)
pnpm build         # Lint + production build
pnpm test          # Format + lint + unit tests + build + Playwright E2E tests (full CI suite)
pnpm test:unit     # Vitest unit tests only (tests/unit/, no server or database needed)
pnpm test:e2e      # Build, then Playwright against a disposable Docker database
```

Playwright tests never use the production database. `pnpm test:e2e` (`scripts/e2e.mts`) starts Postgres from `docker-compose.test.yml`, seeded from `tests/database/`, then runs `next start` with the settings in `tests/test-env.ts`. It starts Docker Desktop first if it is not already running. Extra arguments go to Playwright, and `--no-build` reuses the last build:

```bash
pnpm test:e2e --no-build tests/public/00_initial_load.spec.ts
```

Playwright will not reuse a server already on port 3000, so stop `pnpm dev` first.

Husky pre-commit hooks run Prettier automatically on staged files.

## Branch naming

Use `deps/YYYY-MM` for monthly dependency update branches, for example `deps/2026-10`.

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

Vercel Postgres (hosted on Neon), accessed via `@vercel/postgres`. Import `sql` from `@/db`, not `@vercel/postgres` directly, so the test database proxy settings apply. The `.env` file must have credentials — see `.env.example`. Tables: `users`, `whisky_journal`, `film_list`, `chopin_liszt`.

Database seeding is done by creating a temporary `src/app/seed/route.ts` (git-ignored) and hitting `http://localhost:3000/seed` locally. See `src/seed.md` for the full pattern. The schema the tests use is in `tests/database/01_schema.sql`, so keep it in step with any table changes.

### UI

[Mantine](https://mantine.dev/) v8 with a custom theme (`acalat`), dark mode by default. Icons from Tabler. PostCSS is configured for Mantine via `postcss-preset-mantine`.

### Tests

Playwright E2E tests in `tests/`, split into three folders:

- `tests/public/` — Public pages, no auth needed
- `tests/public-database/` — Public pages that read from the database
- `tests/admin/` — Admin area (requires auth)

They run against the synthetic rows in `tests/database/02_fixtures.sql` and a test user made from `TEST_EMAIL` and `TEST_PASSWORD`. Some tests assert exact counts, so update them alongside the fixtures.

Tests run against Mobile Chrome, Desktop Chrome, and Firefox (Safari/WebKit disabled).

Vitest unit tests live in `tests/unit/` and mock the database and auth.

Any server action that reads private data or changes data must call `requireAuth()` from `src/auth.ts` at the top, outside any try/catch. Protecting `/admin` pages in the proxy is not enough, because server actions can be called directly over HTTP. Add new protected actions to `tests/unit/services_auth.test.ts`.

### Firebase emulators (migration branch)

The Firebase work is tested against the local Auth and Firestore emulators, never a real project. Java 21 or later must be installed for the Firestore emulator.

```bash
pnpm test:rules    # Security Rules tests, project demo-almostyellow
pnpm test:ci       # Everything under tests/firebase, project demo-almostyellow-ci
pnpm emulators     # Start the emulators by hand, for example while writing tests
```

- `firebase.json`, `firestore.rules` and `firestore.indexes.json` configure the emulators and rules.
- `tests/firebase/fixtures.ts` holds the synthetic users and records, and `tests/firebase/seed.ts` resets the emulators to them. Seeding happens before every test, so each starts from the same data.
- `tests/firebase/guard.ts` refuses to run unless the project is one of the two `demo-` projects, both emulator hosts are local, Security Rules are loaded and no Google or Firebase credentials are set. Its own tests are in `tests/unit/firebase_guard.test.ts`.
- The emulator tests share one emulator, so they run one file at a time and are not part of `pnpm test` yet.
