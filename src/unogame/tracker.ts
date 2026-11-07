import { createHash } from "node:crypto";

/**
 * The tracker game made from an online room. It comes from the room's code and
 * expiry, so saving the same room twice can only ever make one game.
 */
export function trackerGameId(code: string, expiresAt: number): string {
  const hex = createHash("sha256")
    .update(`uno-room:${code}:${String(expiresAt)}`)
    .digest("hex");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export const trackerNotes = (code: string) => `Played online (room ${code})`;
