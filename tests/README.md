# Tests

`pnpm test` checks everything before a change goes in. It runs five stages in order and stops at the first one that fails. None of them touch the real website's data: the Firebase tests and the end-to-end tests run against local copies of Firebase (the emulators), filled with made-up records.

## What runs, and what each stage protects

| Stage               | What it catches                                                                                                                                                           | Where                                    | Run it on its own                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| 1. Formatting       | Inconsistent layout. Prettier rewrites files to one style.                                                                                                                | Every file                               | `pnpm pretty` (or `pnpm pretty-check` to look)       |
| 2. Linting          | Mistakes that can be spotted without running anything, such as a promise nobody waits for, a hook used wrongly or an image without a text alternative. Warnings fail too. | Every file                               | `pnpm lint`                                          |
| 3. Unit tests       | Logic working on its own: the card deck, Uno scoring, sign-in checks, and that every protected server action asks for a session.                                          | `unit/`                                  | `pnpm test:unit`                                     |
| 4. Firebase tests   | Who can read and change which data (the Security Rules), and that the server actions save exactly what they should.                                                       | `firebase/`                              | `pnpm test:firebase` (rules only: `pnpm test:rules`) |
| 5. End-to-end tests | The site as people use it, clicking through real browsers: Chrome on a phone, Chrome on a desktop, and Safari on an iPhone.                                               | `public/`, `public-firestore/`, `admin/` | `pnpm test:e2e`                                      |

`pnpm test-only` runs the same checks without reformatting files or rebuilding the app, which is quicker when nothing outside the tests has changed.

## What you need

- Node and pnpm, as for the rest of the project.
- Java 21 or later for the Firestore emulator (stages 4 and 5). The [main README](../README.md#what-you-need-installed) says how to install it.
- Ports 3000, 8080 and 9099 free, so stop `pnpm dev` and `pnpm emulators` first.

## Reading the output

Each stage starts with a heading such as `=== [3/5] Unit tests with Vitest ===`. Passing tests print a dot each; anything that fails prints its details. The end-to-end stage finishes with a count of passed, failed, skipped and flaky tests (flaky means it passed only after a retry), listing any that need a look by name. The last line always says how the whole run went:

```
=== [Overall] All checks passed in 5m 27s ===
=== [Overall] Failed at 3/5 Unit tests with Vitest after 1m 12s ===
```

To see screenshots, traces and each step of an end-to-end test, open the report with `pnpm exec playwright show-report`.

## What's in this folder

| Path                | What it holds                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `unit/`             | Unit tests. Firestore and sign-in are replaced with stand-ins, so these need nothing else running.                          |
| `firebase/`         | Firebase emulator tests, plus the made-up records (`fixtures.ts`, `cocktails.ts`) and the code that loads them (`seed.ts`). |
| `public/`           | End-to-end tests of pages anyone can use without Firebase, such as the games and the decision maker.                        |
| `public-firestore/` | End-to-end tests of public pages that read from Firebase: the whisky journal, film list and cocktails.                      |
| `admin/`            | End-to-end tests of the signed-in admin area, including sign-in itself.                                                     |
| `reporters/`        | The summary printed at the end of the end-to-end stage.                                                                     |
| `global-setup.ts`   | Loads the made-up users and records into the emulators before the end-to-end tests start.                                   |
| `test-env.ts`       | Points every test at the emulators.                                                                                         |
| `playwright.ts`     | Playwright for the end-to-end tests, with pages that wait for the site to be ready before a test types into them.           |

## Keeping real data safe

`firebase/guard.ts` refuses to run any Firebase test unless it is pointed at a local emulator with a `demo-` project and no real credentials are set. The end-to-end tests never reuse a server that is already running, because a dev server would be connected to the real database.

Admin end-to-end tests run at the same time and share one set of data, so a test that adds something gives it a unique name and only changes what it added.

## Writing a test

Write tests so that someone who has never seen the code can tell what a person can do, and what went wrong when one fails.

- **Group by who and where** with `test.describe`, for example `"A visitor on the decision maker"`.
- **Name the test after what that person sees or can do**, so the group and the name read as one sentence: _A visitor on the decision maker_ › _is asked for at least two options first_.
- **Split long journeys into steps** with `test.step`, phrased as Given (the starting point), When (what the person does) and Then (what they see). The steps show in the report, so a failure points at the stage that broke:

  ```ts
  await test.step("When they edit it, the change shows", async () => {
    // ...
  });
  ```

- **Use comments for why**, not for what the next line does.
- **Import `test` and `expect` from `../playwright`**, not `@playwright/test`. Its pages wait after `goto` and `reload` until React has taken over the page. Safari is slower to get there, and anything typed before then is wiped. A page you open yourself with `newPage()` needs `waitsForHydration(page)`, and a link to another page should be a Next.js `Link`, so it opens without a full page load.
- **If a test can only run in some browsers**, leave it out of the others with `testIgnore` in `playwright.config.ts` rather than skipping it, so the summary only lists real skips.

Unit and Firebase tests describe the code rather than a person (`describe("signInAction")`), but their names still say what should happen, such as `"rejects an expired session"`.

### Test files share their imports

The Vitest configs set `isolate: false`, so test files that run in the same worker share imported modules instead of loading them again. That is much faster, but a module that keeps state (a cached Firebase app or Firestore instance, a channel, a list filled at import time) keeps it from one file to the next. `src/firebase/client.ts` and `src/uno/browser.ts` do this today, and no test imports them. The Admin SDK app in `src/firebase/admin.ts` is shared too, which is safe because every Firebase test uses the same demo project.

If you write a test that imports a module like that, or one that changes `process.env`, either put things back in an `afterEach` or set `isolate: true` in that Vitest config. A sign something is leaking is a test that fails only in the full run. To check, run `pnpm exec vitest run --sequence.shuffle` a few times, which mixes up the order of files and tests.
