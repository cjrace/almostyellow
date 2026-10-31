import { resetAndSeed } from "./firebase/seed";

// Loads the synthetic users and allowlist into the Firebase emulators that
// scripts/e2e.mts starts. Refuses to run against anything but the emulators.
export default async function globalSetup() {
  await resetAndSeed();
}
