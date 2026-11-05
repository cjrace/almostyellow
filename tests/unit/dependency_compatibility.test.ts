import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Exercise the legacy callers patched for minimatch's named export.
const rootRequire = createRequire(import.meta.url);
const firebaseRequire = createRequire(
  rootRequire.resolve("firebase-tools/package.json"),
);
const { readdirRecursive } = firebaseRequire("./lib/fsAsync.js") as {
  readdirRecursive: (options: {
    path: string;
    ignoreStrings: string[];
  }) => Promise<{ name: string }[]>;
};
const superstaticRequire = createRequire(
  firebaseRequire.resolve("superstatic/package.json"),
);
const { configMatcher } = superstaticRequire("./lib/utils/patterns.js") as {
  configMatcher: (
    path: string,
    config: { source?: string; glob?: string; regex?: string },
  ) => boolean;
};

describe("Firebase dependency compatibility", () => {
  it("filters nested and hidden files when preparing an upload", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "almostyellow-dependencies-"),
    );
    try {
      await mkdir(join(directory, "nested"));
      await Promise.all(
        ["index.html", ".env", "nested/keep.txt", "nested/private.log"].map(
          (file) => writeFile(join(directory, file), "test"),
        ),
      );

      const files = await readdirRecursive({
        path: directory,
        ignoreStrings: ["*.log", ".env"],
      });

      expect(
        files.map((file) => relative(directory, file.name)).sort(),
      ).toEqual(["index.html", join("nested", "keep.txt")].sort());
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("matches hosting rewrite, redirect and header patterns", () => {
    expect(configMatcher("/games/cards", { source: "/games/**" })).toBe(true);
    expect(configMatcher("/films", { source: "/games/**" })).toBe(false);
    expect(configMatcher("/assets/main.js", { glob: "**/*.js" })).toBe(true);
    expect(configMatcher("/.env", { source: "**" })).toBe(false);
    expect(configMatcher("/films", { regex: "^/films$" })).toBe(true);
  });
});
