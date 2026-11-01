import { defineConfig, devices } from "@playwright/test";
/* Point at the Firebase emulators, never production */
import "./tests/test-env";

/* Unit and Firebase emulator tests are run by Vitest */
const vitestTests = ["unit/**", "firebase/**"];
/* The Uno scoring tests change one shared scoreboard, so only one project runs
   them. A project's testIgnore replaces the top-level one, hence vitestTests. */
const sharedScoreboard = [...vitestTests, "**/admin/07_uno.spec.ts"];
/* Service-worker evaluation is only available in Chromium */
const serviceWorker = [...sharedScoreboard, "**/public/04_uno_offline.spec.ts"];

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  testIgnore: vitestTests,
  /* Loads the synthetic users into the Firebase emulators */
  globalSetup: "./tests/global-setup.ts",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on all environments to reduce flakiness */
  retries: 3,
  /* Opt out of parallel tests on CI. Locally, more than 4 browsers alongside
     the app and the Firebase emulators starves Firefox, which then
     times out at random. */
  workers: process.env.CI ? 1 : 4,
  /* Never serve the report at the end of a run: it waits for Ctrl+C, which
     keeps the emulators running and blocks the next run.
     Open it with "pnpm exec playwright show-report". */
  reporter: [
    ["dot"],
    ["html", { open: "never" }],
    ["./tests/reporters/summary.ts"],
  ],
  /* Give Firefox extra slack on assertions; default 5s races with App Router renders. */
  expect: {
    timeout: 10_000,
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000/",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    /* Test against different browsers we use */
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 8"],
      },
      testIgnore: sharedScoreboard,
    },
    {
      name: "Google Chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
      testIgnore: serviceWorker,
    },
    /* TODO: Fix these - seems to work on Laura's phone in real life but the tests are having none of it
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
      },
    },
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 14"],
      },
    },
  */
  ],

  // Run local server before starting the tests. Never reuse one already
  // running, as a dev server would be pointing at the production database.
  webServer: {
    command: "next start",
    url: "http://localhost:3000/",
    reuseExistingServer: false,
    // 03_server_actions posts an unknown Server Action ID on purpose, which the
    // server logs as an error on every run
    stderr: "ignore",
  },
});
