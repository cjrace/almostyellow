import { beforeEach, describe, expect, test } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { assertEmulatorEnvironment } from "./guard";
import { cocktails, films, shoppingItems, users, whiskies } from "./fixtures";
import { resetAndSeed } from "./seed";

function admin() {
  const { projectId } = assertEmulatorEnvironment();
  const app = getApps()[0] ?? initializeApp({ projectId });
  return { auth: getAuth(app), db: getFirestore(app) };
}

async function signIn(email: string, password: string) {
  const { authHost } = assertEmulatorEnvironment();
  return fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
}

describe("seeding the emulators", () => {
  beforeEach(async () => {
    await resetAndSeed();
  });

  test("creates the synthetic users", async () => {
    const { auth } = admin();
    const result = await auth.listUsers();
    expect(result.users.map((user) => user.uid).sort()).toEqual(
      Object.values(users)
        .map((user) => user.uid)
        .sort(),
    );
  });

  test("lets every synthetic user sign in with their password", async () => {
    for (const user of Object.values(users)) {
      expect((await signIn(user.email, user.password)).ok).toBe(true);
    }
    expect((await signIn(users.alice.email, "wrong-password")).ok).toBe(false);
  });

  test("lists only the two authorised users on the allowlist", async () => {
    const { db } = admin();
    const snapshot = await db.collection("authorizedUsers").get();
    expect(snapshot.docs.map((doc) => doc.id).sort()).toEqual(
      [users.alice.uid, users.bob.uid].sort(),
    );
  });

  test("loads every fixture collection with known IDs", async () => {
    const { db } = admin();
    const expected = { whiskies, films, cocktails, shoppingItems };
    for (const [name, records] of Object.entries(expected)) {
      const snapshot = await db.collection(name).get();
      expect(snapshot.docs.map((doc) => doc.id).sort()).toEqual(
        records.map((record) => record.id).sort(),
      );
    }
  });

  test("starts from empty each time", async () => {
    const { db } = admin();
    await db.doc("whiskies/leftover").set({ name: "Left behind" });
    await db
      .doc(`shoppingItems/${shoppingItems[0].id}`)
      .update({ checked: true });

    await resetAndSeed();

    expect((await db.doc("whiskies/leftover").get()).exists).toBe(false);
    const limes = await db.doc(`shoppingItems/${shoppingItems[0].id}`).get();
    expect(limes.data()?.checked).toBe(false);
  });
});
