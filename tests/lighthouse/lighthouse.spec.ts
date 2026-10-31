import { spawnSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { publicRoutes } from "../../src/routes";

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
  expect(result.status, "see the Lighthouse output above").toBe(0);
});
