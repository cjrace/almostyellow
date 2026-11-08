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
import { isRoomCode, type Game, type RoomView, type Buzz } from "./model";
import { playerSignInError } from "./errors";
// Each game signs in separately, so a room code reused by the other game
// never finds an old sign-in. The buzzer keeps its original app names.
const appNameFor = (code: string, game: Game) =>
  game === "buzzer" ? `room-guests-cookie-${code}` : `${game}-guests-${code}`;
async function initialiseGuest(
  config: FirebaseClientConfig,
  code: string,
  game: Game,
) {
  if (!isRoomCode(code)) throw new Error("Check the room code.");
  const appName = appNameFor(code, game);
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
export function guestClient(
  config: FirebaseClientConfig,
  code: string,
  game: Game = "buzzer",
) {
  const id = appNameFor(code, game);
  const existing = pending.get(id);
  if (existing) return existing;
  const result = initialiseGuest(config, code, game).catch((error: unknown) => {
    pending.delete(id);
    throw error;
  });
  pending.set(id, result);
  return result;
}
export async function joinGuest(
  config: FirebaseClientConfig,
  code: string,
  name: string,
  game: Game = "buzzer",
) {
  const client = await guestClient(config, code, game);
  const request = () =>
    fetch(`/api/${game}`, {
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
// The request never got an answer, so it may or may not have been applied
export class NetworkError extends Error {}
// Firebase refreshes the sign-in token over the network about once an hour,
// and a poor connection can stall that for as long as it likes. Waiting longer
// than this counts as no answer, so the command can be sent again.
export const TOKEN_WAIT_MS = 5000;

async function currentToken(client: GuestClient) {
  const user = client.auth.currentUser;
  if (!user) return undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      user.getIdToken(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new NetworkError("Could not refresh the sign-in in time."));
        }, TOKEN_WAIT_MS);
      }),
    ]);
  } catch (error) {
    if (error instanceof NetworkError) throw error;
    throw new NetworkError(
      error instanceof Error ? error.message : "Could not refresh the sign-in.",
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Refreshes the sign-in token ahead of time if it is about to expire, so the
 * next command does not have to wait for it. Failing is harmless: sending
 * tries again.
 */
export async function warmToken(client: GuestClient) {
  try {
    await client.auth.currentUser?.getIdToken();
  } catch {
    // The command will try again when it needs the token
  }
}

export async function send(
  client: GuestClient,
  action: string,
  input: unknown,
  game: Game = "buzzer",
) {
  const token = await currentToken(client);
  let response: Response;
  try {
    response = await fetch(`/api/${game}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ?? ""}`,
      },
      body: JSON.stringify({ action, input }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new NetworkError(
      error instanceof Error ? error.message : "Could not reach the server.",
      { cause: error },
    );
  }
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
