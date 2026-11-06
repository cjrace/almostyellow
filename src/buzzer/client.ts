import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  signInWithCustomToken,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocsFromServer,
  type Timestamp,
} from "firebase/firestore";
import type { FirebaseClientConfig } from "@/firebase/client";
import type { RoomView, Buzz } from "./model";
import { playerSignInError } from "./errors";
async function initialiseGuest(config: FirebaseClientConfig, code: string) {
  if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(code))
    throw new Error("Check the room code.");
  const appName = `room-guests-cookie-${code}`;
  let app = getApps().find((app) => app.name === appName);
  if (!app) {
    app = initializeApp(config, appName);
    const auth = initializeAuth(app, { persistence: browserLocalPersistence });
    if (config.authEmulatorHost)
      connectAuthEmulator(auth, `http://${config.authEmulatorHost}`, {
        disableWarnings: true,
      });
    if (config.firestoreEmulatorHost) {
      const [host, port] = config.firestoreEmulatorHost.split(":");
      connectFirestoreEmulator(getFirestore(app), host, Number(port));
    }
  }
  const auth = getAuth(app);
  await auth.authStateReady();
  return { auth, db: getFirestore(app), code };
}
export type GuestClient = Awaited<ReturnType<typeof initialiseGuest>>;
const pending = new Map<string, Promise<GuestClient>>();
export function guestClient(config: FirebaseClientConfig, code: string) {
  const existing = pending.get(code);
  if (existing) return existing;
  const result = initialiseGuest(config, code).catch((error: unknown) => {
    pending.delete(code);
    throw error;
  });
  pending.set(code, result);
  return result;
}
export function clearLegacyGuestKeys() {
  for (const storageKey of Object.keys(localStorage)) {
    if (/^buzzer-key-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(storageKey))
      localStorage.removeItem(storageKey);
  }
}
export async function joinGuest(
  config: FirebaseClientConfig,
  code: string,
  name: string,
) {
  const client = await guestClient(config, code);
  const request = () =>
    fetch("/api/buzzer", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", input: { code, name } }),
      signal: AbortSignal.timeout(10000),
    });
  interface Result {
    retry?: boolean;
    token: string;
    playerId: string;
    message?: string;
  }
  let response = await request();
  let result = (await response.json()) as Result;
  if (response.ok && result.retry) {
    response = await request();
    result = (await response.json()) as Result;
    if (response.ok && result.retry)
      throw new Error(
        "Player sign-in needs cookies. Allow cookies for this website and try again.",
      );
  }
  if (!response.ok)
    throw new Error(result.message ?? "Could not join the room. Try again.");
  try {
    await signInWithCustomToken(client.auth, result.token);
  } catch (error) {
    throw new Error(playerSignInError(error), { cause: error });
  }
  return { client, playerId: result.playerId };
}
export async function send(
  client: GuestClient,
  action: "leave" | "buzz",
  input: unknown,
) {
  const token = await client.auth.currentUser?.getIdToken();
  const response = await fetch("/api/buzzer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
    },
    body: JSON.stringify({ action, input }),
    signal: AbortSignal.timeout(10000),
  });
  const result = (await response.json()) as {
    playerId?: string;
    message?: string;
  };
  if (!response.ok)
    throw new Error(result.message ?? "Could not confirm the change.");
  return result;
}
export function watchRoom(
  db: GuestClient["db"],
  code: string,
  next: (room: RoomView, cached: boolean) => void,
  error: () => void,
) {
  return onSnapshot(
    doc(db, "gameRooms", code),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (!snapshot.exists()) {
        error();
        return;
      }
      next(snapshot.data() as RoomView, snapshot.metadata.fromCache);
    },
    error,
  );
}
const buzzQuery = (db: GuestClient["db"], code: string, round: string) =>
  query(
    collection(db, "roomBuzzes"),
    where("code", "==", code),
    where("round", "==", round),
  );
function readBuzz(data: {
  playerId: string;
  name: string;
  at: Timestamp;
}): Buzz {
  return {
    id: data.playerId,
    name: data.name,
    seconds: data.at.seconds,
    nanoseconds: data.at.nanoseconds,
  };
}
export function watchBuzzes(
  db: GuestClient["db"],
  code: string,
  round: string,
  next: (buzzes: Buzz[]) => void,
  error: () => void,
) {
  return onSnapshot(
    buzzQuery(db, code, round),
    (snapshot) => {
      next(
        snapshot.docs.map((doc) =>
          readBuzz(doc.data() as Parameters<typeof readBuzz>[0]),
        ),
      );
    },
    error,
  );
}
export async function reconcile(
  db: GuestClient["db"],
  code: string,
  round: string,
) {
  const snapshot = await getDocsFromServer(buzzQuery(db, code, round));
  return snapshot.docs.map((doc) =>
    readBuzz(doc.data() as Parameters<typeof readBuzz>[0]),
  );
}
