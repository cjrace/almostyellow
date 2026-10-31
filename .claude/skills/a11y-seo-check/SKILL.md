---
name: a11y-seo-check
description: Check a change to Almost Yellow's pages or components against WCAG 2.2 AA and the site's SEO rules, with axe, Lighthouse and a hand check in the browser of the pages the change affects. Use before committing any UI change, or when asked for an accessibility or SEO check.
---

# Accessibility and SEO check

The rules are in the "Accessibility and SEO" section of AGENTS.md. This is the routine for checking a change against them. Every step is required, including the hand checks in step 3.

## 1. Work out which pages the change affects

Run `git diff main --name-only` and map each changed file to the routes that show it, using `src/routes.ts`.

- **Shared code means every page:** `src/app/layout.tsx`, `src/components/header.tsx`, anything in `src/styles/`, the theme, or a component used on several pages (search `src/` for its imports).
- **One page means that page only:** a page, or a component only it uses. Include any states the change touches, such as a dialog, a form error or a game in progress.

If the change adds a page, check that it is in `src/routes.ts` and that a public page uses `pageMetadata` from `src/metadata.ts`.

## 2. Run the automated checks

Stop any running server first, as these need ports 3000, 8080 and 9099.

```bash
pnpm test:e2e tests/public/06_seo.spec.ts tests/public-firestore/04_a11y.spec.ts tests/admin/07_a11y.spec.ts
```

Add `--no-build` if nothing has changed since the last build. Use `-g` to check only the affected pages, writing the route without its leading slash, such as `-g "games.uno"`, as Playwright reads a pattern starting with `/` as a regular expression. Each axe failure gives the rule, the element, its HTML and a link explaining the fix.

If any public page is affected, run Lighthouse too. It takes a few minutes:

```bash
pnpm test:lighthouse --no-build
```

Accessibility and SEO must score 100. If a score drops, open the HTML report in `.lighthouseci/` to see which audit failed.

If the change adds a dialog, menu, form error or other state that only appears after a click, add a test for that state to the a11y spec, and check that it fails before your fix.

## 3. Check the affected pages by hand

Automated tools find about half of WCAG problems, and miss lost focus, clipped text and flashing completely.

Start the app with `pnpm serve:test --no-build`. It serves the last build against the Firebase emulators, loaded with the test fixtures, and never touches production data. In the desktop app, use `preview_start` with `almostyellow-emulators`. Then, in the built-in browser, on each affected page:

1. **Keyboard (2.1.1, 2.1.2, 2.4.3, 2.4.7):**
   - Press Tab from the top. The skip link comes first, and every control can be reached and used with Enter or Space, in an order that follows the layout.
   - Focus is always visible, Escape closes dialogs, and nothing traps focus.
   - After each action, focus stays somewhere sensible rather than falling back to the top of the page. Watch for buttons that are disabled or replaced, and dialogs that close.
   - To see where focus goes, add a `focusin` listener with `javascript_tool` that records `document.activeElement`. Read styles a moment after focus moves, as Mantine fades borders in over 100ms.
2. **Both colour schemes:** use "Toggle color scheme" and look again. Focus rings and outline buttons in particular need 3:1 against the background (1.4.11).
3. **Reflow and zoom (1.4.4, 1.4.10):** use `resize_window` at 320 by 700 and check that `document.documentElement.scrollWidth` is no wider than the window, and that no button text is cut off. Then check desktop at 200% zoom.
4. **Target size (2.5.8):** controls are at least 24 by 24 pixels (`getBoundingClientRect()`), apart from links within a sentence.
5. **Announcements (4.1.3, 4.1.2):** results that appear without a page load, such as a decision, a game move or a saved item, sit in a `role="status"` element that exists before the result appears. Dialogs and their close buttons have names.
6. **Colour and images (1.4.1, 1.1.1):** meaning is never shown by colour alone, and emoji or icons that carry meaning have a text name.
7. **Motion (2.3.1, 2.2.2):** nothing flashes more than three times a second, and animations stop under `prefers-reduced-motion`.

Reset the window with `resize_window` preset `desktop` when you finish. Stop the server with Ctrl+C. On Windows, stopping it from a background task can leave `next start` and the emulators running, so check that ports 3000, 8080 and 9099 are free before the next test run, and stop any leftover processes on them.

The built-in browser does not draw while its pane is hidden, so Mantine dialogs and other transitions may never appear there. Check those states with a Playwright test instead, as in the keyboard focus tests in `tests/public-firestore/04_a11y.spec.ts`.

## 4. Report

List the pages you checked and why that scope. For each check, give the result. List each problem with its WCAG criterion number, the route and the element, and say whether you fixed it. If you could not run a check, say which one and why. Never leave a check out silently.
