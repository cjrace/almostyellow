// Safeguards that stop the Firebase tests ever talking to a real project. Used
// by the setup file for the Firebase tests and by the seeding code, so they
// fail immediately and say what is wrong rather than touching live resources.

export const LOCAL_PROJECT_ID = "demo-almostyellow";
export const CI_PROJECT_ID = "demo-almostyellow-ci";
const ALLOWED_PROJECT_IDS = [LOCAL_PROJECT_ID, CI_PROJECT_ID];

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

// Credentials that would let the Admin SDK or CLI reach a real project
const FORBIDDEN_CREDENTIALS = [
  "GOOGLE_APPLICATION_CREDENTIALS",
  "FIREBASE_TOKEN",
  "FIREBASE_SERVICE_ACCOUNT",
  "FIREBASE_SERVICE_ACCOUNT_KEY",
];

// Variables that name a project. If set, each must agree with the project the
// emulators are running as. NEXT_PUBLIC_ ones can be baked into a client bundle
// at build time, so a stale production value there is easy to miss.
const PROJECT_ID_VARIABLES = [
  "GCLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT",
  "FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
];

type Env = Record<string, string | undefined>;

export interface EmulatorEnvironment {
  projectId: string;
  firestoreHost: string;
  authHost: string;
}

function isLocalHost(hostAndPort: string) {
  const host = hostAndPort.replace(/:\d+$/, "");
  return LOCAL_HOSTS.includes(host);
}

/**
 * Throws, listing every problem found, unless the environment points only at
 * local Firebase emulators for a demo- project and holds no real credentials.
 */
export function assertEmulatorEnvironment(
  env: Env = process.env,
): EmulatorEnvironment {
  const problems: string[] = [];

  const projectId = env.GCLOUD_PROJECT;
  if (!projectId || !ALLOWED_PROJECT_IDS.includes(projectId)) {
    problems.push(
      `GCLOUD_PROJECT is "${projectId ?? ""}", expected one of ${ALLOWED_PROJECT_IDS.join(", ")}. Run the tests through "firebase emulators:exec --project <demo project>".`,
    );
  }

  for (const name of PROJECT_ID_VARIABLES) {
    const value = env[name];
    if (value && value !== projectId) {
      problems.push(
        `${name} is "${value}", which is not the emulator project.`,
      );
    }
  }

  const firestoreHost = env.FIRESTORE_EMULATOR_HOST;
  const authHost = env.FIREBASE_AUTH_EMULATOR_HOST;
  for (const [name, value] of [
    ["FIRESTORE_EMULATOR_HOST", firestoreHost],
    ["FIREBASE_AUTH_EMULATOR_HOST", authHost],
  ] as const) {
    if (!value) {
      problems.push(`${name} is not set, so the emulator is not being used.`);
    } else if (!isLocalHost(value)) {
      problems.push(`${name} is "${value}", which is not a local address.`);
    }
  }

  // The Admin SDK would fall back to the live service without these
  for (const name of Object.keys(env)) {
    if (
      env[name] &&
      (FORBIDDEN_CREDENTIALS.includes(name) ||
        name.startsWith("FIREBASE_SERVICE_ACCOUNT"))
    ) {
      problems.push(
        `${name} is set. Production credentials must not be present.`,
      );
    }
  }

  if (problems.length > 0 || !projectId || !firestoreHost || !authHost) {
    throw new Error(
      `Refusing to run the Firebase tests:\n- ${problems.join("\n- ")}`,
    );
  }

  return { projectId, firestoreHost, authHost };
}

/**
 * Throws unless the Firestore emulator is enforcing Security Rules. With no
 * rules loaded the emulator is wide open, so an anonymous write succeeding
 * means the rules file was not picked up.
 */
export async function assertRulesLoaded({
  projectId,
  firestoreHost,
}: EmulatorEnvironment) {
  const url = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/__rules_probe__/probe`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: {} }),
  });
  if (response.ok) {
    await fetch(url, { method: "DELETE" });
    throw new Error(
      "Refusing to run the Firebase tests: an anonymous write to an unknown collection succeeded, so Security Rules are not loaded.",
    );
  }
}
