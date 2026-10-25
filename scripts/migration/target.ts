// Decides which Firestore the importer writes to, and refuses anything
// ambiguous. The emulators are the default. Production needs its credentials
// and the project named again, so it can never be written to by accident.

export type Target =
  | { kind: "emulator"; projectId: string }
  | { kind: "production"; projectId: string; serviceAccount: string };

type Env = Record<string, string | undefined>;

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]):\d+$/;

export const CONFIRM_VARIABLE = "CONFIRM_PRODUCTION_IMPORT";

export function firestoreTarget(env: Env = process.env): Target {
  const emulatorHost = env.FIRESTORE_EMULATOR_HOST;
  if (emulatorHost) {
    const projectId = env.GCLOUD_PROJECT ?? env.FIREBASE_PROJECT_ID ?? "";
    if (!LOCAL_HOST.test(emulatorHost) || !projectId.startsWith("demo-")) {
      throw new Error(
        "With FIRESTORE_EMULATOR_HOST set, the import only runs against a local emulator as a demo- project.",
      );
    }
    if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY is set as well as the emulator. Unset one, so it is clear where the import goes.",
      );
    }
    return { kind: "emulator", projectId };
  }

  const projectId = env.FIREBASE_PROJECT_ID;
  const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!projectId || !serviceAccount) {
    throw new Error(
      "Set FIRESTORE_EMULATOR_HOST to import into the emulator, or FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_KEY for a real project.",
    );
  }
  if (env[CONFIRM_VARIABLE] !== projectId) {
    throw new Error(
      `To write to the real project ${projectId}, set ${CONFIRM_VARIABLE} to its ID as well.`,
    );
  }
  return { kind: "production", projectId, serviceAccount };
}
