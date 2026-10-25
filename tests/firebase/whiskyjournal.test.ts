import { beforeEach, describe, expect, test, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import type { Whisky } from "@/components/whiskyjournal";
import { users, whiskies } from "./fixtures";
import { resetAndSeed } from "./seed";

// The whisky journal's server actions write with the Admin SDK, which skips
// the Security Rules, so these check the actions keep to the same limits.
// The session check itself is covered in tests/unit/services_auth.test.ts.

vi.mock("@/auth", () => ({
  requireAuth: () => Promise.resolve({ uid: users.alice.uid }),
}));

const {
  createWhisky,
  deleteWhisky,
  readWhisky,
  readWhiskyJournal,
  updateWhisky,
} = await import("@/services/whiskyjournal");

beforeEach(async () => {
  await resetAndSeed();
});

const talisker = whiskies[0];

function newWhisky(changes: Partial<Whisky> = {}): Whisky {
  return {
    last_edited: new Date(),
    whisky_id: "ignored-for-new-whiskies",
    name: "Lagavulin 16 Year Old",
    distillery: "Lagavulin",
    country_region: "Islay - Scotland",
    age: 16,
    grain: "Single malt",
    abv: 43,
    rating: 5,
    price: 3,
    notes: "Bonfire smoke",
    ...changes,
  };
}

async function storedNames() {
  const snapshot = await adminDb().collection("whiskies").get();
  return snapshot.docs.map((doc) => doc.get("name") as string).sort();
}

describe("reading", () => {
  test("reads every whisky with the fields the pages use", async () => {
    const journal = await readWhiskyJournal();
    expect(journal.map((whisky) => whisky.name).sort()).toEqual(
      whiskies.map((whisky) => whisky.name).sort(),
    );

    const read = journal.find((whisky) => whisky.whisky_id === talisker.id);
    expect(read).toEqual({
      last_edited: talisker.updatedAt,
      whisky_id: talisker.id,
      name: talisker.name,
      distillery: talisker.distillery,
      country_region: talisker.countryRegion,
      age: talisker.age,
      grain: talisker.grain,
      abv: talisker.abv,
      rating: talisker.rating,
      price: talisker.price,
      notes: talisker.notes,
    });
  });

  test("reads one whisky, or null when there is none", async () => {
    expect((await readWhisky(talisker.id))?.name).toBe(talisker.name);
    expect(await readWhisky("no-such-whisky")).toBeNull();
    expect(await readWhisky(`${talisker.id}/notes/x`)).toBeNull();
  });
});

describe("adding", () => {
  test("stores a new whisky with server timestamps", async () => {
    const before = Date.now();
    await createWhisky(newWhisky());

    const snapshot = await adminDb()
      .collection("whiskies")
      .where("name", "==", "Lagavulin 16 Year Old")
      .get();
    expect(snapshot.docs).toHaveLength(1);
    const stored = snapshot.docs[0];
    expect(stored.id).not.toBe("ignored-for-new-whiskies");
    expect(stored.get("countryRegion")).toBe("Islay - Scotland");
    const createdAt = stored.get("createdAt") as Timestamp;
    expect(createdAt).toBeInstanceOf(Timestamp);
    expect(createdAt.toMillis()).toBeGreaterThanOrEqual(before - 1000);
    expect(stored.get("updatedAt")).toEqual(createdAt);
  });

  test.each([
    ["an empty name", { name: " " }],
    ["a name that is too long", { name: "x".repeat(256) }],
    ["a fractional age", { age: 4.5 }],
    ["an ABV of zero", { abv: 0 }],
    ["a rating out of range", { rating: 6 }],
    ["a fractional rating", { rating: 4.5 }],
    ["a price out of range", { price: 4 }],
    ["notes that are too long", { notes: "x".repeat(5001) }],
  ])("refuses a whisky with %s", async (_problem, changes) => {
    await expect(createWhisky(newWhisky(changes))).rejects.toThrow();
    expect(await storedNames()).toEqual(
      whiskies.map((whisky) => whisky.name).sort(),
    );
  });
});

describe("editing", () => {
  test("keeps createdAt and moves updatedAt on", async () => {
    const original = await readWhisky(talisker.id);
    if (!original) throw new Error("Talisker is missing");
    await updateWhisky({ ...original, rating: 4 });

    const stored = await adminDb().doc(`whiskies/${talisker.id}`).get();
    expect(stored.get("rating")).toBe(4);
    expect((stored.get("createdAt") as Timestamp).toDate()).toEqual(
      talisker.createdAt,
    );
    expect((stored.get("updatedAt") as Timestamp).toMillis()).toBeGreaterThan(
      talisker.updatedAt.getTime(),
    );
  });

  test("refuses changes that break the limits", async () => {
    await expect(
      updateWhisky(newWhisky({ whisky_id: talisker.id, abv: 120 })),
    ).rejects.toThrow();
    const stored = await adminDb().doc(`whiskies/${talisker.id}`).get();
    expect(stored.get("abv")).toBe(talisker.abv);
  });

  test("does not bring back a deleted whisky", async () => {
    await deleteWhisky(talisker.id);
    await expect(
      updateWhisky(newWhisky({ whisky_id: talisker.id })),
    ).rejects.toThrow();
    expect(await readWhisky(talisker.id)).toBeNull();
  });

  test("cannot write outside the whiskies collection", async () => {
    await expect(
      updateWhisky(newWhisky({ whisky_id: `${talisker.id}/notes/x` })),
    ).rejects.toThrow();
    expect(await deleteWhisky("../shoppingItems/item-limes")).toEqual({
      message: "No whisky found with the given ID.",
    });
    const limes = await adminDb().doc("shoppingItems/item-limes").get();
    expect(limes.exists).toBe(true);
  });
});

test("deleting removes only that whisky", async () => {
  await deleteWhisky(talisker.id);
  expect(await storedNames()).toEqual(
    whiskies
      .filter((whisky) => whisky.id !== talisker.id)
      .map((whisky) => whisky.name)
      .sort(),
  );
});
