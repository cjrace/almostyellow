import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    // Modules are evaluated once per worker, not once per file
    isolate: false,
    // Dots and a summary; failures still show their output
    reporters: ["dot"],
    // Console output from passing tests is expected noise (rules denials etc)
    silent: "passed-only",
    include: ["tests/unit/**/*.test.ts"],
  },
});
