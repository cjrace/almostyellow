import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { assertEmulatorEnvironment } from "./guard";
import { cocktails, films, shoppingItems, users, whiskies } from "./fixtures";
import { resetAndSeed } from "./seed";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const { projectId } = assertEmulatorEnvironment();
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await resetAndSeed();
});

const anonymous = () => testEnv.unauthenticatedContext().firestore();
const signedInAs = (uid: string) =>
  testEnv.authenticatedContext(uid).firestore();

const PUBLIC_COLLECTIONS = ["whiskies", "films", "cocktails"];
const TIMESTAMPED_COLLECTIONS = ["whiskies", "shoppingItems"];
const whiskyId = whiskies[0].id;
const itemId = shoppingItems[0].id;

function withoutId(record: { id: string }): DocumentData {
  const data: DocumentData = { ...record };
  delete data.id;
  return data;
}

// Records the rules accept. Made fresh for each use, because serverTimestamp()
// is a placeholder the emulator fills in on write.
const valid: Record<string, () => DocumentData> = {
  whiskies: () => ({
    ...withoutId(whiskies[0]),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }),
  films: () => withoutId(films[0]),
  cocktails: () => withoutId(cocktails[0]),
  shoppingItems: () => ({
    ...withoutId(shoppingItems[0]),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }),
};

// A small edit to an existing record that the rules accept
const validChange: Record<string, () => DocumentData> = {
  whiskies: () => ({ rating: 4, updatedAt: serverTimestamp() }),
  films: () => ({ watched: true }),
  cocktails: () => ({ rating: 3 }),
  shoppingItems: () => ({
    checked: true,
    updatedAt: serverTimestamp(),
    updatedBy: users.alice.uid,
  }),
};

describe("anonymous visitors", () => {
  test.each(PUBLIC_COLLECTIONS)("can read %s", async (name) => {
    await assertSucceeds(getDocs(collection(anonymous(), name)));
  });

  test.each(PUBLIC_COLLECTIONS)("cannot change %s", async (name) => {
    const db = anonymous();
    await assertFails(setDoc(doc(db, name, "new"), valid[name]()));
    await assertFails(setDoc(doc(db, name, whiskyId), valid[name]()));
    await assertFails(deleteDoc(doc(db, name, whiskyId)));
  });

  test("cannot read the shopping list", async () => {
    await assertFails(getDocs(collection(anonymous(), "shoppingItems")));
    await assertFails(getDoc(doc(anonymous(), "shoppingItems", itemId)));
  });

  test("cannot change the shopping list", async () => {
    const db = anonymous();
    await assertFails(
      setDoc(doc(db, "shoppingItems", "new"), valid.shoppingItems()),
    );
    await assertFails(
      updateDoc(doc(db, "shoppingItems", itemId), validChange.shoppingItems()),
    );
    await assertFails(deleteDoc(doc(db, "shoppingItems", itemId)));
  });

  test("cannot read or change the allowlist", async () => {
    const db = anonymous();
    await assertFails(getDocs(collection(db, "authorizedUsers")));
    await assertFails(setDoc(doc(db, "authorizedUsers", "anyone"), {}));
  });

  test("cannot use a collection no rule mentions", async () => {
    const db = anonymous();
    await assertFails(getDocs(collection(db, "somethingElse")));
    await assertFails(setDoc(doc(db, "somethingElse", "new"), { a: 1 }));
  });
});

describe.each([
  ["Alice", users.alice.uid],
  ["Bob", users.bob.uid],
])("authorised user %s", (_name, uid) => {
  test.each(PUBLIC_COLLECTIONS)("can read and change %s", async (name) => {
    const db = signedInAs(uid);
    await assertSucceeds(getDocs(collection(db, name)));
    await assertSucceeds(setDoc(doc(db, name, "added"), valid[name]()));
    await assertSucceeds(
      updateDoc(doc(db, name, "added"), validChange[name]()),
    );
    await assertSucceeds(deleteDoc(doc(db, name, "added")));
  });

  test("can read and change the shopping list", async () => {
    const db = signedInAs(uid);
    await assertSucceeds(getDocs(collection(db, "shoppingItems")));
    await assertSucceeds(
      setDoc(doc(db, "shoppingItems", "added"), {
        ...valid.shoppingItems(),
        updatedBy: uid,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, "shoppingItems", itemId), {
        ...validChange.shoppingItems(),
        updatedBy: uid,
      }),
    );
    await assertSucceeds(deleteDoc(doc(db, "shoppingItems", itemId)));
  });

  test("cannot read or change the allowlist", async () => {
    const db = signedInAs(uid);
    await assertFails(getDocs(collection(db, "authorizedUsers")));
    await assertFails(getDoc(doc(db, "authorizedUsers", uid)));
    await assertFails(setDoc(doc(db, "authorizedUsers", "friend"), {}));
    await assertFails(
      updateDoc(doc(db, "authorizedUsers", uid), { admin: true }),
    );
    await assertFails(deleteDoc(doc(db, "authorizedUsers", users.bob.uid)));
  });
});

test("a shopping list change cannot be made in someone else's name", async () => {
  const db = signedInAs(users.bob.uid);
  await assertFails(
    updateDoc(doc(db, "shoppingItems", itemId), validChange.shoppingItems()),
  );
  await assertSucceeds(
    updateDoc(doc(db, "shoppingItems", itemId), {
      ...validChange.shoppingItems(),
      updatedBy: users.bob.uid,
    }),
  );
});

