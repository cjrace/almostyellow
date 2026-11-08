// Runs "next start" for the Playwright tests. Server errors are passed through
// so a failing test shows them, apart from the one error that
// tests/admin/03_server_actions.spec.ts causes on purpose by posting a made-up
// Server Action ID.
import { spawn } from "node:child_process";
import { registerHooks } from "node:module";
import { createInterface } from "node:readline";
import { BASE_URL } from "../tests/ports.mts";

// The preview uses the same server and fixtures as Playwright. Node needs
// extensions on the test helpers' relative imports; Playwright handles those
// itself during an ordinary test run.
if (process.argv.includes("--seed")) {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (!specifier.startsWith(".") || /\.\w+$/.test(specifier)) throw error;
        return nextResolve(`${specifier}.ts`, context);
      }
    },
  });
  const { resetAndSeed } = await import("../tests/firebase/seed.ts");
  await resetAndSeed();
}

const madeUpAction = `Failed to find Server Action "${"0".repeat(42)}"`;

// next start reads PORT, which scripts/ports.mts sets to a free one
if (process.argv.includes("--seed")) console.log(`Preview at ${BASE_URL}`);
const server = spawn("next start", {
  shell: true,
  stdio: ["inherit", "inherit", "pipe"],
});

// Next prints the error, a "Read more" link, then the stack trace
let skipping = false;
createInterface({ input: server.stderr }).on("line", (line) => {
  if (line.includes(madeUpAction)) {
    skipping = true;
    return;
  }
  const partOfIt =
    /^\s+at /.test(line) || line.includes("failed-to-find-server-action");
  if (skipping && partOfIt) return;
  skipping = false;
  console.error(line);
});

server.on("exit", (code) => process.exit(code ?? 1));
