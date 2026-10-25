import { defineConfig } from "vitest/config";

// Tests that need the Firebase emulators. Run them through
// "firebase emulators:exec", see the test:rules and test:ci scripts.
export default defineConfig({
  test: {
    include: ["tests/firebase/**/*.test.ts"],
    setupFiles: ["tests/firebase/setup.ts"],
    // The files share one emulator, so they must not run at the same time
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
