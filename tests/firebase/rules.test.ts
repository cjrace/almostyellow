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
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { assertEmulatorEnvironment } from "./guard";
import { users, whiskies, shoppingItems } from "./fixtures";
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
const whiskyId = whiskies[0].id;
const itemId = shoppingItems[0].id;

describe("anonymous visitors", () => {
  test.each(PUBLIC_COLLECTIONS)("can read %s", async (name) => {
    await assertSucceeds(getDocs(collection(anonymous(), name)));
  });

  test.each(PUBLIC_COLLECTIONS)("cannot change %s", async (name) => {
    const db = anonymous();
    await assertFails(setDoc(doc(db, name, "new"), { name: "Nope" }));
    await assertFails(setDoc(doc(db, name, whiskyId), { name: "Nope" }));
    await assertFails(deleteDoc(doc(db, name, whiskyId)));
  });

  test("cannot read the shopping list", async () => {
    await assertFails(getDocs(collection(anonymous(), "shoppingItems")));
    await assertFails(getDoc(doc(anonymous(), "shoppingItems", itemId)));
  });

  test("cannot change the shopping list", async () => {
    const db = anonymous();
    await assertFails(setDoc(doc(db, "shoppingItems", "new"), { text: "Gin" }));
    await assertFails(
      updateDoc(doc(db, "shoppingItems", itemId), { checked: true }),
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
    await assertSucceeds(setDoc(doc(db, name, "added"), { name: "Added" }));
    await assertSucceeds(updateDoc(doc(db, name, "added"), { name: "Edited" }));
    await assertSucceeds(deleteDoc(doc(db, name, "added")));
  });

  test("can read and change the shopping list", async () => {
    const db = signedInAs(uid);
    await assertSucceeds(getDocs(collection(db, "shoppingItems")));
    await assertSucceeds(
      updateDoc(doc(db, "shoppingItems", itemId), { checked: true }),
    );
    await assertSucceeds(deleteDoc(doc(db, "shoppingItems", itemId)));
  });

  test("cannot read or change the allowlist", async () => {
    const db = signedInAs(uid);
    await assertFails(getDocs(collection(db, "authorizedUsers")));
    await assertFails(setDoc(doc(db, "authorizedUsers", "friend"), {}));
    await assertFails(deleteDoc(doc(db, "authorizedUsers", users.bob.uid)));
  });
});

describe("a signed-in user who is not on the allowlist", () => {
  const mallory = () => signedInAs(users.mallory.uid);

  test.each(PUBLIC_COLLECTIONS)("can read but not change %s", async (name) => {
    await assertSucceeds(getDocs(collection(mallory(), name)));
    await assertFails(setDoc(doc(mallory(), name, "new"), { name: "Nope" }));
    await assertFails(deleteDoc(doc(mallory(), name, whiskyId)));
  });

  test("cannot read or change the shopping list", async () => {
    await assertFails(getDocs(collection(mallory(), "shoppingItems")));
    await assertFails(
      setDoc(doc(mallory(), "shoppingItems", "new"), { text: "Gin" }),
    );
  });

  test("cannot add themselves to the allowlist", async () => {
    await assertFails(
      setDoc(doc(mallory(), "authorizedUsers", users.mallory.uid), {}),
    );
  });
});
