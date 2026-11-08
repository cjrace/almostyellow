// Starts the dev server on a free port, so it does not clash with another
// worktree or session, and opens the browser there.
//
//   pnpm dev               port 3000, or the next free one, and open the browser
//   pnpm dev --no-open     the same without opening a browser
//   PORT=4000 pnpm dev     start looking from another port
import { spawn, spawnSync } from "node:child_process";
import { freePort } from "./ports.mts";

const port = await freePort(Number(process.env.PORT) || 3000);
const url = `http://localhost:${String(port)}`;
console.log(`Dev server on ${url}`);

if (!process.argv.includes("--no-open")) {
  if (process.platform === "win32")
    spawnSync("cmd", ["/c", "start", "", url], { stdio: "ignore" });
  else
    spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], {
      stdio: "ignore",
      detached: true,
    }).unref();
}

const server = spawn(`next dev --turbopack -p ${String(port)}`, {
  shell: true,
  stdio: "inherit",
});
server.on("exit", (code) => process.exit(code ?? 1));
