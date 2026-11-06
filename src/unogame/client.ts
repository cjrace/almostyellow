import { doc, onSnapshot, type Firestore } from "firebase/firestore";
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

// A seat's own hand. Nothing exists until the first round starts.
export function watchUnoHand(
  db: Firestore,
  code: string,
  playerId: string,
  next: (hand: UnoHand | null) => void,
  error: () => void,
) {
  return onSnapshot(
    doc(db, "roomHands", `${code}_${playerId}`),
    (snapshot) => {
      next(snapshot.exists() ? (snapshot.data() as UnoHand) : null);
    },
    error,
  );
}

export type UnoAction = "leave" | "play" | "draw" | "keep" | "catch" | "sayUno";

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
