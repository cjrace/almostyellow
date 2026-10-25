# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev           # Start dev server (auto-opens browser at localhost:3000)
pnpm build         # Lint + production build
pnpm test          # Format + lint + unit tests + Firebase emulator tests + build + Playwright E2E tests (full CI suite)
pnpm test:unit     # Vitest unit tests only (tests/unit/, no server or database needed)
pnpm test:e2e      # Build, then Playwright against a disposable Docker database
```

Playwright tests never use the production database. `pnpm test:e2e` (`scripts/e2e.mts`) starts Postgres from `docker-compose.test.yml`, seeded from `tests/database/`, then runs `next start` with the settings in `tests/test-env.ts`. It starts Docker Desktop first if it is not already running. Extra arguments go to Playwright, and `--no-build` reuses the last build:

```bash
pnpm test:e2e --no-build tests/public/00_initial_load.spec.ts
```

Playwright will not reuse a server already on port 3000, so stop `pnpm dev` first. Locally it runs 4 browsers at once, as more starves Firefox and makes tests time out at random. The HTML report is not opened automatically; view it with `pnpm exec playwright show-report`.

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
- `src/services/` — Server-side data functions for the whisky journal and film list, using Firestore through the Admin SDK
- `src/actions/` — Next.js server actions (`signInAction.ts`, `signOutAction.ts`, `firestoreTokenAction.ts`)
- `src/styles/` — Global CSS, CSS modules, and the Mantine theme (`acalat.tsx`)

### Auth (Firebase Authentication)

- `src/components/login.tsx` — Signs in with the Firebase web SDK in the browser, then passes the ID token to `src/actions/signInAction.ts`.
- `src/actions/signInAction.ts` — Swaps a fresh ID token from an authorised user for an HTTP-only `__session` cookie. Server actions only accept same-origin requests, which is the CSRF protection.
- `firestore.rules` — Denies everything by default, and checks every write has exactly the expected fields and types. `createdAt` and `updatedAt` must be server timestamps (`serverTimestamp()`), and `createdAt` can never change. The Admin SDK bypasses the rules.
- `src/auth.ts` — Creates and verifies session cookies with the Firebase Admin SDK (`src/firebase/admin.ts`), and checks the user is in the `authorizedUsers` allowlist. `getSession()` and `requireAuth()` live here.
- `src/proxy.ts` — Acts as `middleware.ts`. Redirects anyone without a valid session from `/admin` pages to the login page. It lets server action requests through, because an action can be sent to any page, so `requireAuth()` inside each action is the real check. Without a session it redirects to the login page, which the browser follows.
- `src/firebase/` — Admin SDK set-up for the server, and web SDK set-up for the browser. The browser's settings are read from the environment at request time and passed to the page, so nothing is baked in at build time.
- `src/actions/firestoreTokenAction.ts` — Gives a page with a valid session a custom token, so the browser can sign in to Firebase and use Firestore directly. The browser's sign-in only lasts while the page is open.

### Whisky journal and film list (Firestore)

Both are public, so `src/services/whiskyjournal.ts` and `src/services/filmlist.ts` read the `whiskies` and `films` collections on the server with the Admin SDK. The pages keep their existing snake_case shapes; the whisky journal's `last_edited` comes from `updatedAt`, and film years are stored as numbers. Changes go through the same files as server actions. The Admin SDK skips the Security Rules, so these check the input against the same limits as `firestore.rules`, and check IDs with `src/firebase/ids.ts` before using them in a document path. Keep the two in step; `tests/firebase/whiskyjournal.test.ts` and `filmlist.test.ts` test the actions against the emulator.

### Chopin Liszt (Firestore)

The shopping list reads and writes the `shoppingItems` collection straight from the browser (`src/components/chopinliszt.tsx`), with a live listener so changes from another device appear without a refresh. The Firestore SDK shows changes at once and queues them while offline. The change that reaches Firestore last wins, and a deleted item stays deleted. The Security Rules are the only check on these reads and writes, so test them in `tests/firebase/rules.test.ts`. The two-browser tests are in `tests/admin/04_chopinliszt_sync.spec.ts`; they share one list, so give any item a test adds a unique name.

### Database

Vercel Postgres (hosted on Neon), accessed via `@vercel/postgres`. Import `sql` from `@/db`, not `@vercel/postgres` directly, so the test database proxy settings apply. The `.env` file must have credentials — see `.env.example`. Tables: `users`, `whisky_journal`, `film_list` and `chopin_liszt`. The app no longer uses any of them; they are kept until their data is moved to Firestore.

Database seeding is done by creating a temporary `src/app/seed/route.ts` (git-ignored) and hitting `http://localhost:3000/seed` locally. See `src/seed.md` for the full pattern. The schema the tests use is in `tests/database/01_schema.sql`, so keep it in step with any table changes.

### UI

[Mantine](https://mantine.dev/) v8 with a custom theme (`acalat`), dark mode by default. Icons from Tabler. PostCSS is configured for Mantine via `postcss-preset-mantine`.

### Tests

Playwright E2E tests in `tests/`, split into three folders:

- `tests/public/` — Public pages, no auth needed
- `tests/public-database/` — Public pages that read from the database
- `tests/admin/` — Admin area (requires auth)

They run against the synthetic rows in `tests/database/02_fixtures.sql` and sign in as the synthetic users in `tests/firebase/fixtures.ts`, which `scripts/e2e.mts` loads into the Firebase emulators. Some tests assert exact counts, so update them alongside the fixtures.

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
- `pnpm test` and `pnpm test-only` run `pnpm test:ci` after the unit tests, so Java is needed for them. The emulators use fixed ports (8080 and 9099), so stop `pnpm emulators` first. The files share one emulator, so they run one at a time.
