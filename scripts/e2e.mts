// Runs the Playwright tests against the disposable database from
// docker-compose.test.yml, so they never touch production data.
//
//   node scripts/e2e.mts                   build, then run every suite
//   node scripts/e2e.mts --no-build        reuse the existing .next build
//   node scripts/e2e.mts tests/admin       extra arguments go to Playwright
//
// Settings come from tests/test-env.ts.
import { spawnSync } from "node:child_process";
import "../tests/test-env.ts";

const args = process.argv.slice(2);
const build = !args.includes("--no-build");
const playwrightArgs = args.filter((arg) => arg !== "--no-build");

function run(command: string) {
  const result = spawnSync(command, { shell: true, stdio: "inherit" });
  return result.status ?? 1;
}

const compose = "docker compose -f docker-compose.test.yml";

// Start from an empty database every time
run(`${compose} down`);
if (run(`${compose} up -d --wait`) !== 0) process.exit(1);

let status = build ? run("pnpm exec next build") : 0;
if (status === 0) {
  status = run(["pnpm exec playwright test", ...playwrightArgs].join(" "));
}

run(`${compose} down`);
process.exit(status);
