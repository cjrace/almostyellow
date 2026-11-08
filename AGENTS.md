# AGENTS.md

## Commands

```bash
pnpm dev           # Start dev server on port 3000, or the next free one, and open the browser (--no-open to skip that)
pnpm build         # Lint + production build
pnpm test          # Format + lint + unit tests + Firebase emulator tests + build + Playwright E2E tests (full CI suite)
pnpm test-only     # The same without reformatting files or rebuilding the app
pnpm test:unit     # Vitest unit tests only (tests/unit/, no server or emulators needed)
pnpm test:e2e      # Build, then Playwright against the Firebase emulators
pnpm serve:test    # Preview the app against Firebase emulators with synthetic fixtures
```

`pnpm test` is `scripts/test.mts`. It stops at the first failing stage and puts a heading above each one, then ends with an `=== [Overall] ... ===` line giving the result, the stage that failed if any, and the time taken. Prettier and ESLint print a single line each, with the number of files checked. ESLint warnings fail the run, as they do in `pnpm lint` and CI. `pnpm test` caches ESLint results in `node_modules/.cache/eslint/`; CI does not. Test output is kept short: dots and a summary per stage, with console output, stack traces and server logs shown only for failing tests. `tests/reporters/summary.ts` ends the Playwright run with counts and lists any failed, skipped or flaky (passed only after a retry) tests by name. Tests that only make sense in some browsers are left out of the other Playwright projects with `testIgnore` in `playwright.config.ts`, not skipped.

Playwright tests never use production data. `pnpm test:e2e` (`scripts/e2e.mts`) builds the app, then runs `next start` and Playwright inside the Firebase emulators with the settings in `tests/test-env.ts`. Extra arguments go to Playwright, and `--no-build` reuses the last build:

```bash
pnpm test:e2e --no-build tests/public/00_initial_load.spec.ts
```

Playwright never reuses a server already running, so a dev server cannot be mistaken for the test one. The app (3000) and the emulators (8080 and 9099, plus the Firebase hub on 4400 and log on 4500) use those ports when they are free, as on CI. When any is busy, such as another worktree or session running, `scripts/ports.mts` moves all of them up together by 10 until a set is free, shares it with everything the run starts (`E2E_PORT_OFFSET` and `PORT`), and says so; set `E2E_PORT_OFFSET` to choose one yourself. Specs and the config take the site's address from `tests/ports.mts` (`BASE_URL`, `ENCODED_BASE_URL` for a `callbackUrl` in a URL), never a written-out `localhost:3000`. `pnpm serve:test` and `pnpm dev` print the address they end up on, so read it rather than assuming 3000, and pass `--no-open` to `pnpm dev` in an automated session. Locally it runs 4 browsers at once, as more starves them and makes tests time out at random. The HTML report is not opened automatically; view it with `pnpm exec playwright show-report`.

Suggestion: let CI run the Playwright tests rather than running them locally, as a push gives feedback sooner than a local build and run, and a full run builds the app, starts the emulators and keeps the machine busy for several minutes. Run single specs locally only when working out a failure.

Husky pre-commit hooks run Prettier automatically on staged files.

CI (`.github/workflows/playwright.yml`) runs format, lint and unit tests, Firebase tests, and four Playwright shards in parallel. Each shard has its own emulators and 2 workers. A final job merges their reports and requires every shard to pass. `dep-comment.yml` tells Dependabot PRs to run `pnpm test` locally.

`scripts/generate-card-svgs.mts` writes the card images in `public/images/cards`; rerun it after changing the card design.
`scripts/generate-uno-svgs.mts` does the same for the Uno faces in `public/images/uno` (`node scripts/generate-uno-svgs.mts`). `tests/unit/unogame_cards.test.ts` checks the images match the engine's cards.

## Dependencies

