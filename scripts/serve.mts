// Starts the built app against the Firebase emulators, loaded with the test
// fixtures, so pages can be checked by hand in a browser without touching
// production data. Stop it with Ctrl+C.
//
//   node scripts/serve.mts             build, then serve on localhost:3000
//   node scripts/serve.mts --no-build  reuse the existing .next build
//
// Settings come from tests/test-env.ts.
import { spawn } from "node:child_process";
import { registerHooks } from "node:module";
import { exitIfPortsInUse, inEmulators, run } from "./emulators.mts";

if (process.argv.includes("--inside")) {
  // Inside emulators:exec. The test files import each other without the .ts
  // extension, which Node needs, so add it when a relative import fails.
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (!specifier.startsWith(".") || /\.\w+$/.test(specifier)) {
          throw error;
        }
        return nextResolve(`${specifier}.ts`, context);
      }
    },
  });
  const { resetAndSeed } = await import("../tests/firebase/seed.ts");
  await resetAndSeed();

  const app = spawn("pnpm exec next start", { shell: true, stdio: "inherit" });
  app.on("exit", (code) => process.exit(code ?? 1));
} else {
  await exitIfPortsInUse();
  let status = process.argv.includes("--no-build")
    ? 0
    : run("pnpm exec next build");
  if (status === 0) status = inEmulators(["node scripts/serve.mts --inside"]);
  process.exit(status);
}
