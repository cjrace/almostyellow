// The ports a test run or a preview uses. Normally these are the defaults, but
// scripts/ports.mts moves them all up by the same offset (E2E_PORT_OFFSET) when
// another worktree or session is already using them, so several can run at
// once. Everything that needs a port or the site's address reads it from here.

export const DEFAULT_PORTS = {
  app: 3000,
  firestore: 8080,
  auth: 9099,
  // The Firebase CLI starts these two as well, whatever emulators are asked for
  hub: 4400,
  logging: 4500,
} as const;

export type Ports = Record<keyof typeof DEFAULT_PORTS, number>;

// Each set of ports is this far from the last, so one is easy to tell from the
// next and the app never lands on another service's default
export const OFFSET_STEP = 10;
export const MAX_OFFSET = 300;

export function portsAt(offset: number): Ports {
  return {
    app: DEFAULT_PORTS.app + offset,
    firestore: DEFAULT_PORTS.firestore + offset,
    auth: DEFAULT_PORTS.auth + offset,
    hub: DEFAULT_PORTS.hub + offset,
    logging: DEFAULT_PORTS.logging + offset,
  };
}

export function offsetFromEnv(
  env: Record<string, string | undefined> = process.env,
) {
  const value = env.E2E_PORT_OFFSET;
  if (value === undefined || value === "") return 0;
  const offset = Number(value);
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET)
    throw new Error(
      `E2E_PORT_OFFSET must be a whole number from 0 to ${String(MAX_OFFSET)}, not "${value}".`,
    );
  return offset;
}

// The first offset (0, 10, 20...) where none of the ports are in use
export async function findFreeOffset(
  isBusy: (port: number) => Promise<boolean>,
): Promise<number | undefined> {
  for (let offset = 0; offset <= MAX_OFFSET; offset += OFFSET_STEP) {
    const taken = await Promise.all(
      Object.values(portsAt(offset)).map((port) => isBusy(port)),
    );
    if (!taken.some(Boolean)) return offset;
  }
  return undefined;
}

export const ports = portsAt(offsetFromEnv());

// Where the site is served, with no trailing slash, and as it appears in a URL
// query such as ?callbackUrl=
export const BASE_URL = `http://localhost:${String(ports.app)}`;
export const ENCODED_BASE_URL = encodeURIComponent(BASE_URL);
