import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// The Admin SDK bypasses Firestore Security Rules, so anything using it must
// check the caller itself first, see requireAuth in src/auth.ts.

export function firebaseProjectId() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set.");
  return projectId;
}

function createApp(): App {
  const projectId = firebaseProjectId();

  // Emulators only ever run as a demo- project, which cannot reach real
  // resources. Pointing one service at an emulator and the other at a real
  // project is refused rather than half working.
  const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreEmulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (authEmulator || firestoreEmulator) {
    if (!authEmulator || !firestoreEmulator || !projectId.startsWith("demo-")) {
      throw new Error(
        "The Firebase emulators need both FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST, and a demo- project.",
      );
    }
    return initializeApp({ projectId });
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set.");
  }
  return initializeApp({
    projectId,
    credential: cert(JSON.parse(serviceAccount) as object),
  });
}

function app() {
  return getApps()[0] ?? createApp();
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());
