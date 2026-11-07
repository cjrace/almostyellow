import {
  doc,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { send, NetworkError, type GuestClient } from "@/buzzer/client";
import type { UnoHand, UnoRoom } from "./room";

export function watchUnoRoom(
  db: Firestore,
  code: string,
  next: (room: UnoRoom, cached: boolean) => void,
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
      next(snapshot.data() as UnoRoom, snapshot.metadata.fromCache);
    },
    error,
  );
}

const RETRY_MS = 1000;
const MAX_RETRY_MS = 30_000;

// A player's own hand. Nothing exists until the first round starts, so it is
// null until then. A failed listener is started again, waiting longer each
// time, as one lost listener would leave the table waiting for cards forever.
export function watchUnoHand(
  db: Firestore,
  code: string,
  playerId: string,
  next: (hand: UnoHand | null) => void,
) {
  let stop: Unsubscribe | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let wait = RETRY_MS;
  const listen = () => {
    stop = onSnapshot(
      doc(db, "roomHands", `${code}_${playerId}`),
      (snapshot) => {
        wait = RETRY_MS;
        next(snapshot.exists() ? (snapshot.data() as UnoHand) : null);
      },
      () => {
        timer = setTimeout(listen, wait);
        wait = Math.min(wait * 2, MAX_RETRY_MS);
      },
    );
  };
  listen();
  return () => {
    clearTimeout(timer);
    stop?.();
  };
}

export type UnoAction =
  "leave" | "play" | "draw" | "keep" | "catch" | "sayUno" | "seen";

/**
 * Sends one command. When no answer arrives it is sent once more with the
 * same command id, which the server applies at most once, so a lost reply
 * can never play a card twice.
 */
export async function sendUno(
  client: GuestClient,
  action: UnoAction,
  input: { code: string; round: string; version?: number } & Record<
    string,
    unknown
  >,
) {
  const body = { ...input, commandId: crypto.randomUUID() };
  try {
    await send(client, action, body, "uno");
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    try {
      await send(client, action, body, "uno");
    } catch (again) {
      if (again instanceof NetworkError)
        throw new Error(
          "Could not reach the table. Check your connection, then look at the table before trying again.",
          { cause: again },
        );
      throw again;
    }
  }
}
