import { getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

// Settings for the Firebase web SDK. They are read from the server's
// environment at request time and passed down, so nothing is baked into the
// client bundle at build time. None of them are secret.
export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  authEmulatorHost?: string;
  firestoreEmulatorHost?: string;
}

function clientApp(config: FirebaseClientConfig) {
  const apps = getApps();
  if (apps.length > 0) return { app: apps[0], isNew: false };
  const app = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
  });
  return { app, isNew: true };
}

export function clientAuth(config: FirebaseClientConfig) {
  const { app, isNew } = clientApp(config);
  if (!isNew) return getAuth(app);

  // The server session cookie is the real session, so the browser keeps
  // nothing between page loads. Pages that need Firestore sign in again from
  // the session, see firestoreTokenAction.
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  if (config.authEmulatorHost) {
    connectAuthEmulator(auth, `http://${config.authEmulatorHost}`, {
      disableWarnings: true,
    });
  }
  return auth;
}

// Firestore can only be pointed at the emulator before its first use
let firestore: Firestore | undefined;

export function clientFirestore(config: FirebaseClientConfig) {
  if (firestore) return firestore;
  // Auth first, so the app and its sign-in are set up as above
  const app = clientAuth(config).app;
  firestore = getFirestore(app);
  if (config.firestoreEmulatorHost) {
    const [host, port] = config.firestoreEmulatorHost.split(":");
    connectFirestoreEmulator(firestore, host, Number(port));
  }
  return firestore;
}
