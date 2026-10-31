# AGENTS.md

## Commands

```bash
pnpm dev           # Start dev server (auto-opens browser at localhost:3000)
pnpm build         # Lint + production build
pnpm test          # Format + lint + unit tests + Firebase emulator tests + build + Playwright E2E tests (full CI suite)
pnpm test:unit     # Vitest unit tests only (tests/unit/, no server or emulators needed)
pnpm test:e2e      # Build, then Playwright against the Firebase emulators
pnpm test:lighthouse  # Build, then Lighthouse on every public page against the Firebase emulators
```

Playwright tests never use production data. `pnpm test:e2e` (`scripts/e2e.mts`) builds the app, then runs `next start` and Playwright inside the Firebase emulators with the settings in `tests/test-env.ts`. Extra arguments go to Playwright, and `--no-build` reuses the last build:

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
- `src/services/` — Server-side data functions for the whisky journal, film list and cocktails, using Firestore through the Admin SDK
- `src/actions/` — Next.js server actions (`signInAction.ts`, `signOutAction.ts`, `firestoreTokenAction.ts`)
- `src/styles/` — Global CSS, CSS modules, and the Mantine theme (`acalat.tsx`)

### Auth (Firebase Authentication)

- `src/components/login.tsx` — Signs in with the Firebase web SDK in the browser, then passes the ID token to `src/actions/signInAction.ts`.
- `src/actions/signInAction.ts` — Swaps a fresh ID token from an authorised user for an HTTP-only `__session` cookie. Server actions only accept same-origin requests, which is the CSRF protection.
- `firestore.rules` — Denies everything by default, and checks every write has exactly the expected fields and types. `createdAt` and `updatedAt` must be server timestamps (`serverTimestamp()`), and `createdAt` can never change. The Admin SDK bypasses the rules.
- `src/auth.ts` — Creates and verifies session cookies with the Firebase Admin SDK (`src/firebase/admin.ts`), and checks the user is in the `authorisedUsers` allowlist. `getSession()` and `requireAuth()` live here.
- `src/proxy.ts` — Acts as `middleware.ts`. Redirects anyone without a valid session from `/admin` pages to the login page. It lets server action requests through, because an action can be sent to any page, so `requireAuth()` inside each action is the real check. Without a session it redirects to the login page, which the browser follows.
- `src/firebase/` — Admin SDK set-up for the server, and web SDK set-up for the browser. The browser's settings are read from the environment at request time and passed to the page, so nothing is baked in at build time.
- `src/actions/firestoreTokenAction.ts` — Gives a page with a valid session a custom token, so the browser can sign in to Firebase and use Firestore directly. The browser's sign-in only lasts while the page is open.

### Whisky journal and film list (Firestore)

Both are public, so `src/services/whiskyjournal.ts` and `src/services/filmlist.ts` read the `whiskies` and `films` collections on the server with the Admin SDK. The pages keep their existing snake_case shapes; the whisky journal's `last_edited` comes from `updatedAt`, and film years are stored as numbers. Changes go through the same files as server actions. The Admin SDK skips the Security Rules, so these check the input against the same limits as `firestore.rules`, and check IDs with `src/firebase/ids.ts` before using them in a document path. Keep the two in step; `tests/firebase/whiskyjournal.test.ts` and `filmlist.test.ts` test the actions against the emulator.

### Cocktails (Firestore)

`src/app/cocktails/page.tsx` reads the `cocktails` collection on each request with `src/services/cocktails.ts`, and passes it to the client component for filtering. There is no page for changing cocktails yet. Ratings are out of 5 in halves, and photos must be under `/images/`; `tests/firebase/rules.test.ts` checks every catalogue recipe meets the rules.

### Chopin Liszt (Firestore)

