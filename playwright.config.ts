import { defineConfig, devices } from "@playwright/test";
/* Point at the Firebase emulators, never production */
import "./tests/test-env";

/* Vitest and Lighthouse have separate runners. */
const vitestTests = ["unit/**", "firebase/**", "lighthouse/**"];
/* Uno scoring changes one shared scoreboard, and SEO is browser-independent,
   so only desktop Chrome runs them. Each project's testIgnore replaces the
   top-level one, hence vitestTests. */
const sharedScoreboard = [
  ...vitestTests,
  "**/admin/07_uno.spec.ts",
  "**/public/06_seo.spec.ts",
];
/* Service-worker evaluation needs Chromium. axe checks both Chrome layouts. */
const serviceWorker = [
  ...sharedScoreboard,
  "**/public/06_uno_offline.spec.ts",
  "**/04_a11y.spec.ts",
  "**/07_a11y.spec.ts",
];

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
  /* More than 4 browsers alongside the app and the Firebase emulators starves
     them, and tests time out at random. CI has fewer cores than that. */
  workers: process.env.CI ? 2 : 4,
  /* Never serve the report at the end of a run: it waits for Ctrl+C, which
     keeps the emulators running and blocks the next run.
     Open it with "pnpm exec playwright show-report". */
  reporter: [
    ["dot"],
    ["html", { open: "never" }],
    ["./tests/reporters/summary.ts"],
  ],
  /* Extra slack on assertions; the default 5s races with App Router renders. */
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
    /* Every browser on an iPhone uses WebKit, Chrome included */
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 14"],
      },
      testIgnore: serviceWorker,
    },
  ],

  // Run local server before starting the tests. Never reuse one already
  // running, as a dev server would be pointing at the production database.
  webServer: {
    // Runs next start, hiding the error 03_server_actions causes on purpose
    command: "node scripts/serve-test.mts",
    url: "http://localhost:3000/",
    reuseExistingServer: false,
  },
});
