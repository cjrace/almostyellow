// Runs Playwright or a manual preview against the Firebase Auth and Firestore
// emulators, so they never touch production data or accounts.
//
//   node scripts/e2e.mts                   build, then run every suite
//   node scripts/e2e.mts --no-build        reuse the existing .next build
//   node scripts/e2e.mts tests/admin       extra arguments go to Playwright
//   node scripts/e2e.mts --serve           preview with the same test fixtures
//
// Settings come from tests/test-env.ts.
import { spawnSync } from "node:child_process";
import "../tests/test-env.ts";
import { runWithEmulators } from "./emulators.mts";

const args = process.argv.slice(2);
const build = !args.includes("--no-build");
const serve = args.includes("--serve");
const playwrightArgs = args.filter(
  (arg) => arg !== "--no-build" && arg !== "--serve",
);

// emulators:exec runs its script through a shell, so quote any argument that
// is not plain, such as --project="Google Chrome". Double quotes work in both
// cmd and sh, as long as the argument has none of its own.
function quote(arg: string) {
  if (/^[\w\-.:/\\=@,]+$/.test(arg)) return arg;
  if (arg.includes('"')) {
    console.error(`Cannot pass an argument containing a double quote: ${arg}`);
    process.exit(1);
  }
  return `"${arg}"`;
}

// Next prints its whole route table, so show the output only if the build
// fails or warns
function buildApp() {
  console.log("Building the app...");
  const started = Date.now();
  const result = spawnSync("pnpm exec next build", {
    shell: true,
    encoding: "utf8",
    // The default 1 MB would fail a build that prints a lot of warnings
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== 0) {
    console.error(output);
    return result.status ?? 1;
  }
  // Next marks most warnings with ⚠ rather than the word
  const warnings = output.split("\n").filter((line) => /warn|⚠/i.test(line));
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  console.log(["Build OK (" + seconds + "s)", ...warnings].join("\n"));
  return 0;
}

let status = build ? buildApp() : 0;
if (status === 0) {
  // The emulators are set up for Playwright and next start, and stopped when
  // the tests finish, on ports nothing else is using (scripts/ports.mts)
  const script = serve
    ? ["node scripts/serve-test.mts --seed"]
    : ["pnpm exec playwright test", ...playwrightArgs.map(quote)];
  status = await runWithEmulators(
    process.env.FIREBASE_PROJECT_ID ?? "",
    script.join(" "),
  );
}
process.exit(status);
