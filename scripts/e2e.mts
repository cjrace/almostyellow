// Runs the Playwright tests against the disposable database from
// docker-compose.test.yml and the Firebase Auth and Firestore emulators, so
// they never touch production data or accounts.
//
//   node scripts/e2e.mts                   build, then run every suite
//   node scripts/e2e.mts --no-build        reuse the existing .next build
//   node scripts/e2e.mts tests/admin       extra arguments go to Playwright
//   node scripts/e2e.mts --rehearse-import rehearse the Postgres to Firestore
//                                          import instead, see scripts/migrate.mts
//
// Settings come from tests/test-env.ts.
import { spawnSync } from "node:child_process";
import { connect } from "node:net";
import "../tests/test-env.ts";

const args = process.argv.slice(2);
const rehearse = args.includes("--rehearse-import");
const build = !rehearse && !args.includes("--no-build");
const playwrightArgs = args.filter(
  (arg) => arg !== "--no-build" && arg !== "--rehearse-import",
);

function run(command: string) {
  const result = spawnSync(command, { shell: true, stdio: "inherit" });
  return result.status ?? 1;
}

// Resolves true if something is already listening on the port
function inUse(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = connect({ port, host: "127.0.0.1" });
    socket.setTimeout(1000, () => socket.destroy());
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

const compose = "docker compose -f docker-compose.test.yml";

// Start Docker Desktop if the engine is not up yet. Waits until it is ready.
if (run("docker info --format {{.ServerVersion}}") !== 0) {
  console.log("Docker is not running, starting Docker Desktop...");
  if (run("docker desktop start --timeout 300") !== 0) process.exit(1);
}

// Start from an empty database every time
run(`${compose} down`);

// Fail early and clearly rather than part way through the run. Another copy of
// this script or a dev server would otherwise clash: the compose project is
// shared, so two runs also tear down each other's database.
const needed = {
  3000: "the app",
  4444: "the Neon proxy",
  8080: "the Firestore emulator",
  9099: "the Auth emulator",
};
const clashes: string[] = [];
for (const [port, what] of Object.entries(needed)) {
  if (await inUse(Number(port))) clashes.push(`  port ${port} (${what})`);
}
if (clashes.length > 0) {
  console.error(
    `Cannot start, these ports are already in use:\n${clashes.join("\n")}\n` +
      "Stop whatever is using them (a dev server or another test run) and try again.",
  );
  process.exit(1);
}

let status = 1;
try {
  if (run(`${compose} up -d --wait`) === 0) {
    status = build ? run("pnpm exec next build") : 0;
    if (status === 0) {
      // emulators:exec sets the emulator hosts for Playwright and next start,
      // and stops the emulators when the tests finish
      const script = rehearse
        ? ["pnpm migrate rehearse migration-output/rehearsal.json"]
        : ["pnpm exec playwright test", ...playwrightArgs];
      status = run(
        `pnpm exec firebase emulators:exec --project ${process.env.FIREBASE_PROJECT_ID ?? ""} --only auth,firestore "${script.join(" ")}"`,
      );
    }
  }
} finally {
  run(`${compose} down`);
}
process.exit(status);
