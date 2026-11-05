import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { discoverRoutes } from "../../src/discover-routes";
import { lighthouseReport, writeHealthReport } from "./reports";
const { publicRoutes } = discoverRoutes();

// Lighthouse opens its own Chrome, so this only needs the app Playwright has
// started. The scores it must reach are in lighthouserc.cjs.
test("Every public page passes Lighthouse", () => {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/@lhci/cli/src/cli.js",
      "autorun",
      "--config=lighthouserc.cjs",
      ...publicRoutes.map(
        ({ path }) => `--collect.url=http://localhost:3000${path}`,
      ),
    ],
    { stdio: "inherit" },
  );
  const report = lighthouseReport(".lighthouseci");
  writeHealthReport("lighthouse.md", report.markdown);
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `performance_warning=${String(report.performanceWarning)}\n`,
    );
  expect(result.status, "see the Lighthouse output above").toBe(0);
});
