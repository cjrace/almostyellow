// Shared by scripts/e2e.mts and scripts/lighthouse.mts, which both run the app
// against the Firebase Auth and Firestore emulators, so they never touch
// production data or accounts.
import { spawnSync } from "node:child_process";
import { connect } from "node:net";
import "../tests/test-env.ts";

export function run(command: string) {
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

// Fail early and clearly rather than part way through the run. Another copy of
// these scripts or a dev server would otherwise clash.
export async function exitIfPortsInUse() {
  const needed = {
    3000: "the app",
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
}

// emulators:exec runs its script through a shell, so quote any argument that
// is not plain, such as --project="Google Chrome". Double quotes work in both
// cmd and sh, as long as the argument has none of its own.
export function quote(arg: string) {
  if (/^[\w\-.:/\\=@,]+$/.test(arg)) return arg;
  if (arg.includes('"')) {
    console.error(`Cannot pass an argument containing a double quote: ${arg}`);
    process.exit(1);
  }
  return `"${arg}"`;
}

// emulators:exec sets the emulator hosts for the script and anything it
// starts, and stops the emulators when the script finishes. The CLI is run
// with node rather than through a shell, so the script reaches it as one
// argument.
export function inEmulators(script: string[]) {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/firebase-tools/lib/bin/firebase.js",
      "emulators:exec",
      "--project",
      process.env.FIREBASE_PROJECT_ID ?? "",
      "--only",
      "auth,firestore",
      script.join(" "),
    ],
    { stdio: "inherit" },
  );
  return result.status ?? 1;
}