describe("a signed-in user who is not on the allowlist", () => {
  const mallory = () => signedInAs(users.mallory.uid);

  test.each(PUBLIC_COLLECTIONS)("can read but not change %s", async (name) => {
    await assertSucceeds(getDocs(collection(mallory(), name)));
    await assertFails(setDoc(doc(mallory(), name, "new"), valid[name]()));
    await assertFails(deleteDoc(doc(mallory(), name, whiskyId)));
  });

  test("cannot read or change the shopping list", async () => {
    await assertFails(getDocs(collection(mallory(), "shoppingItems")));
    await assertFails(
      setDoc(doc(mallory(), "shoppingItems", "new"), valid.shoppingItems()),
    );
  });

  test("cannot add themselves to the allowlist", async () => {
    await assertFails(
      setDoc(doc(mallory(), "authorizedUsers", users.mallory.uid), {}),
    );
  });
});

// Each case is a valid record with one thing wrong, so that one thing is what
// the rules refuse. A value of undefined removes the field.
const invalidRecords: [string, string, DocumentData][] = [
  ["whiskies", "a missing field", { notes: undefined }],
  ["whiskies", "an extra field", { owner: users.alice.uid }],
  ["whiskies", "an empty name", { name: "" }],
  ["whiskies", "a name that is too long", { name: "x".repeat(256) }],
  ["whiskies", "a rating as text", { rating: "5" }],
  ["whiskies", "a rating out of range", { rating: 6 }],
  ["whiskies", "a fractional rating", { rating: 4.5 }],
  ["whiskies", "a price out of range", { price: 4 }],
  ["whiskies", "an ABV of zero", { abv: 0 }],
  ["whiskies", "a negative age", { age: -1 }],
  ["whiskies", "notes that are not text", { notes: 5 }],
  ["whiskies", "a timestamp from the browser", { createdAt: new Date() }],
  ["films", "a missing field", { notInJar: undefined }],
  ["films", "an extra field", { rating: 5 }],
  ["films", "a two-digit year", { releaseYear: 99 }],
  ["films", "a year as text", { releaseYear: "1999" }],
  ["films", "a fractional year", { releaseYear: 1999.5 }],
  ["films", "a year far in the future", { releaseYear: 2101 }],
  ["films", "a flag as text", { top30: "yes" }],
  ["cocktails", "ingredients that are not a list", { ingredients: "Gin" }],
  ["cocktails", "no ingredients", { ingredients: [] }],
  ["cocktails", "a rating of zero", { rating: 0 }],
  ["cocktails", "an empty method", { method: "" }],
  ["shoppingItems", "empty text", { text: "" }],
  ["shoppingItems", "checked as text", { checked: "no" }],
  ["shoppingItems", "an order as text", { order: "1" }],
  ["shoppingItems", "an extra field", { addedBy: users.alice.uid }],
  ["shoppingItems", "a timestamp from the browser", { updatedAt: new Date() }],
  ["shoppingItems", "no updatedBy", { updatedBy: undefined }],
  ["shoppingItems", "someone else as updatedBy", { updatedBy: users.bob.uid }],
];

function brokenRecord(collectionName: string, change: DocumentData) {
  const record = { ...valid[collectionName](), ...change };
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

describe("records with the wrong shape", () => {
  const db = () => signedInAs(users.alice.uid);

  test.each(Object.keys(valid))(
    "a valid %s record is accepted",
    async (name) => {
      await assertSucceeds(setDoc(doc(db(), name, "new"), valid[name]()));
    },
  );

  test.each(invalidRecords)(
    "%s with %s cannot be created",
    async (collectionName, _problem, change) => {
      await assertFails(
        setDoc(
          doc(db(), collectionName, "new"),
          brokenRecord(collectionName, change),
        ),
      );
    },
  );

  test.each(invalidRecords)(
    "%s with %s cannot replace an existing record",
    async (collectionName, _problem, change) => {
      const ref = doc(db(), collectionName, "existing");
      await assertSucceeds(setDoc(ref, valid[collectionName]()));
      await assertFails(setDoc(ref, brokenRecord(collectionName, change)));
    },
  );
});

describe("timestamps", () => {
  const db = () => signedInAs(users.alice.uid);
  const longAgo = new Date("2000-01-01T00:00:00Z");

  test.each(TIMESTAMPED_COLLECTIONS)(
    "%s createdAt cannot be changed",
    async (name) => {
      const ref = doc(db(), name, "existing");
      await assertSucceeds(setDoc(ref, valid[name]()));
      await assertFails(
        updateDoc(ref, { createdAt: longAgo, updatedAt: serverTimestamp() }),
      );
      await assertFails(
        updateDoc(ref, {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
    },
  );

  test.each(TIMESTAMPED_COLLECTIONS)(
    "%s updatedAt must move on with every change",
    async (name) => {
      const ref = doc(db(), name, "existing");
      await assertSucceeds(setDoc(ref, valid[name]()));
      const change = validChange[name]();
      delete change.updatedAt;
      await assertFails(updateDoc(ref, change));
      await assertFails(updateDoc(ref, { ...change, updatedAt: longAgo }));
    },
  );
});