`pnpm-workspace.yaml` holds `overrides` for security fixes and `allowBuilds` for packages allowed to run install scripts. Leave them unless a bump needs the change. `patches/` patches `firebase-tools` and `superstatic` for minimatch's named export, and `tests/unit/dependency_compatibility.test.ts` checks the patches still work, so keep it passing when updating either package. The CI browser shards run in the `mcr.microsoft.com/playwright` image, whose tag (for example `v1.64.1-noble`) must match the `@playwright/test` version in `package.json`. When bumping `@playwright/test`, change the tag in `.github/workflows/playwright.yml` in the same PR, and check the tag exists on MCR. Dependabot does not update it.

## Branch naming

Use `deps/YYYY-MM` for monthly dependency update branches, for example `deps/2026-10`.

## PR screenshots

For a new feature, show representative images of the new screens and prioritise its main interaction. Before and after images are not needed when there is no useful previous version to compare. For changes to existing screens, include matching before and after pairs where they help explain the change.

Use Cam and Laura as player names in PR screenshots. Keep artificial stress-test names in automated tests rather than published screenshots. Capture full pages so overflow is visible, and include desktop and mobile views when layouts differ. Show both colour schemes or interaction states when they explain distinct behaviour.

Choose pages, states and viewport sizes that show the distinct changes. Use the same viewport and page state for each before and after pair. Shared changes need representative examples of each affected layout rather than screenshots of every page.

Screenshots for PR descriptions go on the long-lived `pr-assets` branch, in a folder named after the PR number, and are linked as `https://raw.githubusercontent.com/cjrace/almostyellow/pr-assets/<PR number>/<file>`. Never commit them to the PR's own branch or `main`, and don't make a new branch for each PR. If `pr-assets` has gone, make it again as a branch with no code, holding only the folders and a short README.

## Architecture

**Next.js App Router** with the `src/` directory. Package manager is **pnpm**.

### Key directories

- `src/app/` — Pages using App Router conventions
  - `(homepage)/` — Home page (route group, no URL segment)
  - `admin/` — Protected admin area: whisky journal CRUD, film list CRUD, Chopin Liszt shopping list, holidays
  - `cocktails/`, `films/`, `whiskyjournal/`, `games/`, `decisionmaker/` — Public-facing features
  - `games/` holds Boom Boom Pirate, Cow race, Irish Bingo, Red or Black, Snakes and Ladders, Suits, the Uno tracker, online Uno and the quiz buzzer. Both Uno pages and the buzzer use Firestore
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

### Cow race

The spectator race at `/games/cowrace` (`src/components/cowrace.tsx`) needs no server. `src/cowrace/race.ts` pre-rolls the whole race when it starts, with per-cow stretches and distinct finish times, so there are no ties and the finishing order is known up front. The animation only plays the plan back: a `requestAnimationFrame` loop writes `--p` (0 to 1) straight onto each cow, and the CSS places the cow with `calc(var(--p) * (100% - var(--cow-width)))`, so a finished cow touches the finish line at any width. Reduced motion steps the cows and skips confetti.

### Uno (Firestore)

The Uno score tracker (`/games/uno-tracker`, `/games/uno-tracker/stats` and `/games/uno-tracker/history`) can be read by anyone, but only authorised users can score. Its logic is in `src/uno/` (model, controller and browser storage), and `src/services/uno.ts` holds the server actions. They use the `uno`, `unoGames` and `unoLeases` collections, which the Security Rules deny to browsers entirely. A service worker, `public/games/uno-tracker/sw.js`, caches the three pages for offline use. See `docs/uno.md` for how it works.

### Quiz buzzer (Firestore)

The buzzer at `/games/buzzer` uses protected host actions in `src/actions/buzzer.ts` and guest POST commands in `src/app/api/buzzer/route.ts`. Host actions require an authorised session and room ownership. Joining uses a server-issued, room-specific HttpOnly cookie to create a guest only after membership is accepted; leave and buzz commands verify room-scoped Firebase ID tokens and membership. Keep public Firebase sign-ups disabled. The room transactions are in `src/rooms/service.ts`, with browser subscriptions and timestamp ordering in `src/buzzer/`. Browser writes are denied. Guest authentication persists in a separate named Firebase app for each room, independent of the default admin app. Buzzes are never queued offline.

