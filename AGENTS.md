# AGENTS.md

## Commands

```bash
pnpm dev           # Start dev server (auto-opens browser at localhost:3000)
pnpm build         # Lint + production build
pnpm test          # Format + lint + unit tests + Firebase emulator tests + build + Playwright E2E tests (full CI suite)
pnpm test-only     # The same without reformatting files or rebuilding the app
pnpm test:unit     # Vitest unit tests only (tests/unit/, no server or emulators needed)
pnpm test:e2e      # Build, then Playwright against the Firebase emulators
pnpm test:lighthouse  # Build, then Lighthouse on every public page against the Firebase emulators
pnpm test:health   # Build, then Lighthouse and internal link/image checks against the emulators
pnpm audit:dependencies  # Report production and development dependency advisories
```

`pnpm test` is `scripts/test.mts`. It stops at the first failing stage and puts a heading above each one, then ends with an `=== [Overall] ... ===` line giving the result, the stage that failed if any, and the time taken. Prettier and ESLint print a single line each, with the number of files checked. ESLint warnings fail the run, as they do in `pnpm lint` and CI. `pnpm test` caches ESLint results in `node_modules/.cache/eslint/`; CI does not. Test output is kept short: dots and a summary per stage, with console output, stack traces and server logs shown only for failing tests. `tests/reporters/summary.ts` ends the Playwright run with counts and lists any failed, skipped or flaky (passed only after a retry) tests by name. Tests that only make sense in some browsers are left out of the other Playwright projects with `testIgnore` in `playwright.config.ts`, not skipped.

Playwright tests never use production data. `pnpm test:e2e` (`scripts/e2e.mts`) builds the app, then runs `next start` and Playwright inside the Firebase emulators with the settings in `tests/test-env.ts`. Extra arguments go to Playwright, and `--no-build` reuses the last build:

```bash
pnpm test:e2e --no-build tests/public/00_initial_load.spec.ts
```

Playwright will not reuse a server already on port 3000, so stop `pnpm dev` first. Locally it runs 4 browsers at once, as more starves them and makes tests time out at random. The HTML report is not opened automatically; view it with `pnpm exec playwright show-report`.

Husky pre-commit hooks run Prettier automatically on staged files.

CI (`.github/workflows/playwright.yml`) runs the same stages as three parallel jobs: format check, lint and unit tests; the Firebase emulator tests; and Playwright with 2 workers. `dep-comment.yml` tells Dependabot PRs to run `pnpm test` locally.

`.github/workflows/monthly-health.yml` runs on the first of each month at 06:17 UTC and supports manual runs. It checks website quality against the Firebase fixtures and audits dependencies in separate jobs. Reports are kept for 90 days. Problems open or update one GitHub issue assigned to `cjrace`; a clean run closes it. Only runs on the default branch can change the alert issue. GitHub schedules start once the workflow is merged into the default branch; public repositories disable schedules after 60 days without repository activity. GitHub email delivery depends on the user's notification settings.

`scripts/generate-card-svgs.mts` writes the card images in `public/images/cards`; rerun it after changing the card design.

## Dependencies

`pnpm-workspace.yaml` holds `overrides` for security fixes and `allowBuilds` for packages allowed to run install scripts. Leave them unless a bump needs the change. `patches/` patches `firebase-tools` and `superstatic` for minimatch's named export, and `tests/unit/dependency_compatibility.test.ts` checks the patches still work, so keep it passing when updating either package.

## Branch naming

Use `deps/YYYY-MM` for monthly dependency update branches, for example `deps/2026-10`.

## PR screenshots

For visual changes, include representative before and after screenshot pairs in the PR description. Choose pages, states and viewport sizes that show the distinct changes; separate pairs for every affected page at both desktop and mobile sizes are optional. Use the same viewport and page state for each pair, and capture the full page so overflow is visible. Check all affected pages at both desktop and mobile sizes, even when only one layout needs screenshots.

Screenshots for PR descriptions go on the long-lived `pr-assets` branch, in a folder named after the PR number, and are linked as `https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/<PR number>/<file>`. Never commit them to the PR's own branch or `main`, and don't make a new branch for each PR. If `pr-assets` has gone, make it again as a branch with no code, holding only the folders and a short README.

## Architecture

**Next.js App Router** with the `src/` directory. Package manager is **pnpm**.

### Key directories

- `src/app/` — Pages using App Router conventions
  - `(homepage)/` — Home page (route group, no URL segment)
  - `admin/` — Protected admin area: whisky journal CRUD, film list CRUD, Chopin Liszt shopping list, holidays
  - `cocktails/`, `films/`, `whiskyjournal/`, `games/`, `decisionmaker/` — Public-facing features
  - `games/` holds Boom Boom Pirate, Irish Bingo, Red or Black, Snakes and Ladders, Suits and the Uno tracker. Only Uno uses Firestore
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

