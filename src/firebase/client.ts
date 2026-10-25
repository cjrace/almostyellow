import { getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
} from "firebase/auth";

// Settings for the Firebase web SDK. They are read from the server's
// environment at request time and passed down, so nothing is baked into the
// client bundle at build time. None of them are secret.
export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  authEmulatorHost?: string;
}

export function clientAuth(config: FirebaseClientConfig) {
  const apps = getApps();
  if (apps.length > 0) return getAuth(apps[0]);

  const app = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
  });
  // The server session cookie is the only session for now, so the browser
  // keeps nothing between page loads
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  if (config.authEmulatorHost) {
    connectAuthEmulator(auth, `http://${config.authEmulatorHost}`, {
      disableWarnings: true,
    });
  }
  return auth;
}
