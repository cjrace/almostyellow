// Finds ports nothing else is using, so two worktrees or sessions can run the
// tests or a preview at once. The defaults are used when they are free, which
// is always the case on CI. See tests/ports.ts for how the ports are derived.
import { connect } from "node:net";
import {
  MAX_OFFSET,
  findFreeOffset,
  offsetFromEnv,
  portsAt,
  type Ports,
} from "../tests/ports.mts";

// Resolves true if something is already listening on the port
export function inUse(port: number) {
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

// The first free port from `start` upwards, for a single server
export async function freePort(start: number) {
  for (let port = start; port < start + 100; port++) {
    if (!(await inUse(port))) return port;
  }
  throw new Error(
    `No free port found from ${String(start)} to ${String(start + 99)}.`,
  );
}

const names: Record<keyof Ports, string> = {
  app: "the app",
  firestore: "the Firestore emulator",
  auth: "the Auth emulator",
  hub: "the emulator hub",
  logging: "the emulator log",
};

// Settles on one set of ports for this run and shares it with everything the
// run starts, through E2E_PORT_OFFSET and PORT. An offset set by hand is used
// as it is, and must be free.
export async function chooseTestPorts(): Promise<Ports> {
  let offset: number | undefined;
  if (process.env.E2E_PORT_OFFSET) {
    offset = offsetFromEnv();
    const clashes: string[] = [];
    for (const [key, port] of Object.entries(portsAt(offset))) {
      if (await inUse(port))
        clashes.push(`  port ${String(port)} (${names[key as keyof Ports]})`);
    }
    if (clashes.length > 0) {
      console.error(
        `Cannot start, E2E_PORT_OFFSET=${String(offset)} needs these ports:\n${clashes.join("\n")}`,
      );
      process.exit(1);
    }
  } else {
    offset = await findFreeOffset(inUse);
    if (offset === undefined) {
      console.error(
        `Cannot start, no free set of ports up to an offset of ${String(MAX_OFFSET)}. Stop some dev servers or test runs and try again.`,
      );
      process.exit(1);
    }
  }
  const ports = portsAt(offset);
  process.env.E2E_PORT_OFFSET = String(offset);
  // next start and next dev read this
  process.env.PORT = String(ports.app);
  if (offset > 0)
    console.log(
      `The usual ports are busy, so this run uses the app on ${String(ports.app)}, the Firestore emulator on ${String(ports.firestore)} and Auth on ${String(ports.auth)}.`,
    );
  return ports;
}
