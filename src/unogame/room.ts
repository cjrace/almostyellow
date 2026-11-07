import type { RoomView } from "@/buzzer/model";
import type { PrivateView, PublicEvent, PublicView } from "./engine/views";

// What the browser sees in `gameRooms/{code}` for an Uno room. The full round
// (stock order, every hand) stays in `roomPrivate`, and each player's own hand
// is in `roomHands`.
export type Stage = "lobby" | "playing" | "finished";

export interface UnoRoom extends RoomView {
  game: "uno";
  stage: Stage;
  // Seat order for the current round, as player ids
  seats: string[];
  // Names of the seated players, kept for players who leave later
  names: Record<string, string>;
  // Rounds won in this room, by player id
  scores: Record<string, number>;
  // Set once the host has saved this room's scores to the Uno tracker
  trackerGameId?: string;
  // Moves are refused until this time (ms), so everyone sees the last one
  turnReadyAt?: number;
  // When a won round ended (ms), and who has since shown the result. A new
  // round waits for every seated player, or SEEN_WAIT_MS.
  finishedAt?: number;
  seen?: string[];
  view: PublicView | null;
  // What the latest command did, without anyone's private cards
  events: PublicEvent[];
}

export interface UnoHand extends PrivateView {
  code: string;
  playerId: string;
  uid: string;
  round: string;
  expiresAt: number;
}

// Finished rounds are kept this long after the room itself has gone
export const RESULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// How long a finished round waits for slower devices before play can go on
export const SEEN_WAIT_MS = 15_000;
// How long every device holds the final card before the round-over page
export const FINAL_HOLD_MS = 4000;

/** Seated players still in the room who have not yet shown the result. */
export function unseenPlayers(room: UnoRoom, now: number) {
  if (!room.finishedAt || now >= room.finishedAt + SEEN_WAIT_MS) return [];
  const seen = new Set(room.seen ?? []);
  return room.players.filter(
    (p) => room.seats.includes(p.id) && !seen.has(p.id),
  );
}