The shopping list reads and writes the `shoppingItems` collection straight from the browser (`src/components/chopinliszt.tsx`), with a live listener so changes from another device appear without a refresh. The Firestore SDK shows changes at once and queues them while offline. The queue is only kept in memory, so changes not yet sent are lost if the page closes (the page asks before unloading while any are waiting), and the list needs a connection to open. The offline message also shows when the listener is serving cached data, as phones can report being online on a signal too weak to reach Firestore. The change that reaches Firestore last wins, and a deleted item stays deleted. The Security Rules are the only check on these reads and writes, so test them in `tests/firebase/rules.test.ts`. The two-browser tests are in `tests/admin/04_chopinliszt_sync.spec.ts`; they share one list, so give any item a test adds a unique name.

### UI

[Mantine](https://mantine.dev/) with a custom theme (`acalat`), dark mode by default. Icons from Tabler. PostCSS is configured for Mantine via `postcss-preset-mantine`.

### Tests

Playwright E2E tests in `tests/`, split into three folders:

- `tests/public/` — Public pages, no auth needed
- `tests/public-firestore/` — Public pages that read from Firestore
- `tests/admin/` — Admin area (requires auth)

They run against the synthetic records and users in `tests/firebase/fixtures.ts` (cocktails come from `tests/firebase/cocktails.ts`), which `tests/global-setup.ts` loads into the Firebase emulators. Some tests assert exact counts, so update them alongside the fixtures.

Tests run against Mobile Chrome, Desktop Chrome, and Firefox (Safari/WebKit disabled).

Vitest unit tests live in `tests/unit/` and mock Firestore and auth.

Any server action that reads private data or changes data must call `requireAuth()` from `src/auth.ts` at the top, outside any try/catch. Protecting `/admin` pages in the proxy is not enough, because server actions can be called directly over HTTP. Add new protected actions to `tests/unit/services_auth.test.ts`.

### Accessibility and SEO

The site aims for WCAG 2.2 AA. Every change to a page or component is checked against it before committing.

- Every page is listed in `src/routes.ts`, which feeds the sitemap and the checks below. `tests/public/06_seo.spec.ts` fails if a `page.tsx` is missing from it.
- Public pages use `pageMetadata(title, description)` from `src/metadata.ts`, so each has its own title, description, Open Graph tags and share image. The root layout sets the canonical URL, and `src/app/admin/layout.tsx` keeps admin pages out of search engines.
- `tests/axe.ts` runs axe (the engine behind the axe DevTools extension) with the WCAG 2.2 AA tags. `tests/public-firestore/04_a11y.spec.ts` and `tests/admin/07_a11y.spec.ts` check every page in both colour schemes, in Chrome and Mobile Chrome. When you add a dialog, menu or other state that only appears after a click, add a test that opens it and calls `expectNoAxeViolations`.
- `pnpm test:lighthouse` runs Lighthouse CI (`lighthouserc.cjs`) on every public page. Accessibility and SEO must score 100 and best practices 90; performance only warns. Reports are written to `.lighthouseci/`. Run it through the script, never `lhci` by hand, so the app reads from the emulators.
- Colour contrast comes from the theme in `src/styles/acalat.tsx`: `autoContrast` picks the text colour on filled components, and `acalatCssVariables` darkens Mantine's dimmed, error and link colours. Use theme colours and `c="dimmed"` rather than hard-coded greys or oranges.
- Icon-only buttons need an `aria-label`. Clickable things must be real buttons or links. Never show meaning by colour alone, keep controls at least 24 by 24 pixels, underline links inside paragraphs, and announce results that appear without a page load (`role="status"` or `aria-live`). A Mantine `Modal` without a `title` needs `Modal.Root` and `<Modal.Content aria-label="...">`, as in `src/components/whiskyjournal.tsx`.

The automated checks find about half of WCAG problems. For a UI change also check by hand, in the browser against `pnpm start` and the emulators:

1. Tab through the page. Every control can be reached and used, the order makes sense, focus is always visible and never hidden behind the header, and nothing traps focus.
2. Look at it in both colour schemes, at 320 pixels wide and at 200% zoom. Nothing is cut off and the page never scrolls sideways.
3. Anything that moves can be paused, or respects `prefers-reduced-motion`.

The `a11y-seo-check` skill in `.claude/skills/` runs all of this for a change.

### Firebase emulators

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
