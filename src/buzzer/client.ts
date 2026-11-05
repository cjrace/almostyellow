import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  signInAnonymously,
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
async function initialiseGuest(config: FirebaseClientConfig) {
  let app = getApps().find((app) => app.name === "room-guests");
  if (!app) {
    app = initializeApp(config, "room-guests");
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
  if (!auth.currentUser) await signInAnonymously(auth);
  return { auth, db: getFirestore(app) };
}
export type GuestClient = Awaited<ReturnType<typeof initialiseGuest>>;
let pending: Promise<GuestClient> | undefined;
export function guestClient(config: FirebaseClientConfig) {
  pending ??= initialiseGuest(config).catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
export async function send(
  client: GuestClient,
  action: "join" | "leave" | "buzz",
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
