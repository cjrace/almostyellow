import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverRoutes, routesFromPages } from "../../src/discover-routes";

describe("page discovery", () => {
  it("normalises Windows paths, route groups and admin templates, and ignores private folders", () => {
    expect(
      routesFromPages([
        "(homepage)\\page.tsx",
        "games/(games)/page.tsx",
        "admin/(admin)/page.tsx",
        "admin/films/[id]/edit/page.tsx",
        "_draft/page.tsx",
        "games/_private/page.tsx",
      ]),
    ).toEqual({
      publicRoutes: [{ path: "/" }, { path: "/games" }],
      adminRoutes: ["/admin", "/admin/films/[id]/edit"],
    });
  });

  it.each([
    [["(first)/page.tsx", "(second)/page.tsx"], /Duplicate page URL/],
    [["games/[slug]/page.tsx"], /Public dynamic page/],
    [["@slot/page.tsx"], /parallel or intercepting/],
    [["games/(..)photo/page.tsx"], /parallel or intercepting/],
  ])("rejects ambiguous or unsupported pages: %j", (pages, message) => {
    expect(() => routesFromPages(pages)).toThrow(message);
  });

  it("discovers a new public page without updating a route list", () => {
    const root = mkdtempSync(join(tmpdir(), "almostyellow-routes-"));
    try {
      const page = join(root, "src", "app", "new-game");
      mkdirSync(page, { recursive: true });
      writeFileSync(
        join(page, "page.tsx"),
        "export default function Page() {}",
      );
      expect(discoverRoutes(root).publicRoutes).toEqual([
        { path: "/new-game" },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
