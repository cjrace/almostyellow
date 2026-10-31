// Runs the Playwright tests against the Firebase Auth and Firestore emulators,
// so they never touch production data or accounts.
//
//   node scripts/e2e.mts                   build, then run every suite
//   node scripts/e2e.mts --no-build        reuse the existing .next build
//   node scripts/e2e.mts tests/admin       extra arguments go to Playwright
//
// Settings come from tests/test-env.ts.
import { exitIfPortsInUse, inEmulators, quote, run } from "./emulators.mts";

const args = process.argv.slice(2);
const build = !args.includes("--no-build");
const playwrightArgs = args.filter((arg) => arg !== "--no-build");

await exitIfPortsInUse();

let status = build ? run("pnpm exec next build") : 0;
if (status === 0) {
  status = inEmulators([
    "pnpm exec playwright test",
    ...playwrightArgs.map(quote),
  ]);
}
process.exit(status);
