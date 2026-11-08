// Whether a move this player sent is still waiting to show on the table.

// "Sending…" becomes "Still sending…" after this long
export const SLOW_SEND_MS = 2000;
// Once the server has answered, the room is expected to follow within this
export const SENDING_GRACE_MS = 3000;

export interface Sent {
  // The room's version when the move was sent
  version: number;
  at: number;
  answeredAt?: number;
}

/**
 * Null when nothing is in flight. A move stops counting as in flight as soon
 * as the room changes, and a few seconds after the server answered, in case
 * the command changed nothing (a repeat). A failed command is cleared by the
 * caller.
 */
export function sendingState(
  sent: Sent | null,
  roomVersion: number | undefined,
  now: number,
): "sending" | "slow" | null {
  if (!sent || roomVersion !== sent.version) return null;
  if (sent.answeredAt !== undefined && now - sent.answeredAt > SENDING_GRACE_MS)
    return null;
  return now - sent.at >= SLOW_SEND_MS ? "slow" : "sending";
}
