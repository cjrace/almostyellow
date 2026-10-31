// Runs Lighthouse against every public page, with the app reading from the
// Firebase emulators, so it never touches production data.
//
//   node scripts/lighthouse.mts             build, then run Lighthouse
//   node scripts/lighthouse.mts --no-build  reuse the existing .next build
//
// Reports are written to .lighthouseci/.
import { exitIfPortsInUse, inEmulators, run } from "./emulators.mts";

const build = !process.argv.includes("--no-build");

await exitIfPortsInUse();

let status = build ? run("pnpm exec next build") : 0;
if (status === 0) {
  status = inEmulators([
    "pnpm exec playwright test --config playwright.lighthouse.config.ts",
  ]);
}
process.exit(status);