`src/app/cocktails/page.tsx` reads the `cocktails` collection on each request with `src/services/cocktails.ts`. There is no page for changing cocktails yet. Ratings are out of 5 in halves, and photos must be under `/images/`; `tests/firebase/rules.test.ts` checks every catalogue recipe meets the rules.

### Chopin Liszt (Firestore)

The shopping list reads and writes the `shoppingItems` collection straight from the browser (`src/components/chopinliszt.tsx`), with a live listener. Changes queue in memory while offline and are lost if the page closes with some unsent, so the page asks before unloading while any are waiting. The list needs a connection to open. The offline message also shows while the listener is serving cached data, as phones can report being online on a signal too weak to reach Firestore. The last change to reach Firestore wins, and a deleted item stays deleted. The Security Rules are the only check on these reads and writes, so test them in `tests/firebase/rules.test.ts`. The two-browser tests are in `tests/admin/04_chopinliszt_sync.spec.ts`; they share one list, so give any item a test adds a unique name.

### Uno (Firestore)

The Uno score tracker (`/games/uno-tracker`, `/games/uno-tracker/stats` and `/games/uno-tracker/history`) can be read by anyone, but only authorised users can score. Its logic is in `src/uno/` (model, controller and browser storage), and `src/services/uno.ts` holds the server actions. They use the `uno`, `unoGames` and `unoLeases` collections, which the Security Rules deny to browsers entirely. A service worker, `public/games/uno-tracker/sw.js`, caches the three pages for offline use. See `docs/uno.md` for how it works.

### UI

