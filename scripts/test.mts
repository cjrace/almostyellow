// Runs every check in order, with a heading for each stage and a one-line
// result for the quiet ones (Prettier and ESLint).
//
//   pnpm test                  format, lint, then every test suite
//   pnpm test --no-format      leave the files as they are
//   pnpm test-only             --no-format, and reuse the existing .next build
//
// Run it through pnpm, which puts prettier, eslint and vitest on the PATH.
// Stops at the first stage that fails.
import { spawnSync } from "node:child_process";

const started = Date.now();
const args = process.argv.slice(2);
const format = !args.includes("--no-format");
const build = !args.includes("--no-build");

const stages = format ? 5 : 4;
let stage = 0;
let stageName = "";

function heading(text: string) {
  stage++;
  stageName = text;
  console.log(`\n=== [${String(stage)}/${String(stages)}] ${text} ===`);
}

function elapsed() {
  const seconds = Math.round((Date.now() - started) / 1000);
  return `${String(Math.floor(seconds / 60))}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function fail(code: number | null): never {
  console.log(
    `\n=== [Overall] Failed at ${String(stage)}/${String(stages)} ${stageName} after ${elapsed()} ===`,
  );
  process.exit(code ?? 1);
}

// Runs a command with its output on screen
function run(command: string) {
  const result = spawnSync(command, { shell: true, stdio: "inherit" });
  if (result.status !== 0) fail(result.status);
}

// Runs a command quietly, showing its output only if it fails
function capture(command: string) {
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

const plural = (count: number, word: string) =>
  `${String(count)} ${word}${count === 1 ? "" : "s"}`;

if (format) {
  heading("Formatting with Prettier");
  console.log("Formatting every file...");
  const prettier = capture("prettier . --write --no-color");
  if (prettier.status !== 0) {
    console.error(prettier.stdout + prettier.stderr);
    fail(prettier.status);
  }
  // One "file 12ms" line per file, with "(unchanged)" when it needed nothing
  const files = prettier.stdout
    .split("\n")
    .filter((line) => /\d+ms/.test(line));
  const changed = files.filter((line) => !line.includes("(unchanged)"));
  console.log(
    `Prettier: ${plural(files.length, "file")} checked, ${String(changed.length)} reformatted`,
  );
  for (const line of changed)
    console.log(`  reformatted ${line.split(" ")[0]}`);
}

heading("Linting with ESLint");
console.log("Checking every file...");
// The cache skips files that have not changed since the last run. A change to
// a type in one file can leave a stale result for a file that uses it, so CI
// runs pnpm lint without the cache.
const eslintCache =
  "--cache --cache-strategy content --cache-location node_modules/.cache/eslint/";
const eslint = capture(`eslint ${eslintCache} --format json`);
interface LintResult {
  errorCount: number;
  warningCount: number;
}
let results: LintResult[];
try {
  results = JSON.parse(eslint.stdout) as LintResult[];
} catch {
  // ESLint could not run at all, such as a broken config
  console.error(eslint.stdout + eslint.stderr);
  fail(eslint.status);
}
const errors = results.reduce((sum, file) => sum + file.errorCount, 0);
const warnings = results.reduce((sum, file) => sum + file.warningCount, 0);
console.log(
  `ESLint: ${plural(results.length, "file")} checked, ${plural(errors, "error")}, ${plural(warnings, "warning")}`,
);
if (errors > 0 || warnings > 0) {
  // Show the problems in ESLint's usual format
  run(`eslint ${eslintCache} --max-warnings 0`);
  fail(1);
}

heading("Unit tests with Vitest");
run("vitest run");

heading("Firebase emulator tests with Vitest (Security Rules, server actions)");
console.log("Starting the Firebase emulators...");
run("pnpm test:firebase");

heading(
  `End-to-end tests with Playwright (${build ? "build, then " : ""}Chrome and Firefox)`,
);
run(`node scripts/e2e.mts${build ? "" : " --no-build"}`);

console.log(`\n=== [Overall] All checks passed in ${elapsed()} ===`);
