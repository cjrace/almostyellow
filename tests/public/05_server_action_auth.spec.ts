import { test, expect, APIRequestContext } from "@playwright/test";
import fs from "fs";
import path from "path";

// Server actions are plain HTTP POSTs, so anyone who knows an action's ID can
// try to call it without going through the UI. These tests call each protected
// action without a session, on every page that registers it and on public
// pages, and check it never runs. Action IDs and the pages that register them
// are read from the build output, so run after a build. No database needed.
//
// The requireAuth() guard inside each action is tested directly in
// tests/unit/services_auth.test.ts, as the proxy stops these requests first.

const fakeId = "00000000-0000-0000-0000-000000000000";

const protectedActions: Record<string, string[]> = {
  "src/services/chopinliszt.ts": [
    "createChopin",
    "readChopin",
    "updateChopinChecked",
    "deleteChopin",
  ],
  "src/services/filmlist.ts": ["createFilm", "updateFilm", "deleteFilm"],
  "src/services/whiskyjournal.ts": [
    "createWhisky",
    "updateWhisky",
    "deleteWhisky",
  ],
};

const publicPages = ["/", "/films", "/whiskyjournal"];

// Minimal router state, without it Next serves the static page instead
const routerStateTree = encodeURIComponent(
  JSON.stringify(["", { children: ["__PAGE__", {}] }, null, null, true]),
);

interface ManifestEntry {
  filename: string;
  exportedName: string;
  workers: Record<string, unknown>;
}

const manifest = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      "../../.next/server/server-reference-manifest.json",
    ),
    "utf8",
  ),
) as { node: Record<string, ManifestEntry> };

function findAction(filename: string, name: string) {
  const entry = Object.entries(manifest.node).find(
    ([, value]) => value.filename === filename && value.exportedName === name,
  );
  if (!entry) throw new Error(`${name} not found in build manifest`);

  const [id, { workers }] = entry;
  // e.g. "app/admin/films/[id]/edit/page" -> "/admin/films/<fakeId>/edit"
  const pages = Object.keys(workers).map((worker) =>
    worker
      .replace(/^app/, "")
      .replace(/\/page$/, "")
      .replace(/\[[^\]]+\]/g, fakeId),
  );

  return { id, pages };
}

async function callAction(
  request: APIRequestContext,
  baseURL: string | undefined,
  page: string,
  actionId: string,
) {
  if (!baseURL) throw new Error("baseURL is not configured");

  return request.post(page, {
    headers: {
      "Next-Action": actionId,
      "Next-Router-State-Tree": routerStateTree,
      "Content-Type": "text/plain;charset=UTF-8",
      Accept: "text/x-component",
      Origin: new URL(baseURL).origin,
    },
    data: JSON.stringify([fakeId]),
    maxRedirects: 0,
  });
}

test("Public server actions can be called directly", async ({
  request,
  baseURL,
}) => {
  // Control to show the request format above does reach an action. Only the
  // content type is checked, as there may be no database to read from.
  const { id } = findAction("src/services/filmlist.ts", "readFilmList");
  const response = await callAction(request, baseURL, "/films", id);

  expect(response.headers()["content-type"]).toContain("text/x-component");
});

for (const [filename, names] of Object.entries(protectedActions)) {
  for (const name of names) {
    test(`${name} cannot be called without a session`, async ({
      request,
      baseURL,
    }) => {
      const { id, pages } = findAction(filename, name);
      expect(pages.length).toBeGreaterThan(0);

      for (const page of pages) {
        const response = await callAction(request, baseURL, page, id);

        // Either the proxy sends us to log in, or requireAuth() refuses it
        if (response.status() === 307) {
          expect(response.headers().location).toContain("/admin/login");
        } else {
          expect(response.status(), page).toBe(401);
        }
      }

      for (const page of publicPages) {
        const response = await callAction(request, baseURL, page, id);

        // Action IDs not registered on a page are ignored, never run
        expect(
          response.status() === 401 ||
            !response.headers()["content-type"].includes("text/x-component"),
          page,
        ).toBe(true);
      }
    });
  }
}
