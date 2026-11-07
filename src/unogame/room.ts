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