[Mantine](https://mantine.dev/) with a custom theme (`acalat`), dark mode by default. Icons from Tabler. PostCSS is configured for Mantine via `postcss-preset-mantine`.

Lay pages out with Mantine (`Stack`, `Group`, `SimpleGrid`, `Grid`). Use a CSS module only for shapes Mantine can't make, such as the square Snakes and Ladders board sized to the window. Write breakpoints as `@mixin larger-than $mantine-breakpoint-sm` or `@mixin smaller-than $mantine-breakpoint-sm`, not fixed widths, so they match Mantine's props. Games that fill exactly one screen wrap the page in `.screen` from `src/styles/cardgame.module.css` and let the game take the height left, using a size container like its `.table`, rather than subtracting fixed heights from `100dvh`.

### Tests

`tests/README.md` explains the test set-up for people, including how to name tests: `test.describe` for who and where, a test name saying what they see or can do, and Given/When/Then `test.step`s for long journeys. Follow it in new tests, and update it when adding a stage or folder.

Playwright E2E tests in `tests/`, split into three folders:

- `tests/public/` — Public pages, no auth needed
- `tests/public-firestore/` — Public pages that read from Firestore
- `tests/admin/` — Admin area (requires auth)

They run against the synthetic records and users in `tests/firebase/fixtures.ts` (cocktails come from `tests/firebase/cocktails.ts`), which `tests/global-setup.ts` loads into the Firebase emulators. Some tests assert exact counts, so update them alongside the fixtures.

Tests run against Mobile Chrome, Desktop Chrome and Mobile Safari (WebKit on an iPhone 14). Firefox isn't tested. Specs import `test` and `expect` from `tests/playwright.ts`, whose pages wait after `goto` and `reload` for `src/components/hydrated.tsx` to mark the page as hydrated, as WebKit wipes anything typed before then. Links between pages use Next.js `Link` for the same reason. Chopin Liszt's breadcrumbs use native links so its pending-change warning can stop navigation. Two things only differ on `localhost`, because WebKit won't use HTTPS-only settings over plain HTTP: the CSP's `upgrade-insecure-requests` is left out of `pnpm dev` and of builds with `SERVED_OVER_HTTP=true`, which `tests/test-env.ts` and the CI build set (`next.config.ts`), and the session cookie isn't `Secure` (`src/actions/signInAction.ts`).

Vitest unit tests live in `tests/unit/` and mock Firestore and auth.

Any server action that reads private data or changes data must call `requireAuth()` from `src/auth.ts` at the top, outside any try/catch. Protecting `/admin` pages in the proxy is not enough, because server actions can be called directly over HTTP. Add new protected actions to `tests/unit/services_auth.test.ts`.

### Accessibility and SEO

The site aims for WCAG 2.2 AA. Every change to a page or component is checked against it before committing.

- `src/discover-routes.ts` discovers `src/app/**/page.tsx` for the static sitemap, accessibility and SEO tests, and Lighthouse. Route groups are removed, private folders are ignored and `/admin` stays out of the sitemap. Public dynamic, parallel or intercepting pages need an explicit discovery policy before they can be added. `src/routes.ts` only holds the browser-safe site URL.
- Public pages use `pageMetadata(title, description)` from `src/metadata.ts`, so each has its own title, description, Open Graph tags and share image. The root layout sets the canonical URL, and `src/app/admin/layout.tsx` keeps admin pages out of search engines.
- `tests/axe.ts` runs axe (the engine behind the axe DevTools extension) with the WCAG 2.2 AA tags. `tests/public-firestore/04_a11y.spec.ts` and `tests/admin/07_a11y.spec.ts` check every page in both colour schemes, in Chrome and Mobile Chrome. When you add a dialog, menu or other state that only appears after a click, add a test that opens it and calls `expectNoAxeViolations`.
- `pnpm test:health` runs the monthly website checks; `pnpm test:lighthouse` runs Lighthouse alone on demand. Lighthouse collects three samples per public page and uses median scores. Accessibility and SEO must score 100 and best practices 90; performance below 80 warns and raises the monthly alert. Reports are written to `.lighthouseci/` and `health-reports/`. Run these through the scripts, never `lhci` by hand, so the app reads from the emulators. Lighthouse is separate from `pnpm test` and PR checks; axe and the explicit SEO tests stay in the normal suite.
- Colour contrast comes from the theme in `src/styles/acalat.tsx`: `autoContrast` picks the text colour on filled components, and `acalatCssVariables` darkens Mantine's dimmed, error and link colours. Use theme colours and `c="dimmed"` rather than hard-coded greys or oranges.
- Icon-only buttons need an `aria-label`. Clickable things must be real buttons or links. Never show meaning by colour alone, keep controls at least 24 by 24 pixels, underline links inside paragraphs, and announce results that appear without a page load (`role="status"` or `aria-live`). A Mantine `Modal` without a `title` needs `Modal.Root` and `<Modal.Content aria-label="...">`, as in `src/components/whiskyjournal.tsx`.

The automated checks find about half of WCAG problems, so whenever you run them for a change to a page or component, also check by hand in the browser. This is not optional: report the result of each check, and if one cannot be run, say which and why.

Check the pages the change affects. A change to shared code (`src/app/layout.tsx`, `src/components/header.tsx`, `src/styles/`, the theme, or a component used on several pages) affects every page, so check them all. A change to one page or a component only it uses needs only that page, including any states the change touches, such as a dialog or a game in progress.

Start the app with `pnpm serve:test`, which serves the last build against the emulators loaded with the test fixtures (in the desktop app, start `almostyellow-emulators` from `.claude/launch.json`). Then, on each affected page:

1. **Keyboard:** tab through the page and use every control with Enter or Space. The order makes sense, focus is always visible, nothing traps focus, and focus is never lost to the top of the page after an action, such as when a button is disabled or replaced, or a dialog closes.
2. **Both colour schemes:** look again after using "Toggle color scheme".
3. **Reflow and zoom:** at 320 pixels wide and at 200% zoom, nothing is cut off, overlaps or scrolls sideways.
4. **Announcements:** results that appear without a page load are in a `role="status"` region, and dialogs have a name.
5. **Motion:** nothing flashes more than three times a second, and animations stop under `prefers-reduced-motion`.

The `a11y-seo-check` skill in `.claude/skills/` runs all of this for a change.

### Firebase emulators

The Firebase work is tested against the local Auth and Firestore emulators, never a real project. Java 21 or later must be installed for the Firestore emulator.

```bash
pnpm test:rules        # Security Rules tests, project demo-almostyellow
pnpm test:firebase     # Everything under tests/firebase, project demo-almostyellow-ci
pnpm test:firebase:run # The same against emulators you started with pnpm emulators
pnpm emulators         # Start the emulators by hand, for example while writing tests
```

- `firebase.json`, `firestore.rules` and `firestore.indexes.json` configure the emulators and rules.
- `tests/firebase/fixtures.ts` holds the synthetic users and records, and `tests/firebase/seed.ts` resets the emulators to them. Seeding happens before every test, so each starts from the same data.
- `tests/firebase/guard.ts` refuses to run unless the project is one of the two `demo-` projects, both emulator hosts are local, Security Rules are loaded and no Google or Firebase credentials are set. Its own tests are in `tests/unit/firebase_guard.test.ts`.
- `pnpm test` and `pnpm test-only` run `pnpm test:firebase` after the unit tests, so Java is needed for them. The emulators use fixed ports (8080 and 9099), so stop `pnpm emulators` first. The files share one emulator, so they run one at a time.
