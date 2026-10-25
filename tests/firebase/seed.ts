// Resets the Auth and Firestore emulators to the synthetic data in
// fixtures.ts. Safe to call repeatedly, each call starts from empty.
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { assertEmulatorEnvironment, assertRulesLoaded } from "./guard";
import { cocktails, films, shoppingItems, users, whiskies } from "./fixtures";

async function clear(url: string) {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(
      `Could not clear the emulator (${url}): ${String(response.status)}`,
    );
  }
}

export async function resetAndSeed() {
  const environment = assertEmulatorEnvironment();
  const { projectId, firestoreHost, authHost } = environment;

  await clear(
    `http://${firestoreHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
  );
  await clear(`http://${authHost}/emulator/v1/projects/${projectId}/accounts`);
  await assertRulesLoaded(environment);

  const app = getApps()[0] ?? initializeApp({ projectId });
  const auth = getAuth(app);
  const db = getFirestore(app);

  for (const user of Object.values(users)) {
    await auth.createUser({
      uid: user.uid,
      email: user.email,
      password: user.password,
    });
  }

  const batch = db.batch();
  for (const user of Object.values(users)) {
    if (user.authorized) {
      batch.set(db.doc(`authorizedUsers/${user.uid}`), { email: user.email });
    }
  }
  const collections = { whiskies, films, cocktails, shoppingItems };
  for (const [name, records] of Object.entries(collections)) {
    for (const { id, ...data } of records) {
      batch.set(db.doc(`${name}/${id}`), data);
    }
  }
  await batch.commit();
}