Rooms expire after six hours. Authorised room creation performs bounded cleanup of expired records; there is no TTL policy. See `docs/buzzer.md` for behaviour and recovery, and the buzzer unit, Firebase and browser tests for concurrency and privacy coverage.

### Online Uno (Firestore)

Online Uno at `/games/uno` (`src/components/uno.tsx`) shares the buzzer's rooms, guest sign-in, expiry and cleanup in `src/rooms/`, told apart by a `game` field on the room. Host actions (start, remove, end round, end room, save to tracker) are in `src/actions/unoroom.ts` and require an authorised session and room ownership. Guest commands go to `src/app/api/uno/route.ts`, with Uno-only cookies, UIDs and token claims, so a buzzer sign-in does nothing in an Uno room. `src/unogame/engine/` is a pure rules engine, and `src/unogame/service.ts` runs it inside Firestore transactions. The full round stays in `roomPrivate`; each player can read only their own hand in `roomHands`, and finished rounds are kept for seven days in `roomResults`. Browser writes are denied. A room of two players can be saved to the Uno tracker as one historic game. A shared room link shows `public/images/uno-challenge.jpg` (1200 by 630, under 300 KB for WhatsApp), set through the optional image argument of `pageMetadata`. See `docs/unogame.md`.

### UI

[Mantine](https://mantine.dev/) with a custom theme (`acalat`), dark mode by default. Icons from Tabler. PostCSS is configured for Mantine via `postcss-preset-mantine`.

Lay pages out with Mantine (`Stack`, `Group`, `SimpleGrid`, `Grid`). Use a CSS module only for shapes Mantine can't make, such as the square Snakes and Ladders board sized to the window. Write breakpoints as `@mixin larger-than $mantine-breakpoint-sm` or `@mixin smaller-than $mantine-breakpoint-sm`, not fixed widths, so they match Mantine's props. Games that fill exactly one screen wrap the page in `.screen` from `src/styles/cardgame.module.css` and let the game take the height left, using a size container like its `.table`, rather than subtracting fixed heights from `100dvh`.

`src/styles/global.css` reserves a permanent `2.5rem` bottom gap for the confetti credit, including in dialogs and drawers. Screen-filling games use `--site-frame-bottom` so their controls fit above it; fixed controls use `--confetti-gap`.

### Tests

`tests/README.md` explains the test set-up for people, including how to name tests: `test.describe` for who and where, a test name saying what they see or can do, and Given/When/Then `test.step`s for long journeys. Follow it in new tests, and update it when adding a stage or folder.

Playwright E2E tests in `tests/`, split into three folders:

- `tests/public/` — Public pages, no auth needed
- `tests/public-firestore/` — Public pages that read from Firestore
- `tests/admin/` — Admin area (requires auth)

They run against the synthetic records and users in `tests/firebase/fixtures.ts` (cocktails come from `tests/firebase/cocktails.ts`), which `tests/global-setup.ts` loads into the Firebase emulators. Some tests assert exact counts, so update them alongside the fixtures.

Tests run against Mobile Chrome (Pixel 9), Desktop Chrome (1280×800) and Mobile Safari (iPhone 17). Phone tests use the presets' browser viewports; short-desktop checks use 1366×650. `@phone` and `@desktop` tags restrict layout-specific journeys to the appropriate projects. Firefox isn't tested. Specs import `test` and `expect` from `tests/playwright.ts`, whose pages wait after `goto` and `reload` for `src/components/hydrated.tsx` to mark the page as hydrated, as WebKit wipes anything typed before then. Links between pages use Next.js `Link` for the same reason. Chopin Liszt's breadcrumbs use native links so its pending-change warning can stop navigation. Two things only differ on `localhost`, because WebKit won't use HTTPS-only settings over plain HTTP: the CSP's `upgrade-insecure-requests` is left out of `pnpm dev` and of builds with `SERVED_OVER_HTTP=true`, which `tests/test-env.ts` and the CI build set (`next.config.ts`), and the session cookie isn't `Secure` (`src/actions/signInAction.ts`).

Vitest unit tests live in `tests/unit/` and mock Firestore and auth.

Any server action that reads private data or changes data must call `requireAuth()` from `src/auth.ts` at the top, outside any try/catch. Protecting `/admin` pages in the proxy is not enough, because server actions can be called directly over HTTP. Add new protected actions to `tests/unit/services_auth.test.ts`.

### Accessibility and SEO

The site aims for WCAG 2.2 AA. Check the accessibility and SEO behaviour a change can affect, with coverage proportionate to its scope.

- `src/discover-routes.ts` discovers `src/app/**/page.tsx` for the static sitemap, accessibility and SEO tests. Route groups are removed, private folders are ignored and `/admin` stays out of the sitemap. Public dynamic, parallel or intercepting pages need an explicit discovery policy before they can be added. `src/routes.ts` only holds the browser-safe site URL.
- Public pages use `pageMetadata(title, description)` from `src/metadata.ts`, so each has its own title, description, Open Graph tags and share image. The root layout sets the canonical URL, and `src/app/admin/layout.tsx` keeps admin pages out of search engines.
- `tests/axe.ts` runs axe (the engine behind the axe DevTools extension) with the WCAG 2.2 AA tags. `tests/public-firestore/04_a11y.spec.ts` and `tests/admin/07_a11y.spec.ts` check representative page layouts and interactive states in both colour schemes, in Desktop Chrome only. Mobile journeys retain focus, accessible-name and announcement assertions. When you add a dialog, menu or other state that only appears after a click, add a test that opens it and calls `expectNoUnexpectedAxeViolations`.
- Keep the original filled-control colours and white text/icons. `tests/contrast-exceptions.ts` lists the approved foreground/background pairs; `tests/axe.ts` accepts them only within filled buttons, action icons, badges and selected choices, and records each exception in the report. These combinations may fall below WCAG AA contrast requirements. Other contrast findings and accessibility rules still fail. Do not extend the exceptions without agreement. `acalatCssVariables` in `src/styles/acalat.tsx` improves dimmed, error and link colours; use theme colours and `c="dimmed"` rather than hard-coded greys or oranges.
- Icon-only buttons need an `aria-label`. Clickable things must be real buttons or links. Never show meaning by colour alone, keep controls at least 24 by 24 pixels, underline links inside paragraphs, and announce results that appear without a page load (`role="status"` or `aria-live`). A Mantine `Modal` without a `title` needs `Modal.Root` and `<Modal.Content aria-label="...">`, as in `src/components/whiskyjournal.tsx`.

Automated checks do not establish complete WCAG conformance. For UI changes, supplement relevant tests with a focused browser check of the changed behaviour. Report what was checked and any checks that could not run.

Follow component and CSS imports to identify affected routes. A page-specific CSS module only affects the pages that use it. For shared layout, theme or component changes, run the relevant automated coverage across consumers and inspect representative pages for each distinct layout or interaction. Expand the checks when a failure or wider risk justifies it.

Use `pnpm serve:test` to build and preview against the emulators with synthetic fixtures; add `--no-build` to reuse an unchanged build. Choose the checks relevant to the change:

- **Controls and focus:** use the changed controls by keyboard, including focus after actions and closing dialogs.
- **Colours:** inspect both colour schemes when changing colours, focus indicators or component appearance.
- **Layout and typography:** check the iPhone 17 and Pixel 9 viewports and 200% zoom for clipping, overlap and horizontal overflow.
- **Dynamic content:** check accessible names and announcements when changing dialogs, errors or results.
- **Animation:** check reduced motion and flashing when changing effects or timing.

Documentation-only changes do not need browser checks.

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
- `pnpm test` and `pnpm test-only` run `pnpm test:firebase` after the unit tests, so Java is needed for them. `pnpm test:firebase` and `pnpm test:rules` pick free ports the same way (`scripts/emulators.mts`); `pnpm emulators` by hand always uses the ports in `firebase.json` (8080 and 9099), so stop it first. The files share one emulator, so they run one at a time.
