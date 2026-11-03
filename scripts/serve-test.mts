// Runs "next start" for the Playwright tests. Server errors are passed through
// so a failing test shows them, apart from the one error that
// tests/admin/03_server_actions.spec.ts causes on purpose by posting a made-up
// Server Action ID.
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const madeUpAction = `Failed to find Server Action "${"0".repeat(42)}"`;

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
