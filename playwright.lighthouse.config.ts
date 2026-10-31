import { defineConfig } from "@playwright/test";
/* Point at the Firebase emulators, never production */
import "./tests/test-env";

// Runs Lighthouse against every public page, through scripts/lighthouse.mts.
// Playwright seeds the emulators and starts the app, as for the other tests.
export default defineConfig({
  testDir: "./tests/lighthouse",
  globalSetup: "./tests/global-setup.ts",
  workers: 1,
  retries: 0,
  timeout: 15 * 60_000,
  reporter: "list",
  use: { baseURL: "http://localhost:3000/" },
  webServer: {
    command: "next start",
    url: "http://localhost:3000/",
    reuseExistingServer: false,
  },
});
