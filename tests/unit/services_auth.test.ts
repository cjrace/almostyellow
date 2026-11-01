import { describe, it, expect, vi, beforeEach } from "vitest";

// Checks that every server action that reads private data or changes data
// calls requireAuth() before touching Firestore, and that the intentionally
// public reads do not. Firestore and auth are mocked, so nothing here
// needs credentials.

const { requireAuth, createCustomToken, collection } = vi.hoisted(() => {
  // A stand-in for the Admin SDK's Firestore, with nothing stored in it
  const document = {
    get: () => Promise.resolve({ exists: false }),
    create: () => Promise.resolve(),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  };
  return {
    requireAuth: vi.fn(),
    createCustomToken: vi.fn(),
    collection: vi.fn(() => ({
      doc: () => document,
      get: () => Promise.resolve({ docs: [] }),
    })),
  };
});

vi.mock("@/auth", () => ({ requireAuth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/firebase/admin", () => ({
  adminAuth: () => ({ createCustomToken }),
  adminDb: () => ({ collection }),
}));

function databaseUsed() {
  return collection.mock.calls.length > 0;
}

import { firestoreTokenAction } from "@/actions/firestoreTokenAction";
import * as uno from "@/services/uno";
import * as filmlist from "@/services/filmlist";
import * as whiskyjournal from "@/services/whiskyjournal";

const fakeId = "00000000-0000-0000-0000-000000000000";

const film = {
  id: fakeId,
  name: "Test film",
  release_year: 2000,
  top_30: false,
  watched: false,
  not_in_jar: false,
};

const whisky = {
  last_edited: new Date(),
  whisky_id: fakeId,
  name: "Test whisky",
  distillery: "Test distillery",
  country_region: "Test region",
  age: 10,
  grain: "Malt",
  abv: 40,
  rating: 5,
  price: 2,
  notes: "",
};

const protectedActions: [string, () => Promise<unknown>][] = [
  ["createFilm", () => filmlist.createFilm(film)],
  ["updateFilm", () => filmlist.updateFilm(film)],
  ["deleteFilm", () => filmlist.deleteFilm(fakeId)],
  ["createWhisky", () => whiskyjournal.createWhisky(whisky)],
  ["updateWhisky", () => whiskyjournal.updateWhisky(whisky)],
  ["deleteWhisky", () => whiskyjournal.deleteWhisky(fakeId)],
];

const publicActions: [string, () => Promise<unknown>][] = [
  ["readFilmList", () => filmlist.readFilmList()],
  ["readFilm", () => filmlist.readFilm(fakeId)],
  ["readWhiskyJournal", () => whiskyjournal.readWhiskyJournal()],
  ["readWhisky", () => whiskyjournal.readWhisky(fakeId)],
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("protected server actions", () => {
  it.each(protectedActions)(
    "%s is refused without a session and never queries Firestore",
    async (_, action) => {
      const refused = new Error("unauthorised");
      requireAuth.mockRejectedValue(refused);

      await expect(action()).rejects.toBe(refused);
      expect(requireAuth).toHaveBeenCalledOnce();
      expect(databaseUsed()).toBe(false);
    },
  );

  it.each(protectedActions)(
    "%s queries Firestore with a session",
    async (_, action) => {
      requireAuth.mockResolvedValue({ uid: "test-user-alice" });

      await action();
      expect(requireAuth).toHaveBeenCalledOnce();
      expect(databaseUsed()).toBe(true);
    },
  );
});

describe("public server actions", () => {
  it.each(publicActions)("%s does not require a session", async (_, action) => {
    await action();
    expect(requireAuth).not.toHaveBeenCalled();
    expect(databaseUsed()).toBe(true);
  });
});

describe("firestoreTokenAction", () => {
  it("is refused without a session and hands out no token", async () => {
    const refused = new Error("unauthorised");
    requireAuth.mockRejectedValue(refused);

    await expect(firestoreTokenAction()).rejects.toBe(refused);
    expect(createCustomToken).not.toHaveBeenCalled();
  });

  it("signs the browser in as the user the session belongs to", async () => {
    requireAuth.mockResolvedValue({ uid: "test-user-alice" });
    createCustomToken.mockResolvedValue("custom-token");

    await expect(firestoreTokenAction()).resolves.toBe("custom-token");
    expect(createCustomToken).toHaveBeenCalledWith("test-user-alice");
  });
});

// Uno's transaction behaviour runs against the emulator; these checks ensure
// every mutation refuses an unauthorised call before validating input or using it.
describe("Uno authentication", () => {
  it.each([
    ["startUnoGame", () => uno.startUnoGame()],
    ["openUnoScoring", () => uno.openUnoScoring(fakeId)],
    ["syncUnoEvents", () => uno.syncUnoEvents([])],
    ["finishUnoGame", () => uno.finishUnoGame(fakeId, 1)],
    ["addHistoricUnoGame", () => uno.addHistoricUnoGame({})],
    ["updateHistoricUnoGame", () => uno.updateHistoricUnoGame({})],
    ["deleteHistoricUnoGame", () => uno.deleteHistoricUnoGame(fakeId)],
  ] as const)("%s requires an authorised session", async (_name, action) => {
    const refused = new Error("unauthorised");
    requireAuth.mockRejectedValue(refused);
    await expect(action()).rejects.toBe(refused);
    expect(requireAuth).toHaveBeenCalledOnce();
    expect(databaseUsed()).toBe(false);
  });
});
