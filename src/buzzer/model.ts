export type Phase = "ready" | "open" | "closed" | "ended";
export interface Player {
  id: string;
  name: string;
}
export interface RoomView {
  code: string;
  round: string;
  version: number;
  phase: Phase;
  expiresAt: number;
  players: Player[];
  eligible: string[];
}
export interface Buzz {
  id: string;
  name: string;
  seconds: number;
  nanoseconds: number;
}
export function leaderboard(buzzes: Buzz[]) {
  const sorted = [...buzzes].sort(
    (a, b) =>
      a.seconds - b.seconds ||
      a.nanoseconds - b.nanoseconds ||
      a.id.localeCompare(b.id),
  );
  let place = 1;
  return sorted.map((buzz, index) => {
    const previous = sorted[index - 1];
    if (
      index > 0 &&
      (previous.seconds !== buzz.seconds ||
        previous.nanoseconds !== buzz.nanoseconds)
    )
      place = index + 1;
    const first = sorted[0];
    return {
      ...buzz,
      place,
      gap: Math.round(
        (buzz.seconds - first.seconds) * 1000 +
          (buzz.nanoseconds - first.nanoseconds) / 1e6,
      ),
    };
  });
}
export class RoomError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
