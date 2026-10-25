import { users } from "../firebase/fixtures";

// Synthetic users that only exist in the Firebase Auth emulator
export function getCredentials() {
  return users.alice;
}

// Can sign in to Firebase, but is not on the allowlist
export function getUnauthorisedCredentials() {
  return users.mallory;
}
