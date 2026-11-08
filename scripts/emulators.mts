// Runs a command against the Firebase Auth and Firestore emulators, on ports
// nothing else is using, and stops them afterwards.
//
//   node scripts/emulators.mts --project demo-almostyellow "vitest run"
//
// The emulators' hosts reach the command as environment variables, and the
// ports as E2E_PORT_OFFSET and PORT (see scripts/ports.mts). The usual ports
// are used when they are free, so CI is unchanged.
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { chooseTestPorts } from "./ports.mts";

const CONFIG = ".firebase-e2e.json";

export async function runWithEmulators(project: string, script: string) {
  const ports = await chooseTestPorts();

  // The Firebase CLI has no flags for ports, so a copy of firebase.json is
  // made with them changed, and removed afterwards
  const args = ["--project", project, "--only", "auth,firestore"];
  const moved = process.env.E2E_PORT_OFFSET !== "0";
  if (moved) {
    const config = JSON.parse(readFileSync("firebase.json", "utf8")) as {
      emulators: Record<string, Record<string, unknown>>;
    };
    config.emulators.auth.port = ports.auth;
    config.emulators.firestore.port = ports.firestore;
    config.emulators.hub = { host: "127.0.0.1", port: ports.hub };
    config.emulators.logging = { host: "127.0.0.1", port: ports.logging };
    writeFileSync(CONFIG, JSON.stringify(config, null, 2));
    args.push("--config", CONFIG);
  }

  // The CLI is run with node rather than through a shell, so the script
  // reaches it as one argument
  try {
    const result = spawnSync(
      process.execPath,
      [
        "node_modules/firebase-tools/lib/bin/firebase.js",
        "emulators:exec",
        "--log-verbosity",
        "QUIET",
        ...args,
        script,
      ],
      { stdio: "inherit" },
    );
    return result.status ?? 1;
  } finally {
    if (moved) rmSync(CONFIG, { force: true });
  }
}

// Run directly, as the test:firebase and test:rules scripts do
if (import.meta.main) {
  const rest = process.argv.slice(2);
  const at = rest.indexOf("--project");
  const project = at === -1 ? "" : rest[at + 1];
  const script = rest.filter((_, i) => i !== at && i !== at + 1).join(" ");
  if (!project || !script) {
    console.error(
      'Usage: node scripts/emulators.mts --project <id> "<command>"',
    );
    process.exit(1);
  }
  process.exit(await runWithEmulators(project, script));
}
