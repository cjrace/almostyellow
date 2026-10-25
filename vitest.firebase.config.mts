import { defineConfig } from "vitest/config";
import path from "path";

// Tests that need the Firebase emulators. Run them through
// "firebase emulators:exec", see the test:rules and test:ci scripts.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // Stops server-only refusing to load outside a Next.js server build
      "server-only": path.resolve(
        import.meta.dirname,
        "node_modules/server-only/empty.js",
      ),
    },
  },
  test: {
    include: ["tests/firebase/**/*.test.ts"],
    setupFiles: ["tests/firebase/setup.ts"],
    // The files share one emulator, so they must not run at the same time
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
