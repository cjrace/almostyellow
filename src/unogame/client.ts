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

// A command with no answer after this long is sent again, while the first is
// still running, rather than waiting for the request to time out
export const RESEND_MS = 2500;
const UNREACHABLE =
  "Could not reach the table. Check your connection, then look at the table before trying again.";

/**
 * Sends one command. When no answer arrives within RESEND_MS, or the first
 * attempt fails to connect, it is sent once more with the same command id. The
 * server applies a command id at most once, even when both copies arrive at the
 * same moment, so a slow or lost reply can never play a card twice. The first
 * answer wins; it only fails when both attempts get no answer.
 */
export function sendUno(
  client: GuestClient,
  action: UnoAction,
  input: { code: string; round: string; version?: number } & Record<
    string,
    unknown
  >,
) {
  const body = { ...input, commandId: crypto.randomUUID() };
  return new Promise<void>((resolve, reject) => {
    let started = 0;
    let failed = 0;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (settle: () => void) => {
      done = true;
      clearTimeout(timer);
      settle();
    };
    const attempt = () => {
      if (done || started >= 2) return;
      started++;
      if (started === 1) timer = setTimeout(attempt, RESEND_MS);
      send(client, action, body, "uno").then(
        () => {
          if (!done) finish(resolve);
        },
        (error: unknown) => {
          if (done) return;
          if (!(error instanceof NetworkError)) {
            finish(() => {
              reject(error instanceof Error ? error : new Error(UNREACHABLE));
            });
            return;
          }
          failed++;
          if (started < 2) {
            // Nothing reached the server, so there is no reason to wait
            clearTimeout(timer);
            attempt();
          } else if (failed >= 2)
            finish(() => {
              reject(new Error(UNREACHABLE, { cause: error }));
            });
        },
      );
    };
    attempt();
  });
}
