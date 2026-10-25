import { beforeEach, describe, expect, test, vi } from "vitest";
import { adminDb } from "@/firebase/admin";
import type { Film } from "@/components/filmcard";
import { films, users } from "./fixtures";
import { resetAndSeed } from "./seed";

// The film list's server actions write with the Admin SDK, which skips the
// Security Rules, so these check the actions keep to the same limits. The
// session check itself is covered in tests/unit/services_auth.test.ts.

vi.mock("@/auth", () => ({
  requireAuth: () => Promise.resolve({ uid: users.alice.uid }),
}));

const { createFilm, deleteFilm, readFilm, readFilmList, updateFilm } =
  await import("@/services/filmlist");

beforeEach(async () => {
  await resetAndSeed();
});

const samurai = films[0];

function newFilm(changes: Partial<Film> = {}): Film {
  return {
    id: "ignored-for-new-films",
    name: "Spirited Away",
    release_year: 2001,
    top_30: true,
    watched: false,
    not_in_jar: false,
    ...changes,
  };
}

async function storedNames() {
  const snapshot = await adminDb().collection("films").get();
  return snapshot.docs.map((doc) => doc.get("name") as string).sort();
}

const fixtureNames = films.map((film) => film.name).sort();

describe("reading", () => {
  test("reads every film with the fields the pages use", async () => {
    const list = await readFilmList();
    expect(list.map((film) => film.name).sort()).toEqual(fixtureNames);
    expect(list.find((film) => film.id === samurai.id)).toEqual({
      id: samurai.id,
      name: samurai.name,
      release_year: 1954,
      top_30: samurai.top30,
      watched: samurai.watched,
      not_in_jar: samurai.notInJar,
    });
  });

  test("reads one film, or null when there is none", async () => {
    expect((await readFilm(samurai.id))?.name).toBe(samurai.name);
    expect(await readFilm("no-such-film")).toBeNull();
    expect(await readFilm(`${samurai.id}/x/y`)).toBeNull();
  });
});

describe("adding", () => {
  test("stores the year as a number", async () => {
    await createFilm(newFilm());
    const snapshot = await adminDb()
      .collection("films")
      .where("name", "==", "Spirited Away")
      .get();
    expect(snapshot.docs).toHaveLength(1);
    expect(snapshot.docs[0].id).not.toBe("ignored-for-new-films");
    expect(snapshot.docs[0].data()).toEqual({
      name: "Spirited Away",
      releaseYear: 2001,
      top30: true,
      watched: false,
      notInJar: false,
    });
  });

  test.each([
    ["an empty name", { name: " " }],
    ["a name that is too long", { name: "x".repeat(256) }],
    ["a year before films", { release_year: 1066 }],
    ["a fractional year", { release_year: 2001.5 }],
    ["a year too far ahead", { release_year: new Date().getFullYear() + 2 }],
  ])("refuses a film with %s", async (_problem, changes) => {
    await expect(createFilm(newFilm(changes))).rejects.toThrow();
    expect(await storedNames()).toEqual(fixtureNames);
  });
});

describe("editing", () => {
  test("changes only the film given", async () => {
    await updateFilm(newFilm({ id: samurai.id, name: samurai.name }));
    const stored = await adminDb().doc(`films/${samurai.id}`).get();
    expect(stored.get("releaseYear")).toBe(2001);
    expect(await storedNames()).toEqual(fixtureNames);
  });

  test("does not bring back a deleted film", async () => {
    await deleteFilm(samurai.id);
    await expect(updateFilm(newFilm({ id: samurai.id }))).rejects.toThrow();
    expect(await readFilm(samurai.id)).toBeNull();
  });

  test("cannot write outside the films collection", async () => {
    await expect(
      updateFilm(newFilm({ id: `${samurai.id}/x/y` })),
    ).rejects.toThrow();
    expect(await deleteFilm("../whiskies/x")).toEqual({
      message: "No film found with the given ID.",
    });
  });
});

test("deleting removes only that film", async () => {
  await deleteFilm(samurai.id);
  expect(await storedNames()).toEqual(
    fixtureNames.filter((name) => name !== samurai.name),
  );
});
