import { defineConfig } from "@playwright/test";
import lighthouse from "./playwright.lighthouse.config";

export default defineConfig({
  ...lighthouse,
  testMatch: "*.spec.ts",
  outputDir: "test-results/health",
  reporter: [
    ["list"],
    ["json", { outputFile: "health-reports/browser-results.json" }],
  ],
});
