import { describe, expect, it } from "vitest";
import { cocktailDocuments } from "../../data/cocktails";
import { IMPORTED_BY, planImport } from "../../scripts/migration/plan";
import {
  exportSnapshot,
  parseSnapshot,
  type Snapshot,
} from "../../scripts/migration/snapshot";
import { firestoreTarget } from "../../scripts/migration/target";

// The parts of the Postgres import that need no database. The writes and
// the reconciliation run against the emulator in
// tests/firebase/migration.test.ts.

const EXPORTED_AT = "2026-10-01T09:00:00.000Z";

const whisky = {
  last_edited: "2024-11-24T00:00:00.000Z",
  whisky_id: "33675c13-6835-4cc8-b7de-2823b37ae78a",
  name: "Talisker 10 Year Old",
  distillery: "Talisker",
  country_region: "Island - Scotland",
  age: 10,
  grain: "Single malt",
  // Postgres returns DECIMAL as text
  abv: "45.8",
  rating: 5,
  price: 2,
  notes: "Peppery and smoky",
};

const film = {
  id: "0b6a4e02-1f1d-4d3b-9a77-2c6f0e8b1a01",
  name: "Seven Samurai",
  release_year: "1954",
  top_30: true,
  watched: true,
  not_in_jar: false,
};

const item = {
  chopin_id: "9e1c7c55-0a0a-4f3e-8d6e-2b8a1f0c9d01",
  chopin_text: "Limes",
  checked: false,
};

function snapshot(tables: Partial<Snapshot["tables"]> = {}): Snapshot {
  return {
    version: 1,
    exportedAt: EXPORTED_AT,
    tables: {
      whisky_journal: [whisky],
      film_list: [film],
      chopin_liszt: [item],
      ...tables,
    },
  };
}

describe("exportSnapshot", () => {
  it("reads each table once, in a fixed order, as plain JSON", async () => {
    const queries: string[] = [];
    const result = await exportSnapshot((text) => {
      queries.push(text);
      return Promise.resolve([
        { last_edited: new Date("2024-11-24T00:00:00Z"), name: "x" },
      ]);
    }, new Date(EXPORTED_AT));

    expect(queries).toHaveLength(3);
    expect(queries.every((text) => text.includes("ORDER BY"))).toBe(true);
    expect(queries.some((text) => /\busers\b/.test(text))).toBe(false);
    expect(result.exportedAt).toBe(EXPORTED_AT);
    expect(result.tables.whisky_journal[0].last_edited).toBe(
      "2024-11-24T00:00:00.000Z",
    );
  });

  it("can be read back from its file", () => {
    const original = snapshot();
    expect(parseSnapshot(JSON.stringify(original))).toEqual(original);
    expect(() => parseSnapshot("{}")).toThrow();
    expect(() => parseSnapshot('{"version":1,"tables":{}}')).toThrow();
  });
});

