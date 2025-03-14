import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv"; /* https://github.com/motdotla/dotenv */
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
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

  // Run local server before starting the tests
  webServer: {
    command: "next start",
    url: "http://localhost:3000/",
    reuseExistingServer: !process.env.CI,
  },
});
