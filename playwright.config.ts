import { defineConfig, devices } from "@playwright/test";
/* Point at the Docker test database, never the production one in .env */
import "./tests/test-env";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Unit and Firebase emulator tests are run by Vitest */
  testIgnore: ["unit/**", "firebase/**"],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on all environments to reduce flakiness */
  retries: 3,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
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
  },
});
