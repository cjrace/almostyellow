// Runs Lighthouse against every public page, with the app reading from the
// Firebase emulators, so it never touches production data.
//
//   node scripts/lighthouse.mts             build, then run Lighthouse
//   node scripts/lighthouse.mts --no-build  reuse the existing .next build
//
// Reports are written to .lighthouseci/.
import { runBrowserChecks } from "./emulators.mts";

await runBrowserChecks("playwright.lighthouse.config.ts");