describe("planImport", () => {
  it("converts each table to its Firestore shape, keeping IDs", () => {
    const plan = planImport(snapshot());

    expect(plan.rejected).toEqual([]);
    expect(plan.collections.whiskies).toEqual([
      {
        id: whisky.whisky_id,
        data: {
          name: "Talisker 10 Year Old",
          distillery: "Talisker",
          countryRegion: "Island - Scotland",
          age: 10,
          grain: "Single malt",
          abv: 45.8,
          rating: 5,
          price: 2,
          notes: "Peppery and smoky",
          createdAt: new Date(whisky.last_edited),
          updatedAt: new Date(whisky.last_edited),
        },
      },
    ]);
    expect(plan.collections.films).toEqual([
      {
        id: film.id,
        data: {
          name: "Seven Samurai",
          releaseYear: 1954,
          top30: true,
          watched: true,
          notInJar: false,
        },
      },
    ]);
    expect(plan.collections.shoppingItems).toEqual([
      {
        id: item.chopin_id,
        data: {
          text: "Limes",
          checked: false,
          order: 1,
          createdAt: new Date(EXPORTED_AT),
          updatedAt: new Date(EXPORTED_AT),
          updatedBy: IMPORTED_BY,
        },
      },
    ]);
  });

  it("includes the whole cocktail catalogue", () => {
    const plan = planImport(snapshot());
    expect(plan.collections.cocktails.map(({ id }) => id)).toEqual(
      cocktailDocuments.map(({ id }) => id),
    );
  });

  it("numbers shopping items in the order of the export", () => {
    const plan = planImport(
      snapshot({
        chopin_liszt: [
          item,
          { ...item, chopin_id: "second", chopin_text: "Tonic water" },
        ],
      }),
    );
    expect(
      plan.collections.shoppingItems.map(({ data }) => data.order),
    ).toEqual([1, 2]);
  });

  it.each([
    [
      "a year that is not four digits",
      { film_list: [{ ...film, release_year: "19x5" }] },
      "release_year",
    ],
    [
      "a year before films",
      { film_list: [{ ...film, release_year: "1066" }] },
      "release_year",
    ],
    [
      "a rating out of range",
      { whisky_journal: [{ ...whisky, rating: 7 }] },
      "rating",
    ],
    [
      "an ABV that is not a number",
      { whisky_journal: [{ ...whisky, abv: "strong" }] },
      "abv",
    ],
    [
      "an unreadable date",
      { whisky_journal: [{ ...whisky, last_edited: "yesterday" }] },
      "last_edited",
    ],
    [
      "a missing field",
      { whisky_journal: [{ ...whisky, notes: undefined }] },
      "notes",
    ],
    ["empty text", { chopin_liszt: [{ ...item, chopin_text: "  " }] }, "text"],
    [
      "an ID with a slash",
      { chopin_liszt: [{ ...item, chopin_id: "a/b" }] },
      "ID",
    ],
  ])("leaves out a row with %s and says why", (_problem, tables, reason) => {
    const plan = planImport(snapshot(tables));
    expect(plan.rejected).toHaveLength(1);
    expect(plan.rejected[0].reasons.join(" ")).toContain(reason);
    const total = ["whiskies", "films", "shoppingItems"] as const;
    expect(
      total.reduce((sum, name) => sum + plan.collections[name].length, 0),
    ).toBe(2);
  });

  it("leaves out every copy of a duplicated ID", () => {
    const plan = planImport(
      snapshot({ film_list: [film, { ...film, name: "Another" }] }),
    );
    expect(plan.collections.films).toEqual([]);
    expect(plan.rejected).toEqual([
      {
        table: "film_list",
        id: film.id,
        reasons: ["the ID appears more than once"],
      },
      {
        table: "film_list",
        id: film.id,
        reasons: ["the ID appears more than once"],
      },
    ]);
  });

  it("reports text it trimmed", () => {
    const plan = planImport(
      snapshot({ film_list: [{ ...film, name: " Seven Samurai " }] }),
    );
    expect(plan.collections.films[0].data.name).toBe("Seven Samurai");
    expect(plan.changes).toEqual([
      { table: "film_list", id: film.id, note: "name: trimmed spaces" },
    ]);
  });
});

describe("firestoreTarget", () => {
  const emulator = {
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    GCLOUD_PROJECT: "demo-almostyellow",
  };
  const production = {
    FIREBASE_PROJECT_ID: "almost-yellow",
    FIREBASE_SERVICE_ACCOUNT_KEY: "{}",
  };

  it("uses the emulator for a demo- project", () => {
    expect(firestoreTarget(emulator)).toEqual({
      kind: "emulator",
      projectId: "demo-almostyellow",
    });
  });

  it.each([
    ["a real project", { ...emulator, GCLOUD_PROJECT: "almost-yellow" }],
    [
      "a remote host",
      { ...emulator, FIRESTORE_EMULATOR_HOST: "example.com:8080" },
    ],
    ["production credentials too", { ...emulator, ...production }],
  ])("refuses the emulator with %s", (_problem, env) => {
    expect(() => firestoreTarget(env)).toThrow();
  });

  it("refuses a real project unless it is named again", () => {
    expect(() => firestoreTarget({})).toThrow();
    expect(() => firestoreTarget(production)).toThrow(
      /CONFIRM_PRODUCTION_IMPORT/,
    );
    expect(() =>
      firestoreTarget({ ...production, CONFIRM_PRODUCTION_IMPORT: "other" }),
    ).toThrow();
    expect(
      firestoreTarget({
        ...production,
        CONFIRM_PRODUCTION_IMPORT: "almost-yellow",
      }).kind,
    ).toBe("production");
  });
});
