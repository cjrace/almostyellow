import { beforeEach, describe, expect, test } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { importPlan, reconcile } from "../../scripts/migration/firestore";
import { planImport } from "../../scripts/migration/plan";
import type { Snapshot } from "../../scripts/migration/snapshot";
import { assertEmulatorEnvironment } from "./guard";

// Rehearses the Postgres import against the emulator, starting from an empty
// Firestore as production will. scripts/e2e.mts --rehearse-import runs the
// same steps from a real Postgres export.

beforeEach(async () => {
  const { firestoreHost, projectId } = assertEmulatorEnvironment();
  const response = await fetch(
    `http://${firestoreHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  expect(response.ok).toBe(true);
});

const whiskies = Array.from({ length: 6 }, (_, index) => ({
  last_edited: `2024-11-2${String(index)}T10:30:00.000Z`,
  whisky_id: `whisky-${String(index)}`,
  name: `Whisky ${String(index)}`,
  distillery: "Test distillery",
  country_region: "Speyside - Scotland",
  age: 12,
  grain: "Single malt",
  abv: "40.0",
  rating: 4,
  price: 2,
  notes: "",
}));

const films = Array.from({ length: 4 }, (_, index) => ({
  id: `film-${String(index)}`,
  name: `Film ${String(index)}`,
  release_year: String(1990 + index),
  top_30: false,
  watched: index % 2 === 0,
  not_in_jar: false,
}));

const items = [
  { chopin_id: "item-1", chopin_text: "Limes", checked: false },
  { chopin_id: "item-2", chopin_text: "Tonic water", checked: true },
];

const snapshot: Snapshot = {
  version: 1,
  exportedAt: "2026-10-01T09:00:00.000Z",
  tables: { whisky_journal: whiskies, film_list: films, chopin_liszt: items },
};

const plan = planImport(snapshot);
const db = () => adminDb();

test("a clean import matches the export exactly", async () => {
  await importPlan(db(), plan);
  const report = await reconcile(db(), plan);

  expect(report.ok).toBe(true);
  expect(report.collections.whiskies).toMatchObject({ expected: 6, found: 6 });
  expect(report.collections.films).toMatchObject({ expected: 4, found: 4 });
  expect(report.collections.shoppingItems.found).toBe(2);

  const whisky = await db().doc("whiskies/whisky-0").get();
  expect(whisky.get("abv")).toBe(40);
  expect(whisky.get("updatedAt")).toEqual(
    Timestamp.fromDate(new Date("2024-11-20T10:30:00.000Z")),
  );
  expect((await db().doc("films/film-0").get()).get("releaseYear")).toBe(1990);
});

test("running the import again changes nothing", async () => {
  await importPlan(db(), plan);
  await importPlan(db(), plan);
  const report = await reconcile(db(), plan);

  expect(report.ok).toBe(true);
  expect(report.collections.whiskies.found).toBe(6);
});

test("an import that stops part way is finished by running it again", async () => {
  const stopped = new Error("connection lost");
  await expect(
    importPlan(db(), plan, {
      batchSize: 5,
      afterBatch: () => {
        throw stopped;
      },
    }),
  ).rejects.toBe(stopped);

  const partial = await reconcile(db(), plan);
  expect(partial.ok).toBe(false);
  expect(partial.collections.whiskies.found).toBe(5);
  expect(partial.collections.whiskies.missing).toEqual(["whisky-5"]);

  await importPlan(db(), plan, { batchSize: 5 });
  expect((await reconcile(db(), plan)).ok).toBe(true);
});

describe("reconciliation", () => {
  test("finds a document that differs from the export, and a rerun repairs it", async () => {
    await importPlan(db(), plan);
    await db().doc("films/film-1").update({ releaseYear: 1066, extra: true });

    const report = await reconcile(db(), plan);
    expect(report.ok).toBe(false);
    expect(report.collections.films.changed).toEqual([
      { id: "film-1", fields: ["extra", "releaseYear"] },
    ]);

    await importPlan(db(), plan);
    expect((await reconcile(db(), plan)).ok).toBe(true);
  });

  test("reports documents that are not in the export, without deleting them", async () => {
    await importPlan(db(), plan);
    await db().doc("films/added-later").set({ name: "Paddington 2" });

    const report = await reconcile(db(), plan);
    expect(report.ok).toBe(false);
    expect(report.collections.films.extra).toEqual(["added-later"]);

    await importPlan(db(), plan);
    expect((await db().doc("films/added-later").get()).exists).toBe(true);
  });

  test("lists rows that failed the checks, which are never written", async () => {
    const withBadRows = planImport({
      ...snapshot,
      tables: {
        ...snapshot.tables,
        film_list: [
          ...films,
          { ...films[0], id: "bad-year", release_year: "19x5" },
        ],
      },
    });
    await importPlan(db(), withBadRows);

    const report = await reconcile(db(), withBadRows);
    expect(report.ok).toBe(true);
    expect(report.rejected).toEqual([
      {
        table: "film_list",
        id: "bad-year",
        reasons: [expect.stringContaining("release_year") as string],
      },
    ]);
    expect((await db().doc("films/bad-year").get()).exists).toBe(false);
  });
});
