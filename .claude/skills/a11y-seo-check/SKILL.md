---
name: a11y-seo-check
description: Check a change to Almost Yellow's pages or components against WCAG 2.2 AA and the site's SEO rules, with axe, Lighthouse and a keyboard and zoom pass in the browser. Use before committing any UI change, or when asked for an accessibility or SEO check.
---

# Accessibility and SEO check

The rules are in the "Accessibility and SEO" section of AGENTS.md. This is the routine for checking a change against them.

## 1. Work out what changed

Run `git diff main --name-only`. Map each changed page or component to the routes that show it, using `src/routes.ts`. A change to `src/app/layout.tsx`, `src/components/header.tsx` or `src/styles/` affects every page.

If the change adds a page, check that it is in `src/routes.ts` and uses `pageMetadata` from `src/metadata.ts` (public pages only).

## 2. Run the automated checks

Stop any dev server first, as these need ports 3000, 8080 and 9099.

```bash
pnpm test:e2e tests/public/06_seo.spec.ts tests/public-firestore/04_a11y.spec.ts tests/admin/07_a11y.spec.ts
```

Add `--no-build` if nothing has changed since the last build, or `-g` to check only some pages. Write the route without its leading slash, such as `-g "games.uno"`, as Playwright reads a pattern starting with `/` as a regular expression. Each axe failure gives the rule, the element, its HTML and a link explaining the fix.

Then run Lighthouse on the public pages. It takes a few minutes:

```bash
pnpm test:lighthouse --no-build
```

Accessibility and SEO must score 100. If a score drops, open the HTML report in `.lighthouseci/` to see which audit failed.

If the change adds a dialog, menu, form error or other state that only appears after a click, add a test for that state to the a11y spec, and check that it fails before your fix.

## 3. Check by hand in the browser

Automated tools find about half of WCAG problems, so look at the pages too. Never point the app at production data to do this:

1. Run `pnpm emulators` in one terminal.
2. In another, set `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` and every variable in `tests/test-env.ts`, then run `pnpm start` after a build.

The emulators start empty this way, so Firestore pages show no records. The automated checks cover those pages with the fixtures loaded.

Then use the built-in browser on each affected route:

1. **Keyboard (2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11):** press Tab from the top of the page. Check that the skip link appears first, every control can be reached and used with Enter or Space, the order follows the layout, the focus ring is always visible and never under the sticky header, and Escape closes dialogs and returns focus.
2. **Both colour schemes:** use the "Toggle color scheme" button and look again. Contrast problems often show in only one scheme.
3. **Reflow and zoom (1.4.4, 1.4.10):** resize to 320 pixels wide (`resize_window`), then check desktop at 200% zoom. Nothing overlaps, is cut off or needs sideways scrolling.
4. **Target size (2.5.8):** small icon buttons are at least 24 by 24 pixels. Check with `javascript_tool` and `getBoundingClientRect()`.
5. **Status messages (4.1.3):** results that appear without a page load, such as a decision, a game result or a saved item, sit in an element with `role="status"` or `aria-live`.
6. **Colour alone (1.4.1):** meaning is never shown only by colour, for example a card's suit or a selected option.

## 4. Report

List each problem with its WCAG criterion number, the route and the element, and say whether you fixed it. Say which checks you ran and which you could not run.
