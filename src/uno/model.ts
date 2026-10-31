import { z } from "zod";

export type Player = "cam" | "laura";
export const players = ["cam", "laura"] as const;
export const names = { cam: "Cam", laura: "Laura" };
export interface Scores {
  cam: number;
  laura: number;
}
export interface Board extends Scores {
  startingTotals: Scores;
  activeGameId: string | null;
  lastFinishedGameId: string | null;
  version: number;
  updatedAt: number;
}
export interface Game extends Scores {
  id: string;
  status: "active" | "completed";
  startedAt: number;
  finishedAt: number | null;
  playedOn: string | null;
  datePrecision: "day" | "month" | "year" | "unknown";
  notes: string;
  source: "live" | "historic";
  winner: Player | "draw";
  rounds: number;
  margin: number;
  version: number;
  amended: boolean;
}
export interface UnoState {
  board: Board;
  games: Game[];
}
export const emptyBoard = (): Board => ({
  cam: 0,
  laura: 0,
  startingTotals: { cam: 0, laura: 0 },
  activeGameId: null,
  lastFinishedGameId: null,
  version: 0,
  updatedAt: 0,
});
export const Id = z.uuid();
export const ScoreEventSchema = z
  .object({
    id: Id,
    gameId: Id,
    leaseId: Id,
    player: z.enum(players),
    delta: z.union([z.literal(1), z.literal(-1)]),
    createdAt: z.number().int().nonnegative().max(8640000000000000),
    accountId: z.string().min(1).max(128),
  })
  .strict();
export type ScoreEvent = z.infer<typeof ScoreEventSchema>;
export interface PendingEvent extends ScoreEvent {
  status: "pending" | "attention";
  error?: string;
}
export interface EventHistory {
  id: string;
  player: Player;
  delta: number;
  createdAt: number;
  receivedAt: number;
}
export interface Lease {
  id: string;
  gameId: string;
  accountId: string;
}
export const HistoricGameSchema = z
  .object({
    id: Id,
    cam: z.number().int().min(0).max(1000000),
    laura: z.number().int().min(0).max(1000000),
    playedOn: z.string().max(10),
    datePrecision: z.enum(["day", "month", "year", "unknown"]),
    notes: z.string().trim().max(2000),
  })
  .strict()
  .superRefine((value, ctx) => {
    const patterns = {
      day: /^\d{4}-\d{2}-\d{2}$/,
      month: /^\d{4}-\d{2}$/,
      year: /^\d{4}$/,
      unknown: /^$/,
    };
    const suffix =
      value.datePrecision === "year"
        ? "-01-01"
        : value.datePrecision === "month"
          ? "-01"
          : "";
    const date = new Date(`${value.playedOn}${suffix}T12:00:00Z`);
    if (
      !patterns[value.datePrecision].test(value.playedOn) ||
      (value.datePrecision !== "unknown" &&
        (Number.isNaN(date.getTime()) ||
          !date.toISOString().startsWith(value.playedOn)))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid date matching its precision.",
        path: ["playedOn"],
      });
    }
  });
export type HistoricGameInput = z.infer<typeof HistoricGameSchema>;
export function result(
  scores: Scores,
): Pick<Game, "winner" | "rounds" | "margin"> {
  return {
    winner:
      scores.cam === scores.laura
        ? "draw"
        : scores.cam > scores.laura
          ? "cam"
          : "laura",
    rounds: scores.cam + scores.laura,
    margin: Math.abs(scores.cam - scores.laura),
  };
}
export function gameDate(game: Game) {
  return game.source === "historic"
    ? game.playedOn
    : new Date(game.finishedAt ?? game.startedAt).toISOString().slice(0, 10);
}
export function statistics(state: UnoState) {
  const games = state.games.filter((g) => g.status === "completed");
  const dated = games
    .filter((g) => gameDate(g))
    .sort(
      (a, b) =>
        (gameDate(a) ?? "").localeCompare(gameDate(b) ?? "") ||
        a.id.localeCompare(b.id),
    );
  const wins = { cam: 0, laura: 0 };
  let draws = 0;
  for (const g of games) {
    if (g.winner === "draw") draws++;
    else wins[g.winner]++;
  }
  const streak = { cam: 0, laura: 0 };
  let run = 0;
  let previous: Game["winner"] | null = null;
  for (const g of dated) {
    run = g.winner !== "draw" ? (g.winner === previous ? run + 1 : 1) : 0;
    previous = g.winner;
    if (g.winner !== "draw") streak[g.winner] = Math.max(streak[g.winner], run);
  }
  const pick = (compare: (a: Game, b: Game) => number) =>
    [...games].sort(compare).at(0) ?? null;
  const months = new Map<string, Scores>();
  const cumulative: { id: string; date: string; cam: number; laura: number }[] =
    [];
  const totals = { ...state.board.startingTotals };
  for (const g of dated) {
    totals.cam += g.cam;
    totals.laura += g.laura;
    const date = gameDate(g) ?? "";
    cumulative.push({ id: g.id, date, ...totals });
    // A year-only date must not invent a month for the monthly chart.
    if (date.length >= 7) {
      const month = date.slice(0, 7);
      const count = months.get(month) ?? { cam: 0, laura: 0 };
      if (g.winner !== "draw") count[g.winner]++;
      months.set(month, count);
    }
  }
  return {
    games,
    dated,
    wins,
    draws,
    streak,
    average: games.length
      ? games.reduce((n, g) => n + g.rounds, 0) / games.length
      : 0,
    biggest: pick((a, b) => b.margin - a.margin),
    longest: pick((a, b) => b.rounds - a.rounds),
    shortest: pick((a, b) => a.rounds - b.rounds),
    closest: pick((a, b) => a.margin - b.margin),
    highest: games.reduce((n, g) => Math.max(n, g.cam, g.laura), 0),
    cumulative,
    months: [...months].map(([date, scores]) => ({
      id: date,
      date,
      ...scores,
    })),
  };
}
