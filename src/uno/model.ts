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
// How long after a game finishes a device may still replay rounds into it.
export const LEASE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
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
    playedOn: z.string().refine((value) => {
      const date = new Date(`${value}T12:00:00Z`);
      return (
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(date.getTime()) &&
        date.toISOString().startsWith(value)
      );
    }, "Enter a valid date."),
    notes: z.string().trim().max(2000),
  })
  .strict();
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
// Historic entries have no recorded time. Keep their order deterministic and
// place them before live games on the same date, whose finish times are known.
export function compareGames(a: Game, b: Game) {
  const dateOrder = (gameDate(a) ?? "").localeCompare(gameDate(b) ?? "");
  if (dateOrder) return dateOrder;
  if (a.source !== b.source) return a.source === "historic" ? -1 : 1;
  if (a.source === "live") {
    const timeOrder =
      (a.finishedAt ?? a.startedAt) - (b.finishedAt ?? b.startedAt);
    if (timeOrder) return timeOrder;
  }
  return a.id.localeCompare(b.id);
}
export function statistics(state: UnoState) {
  const games = state.games.filter((g) => g.status === "completed");
  const dated = games.filter((g) => gameDate(g)).sort(compareGames);
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
  const highest = games.reduce((n, g) => Math.max(n, g.cam, g.laura), 0);
  const pick = (compare: (a: Game, b: Game) => number) =>
    [...games].sort(compare).at(0) ?? null;
  // The day with the most rounds across all the games played on it, the
  // earliest such day if several tie
  const days = new Map<
    string,
    { date: string; rounds: number; games: number }
  >();
  for (const g of dated) {
    const date = gameDate(g) ?? "";
    const day = days.get(date) ?? { date, rounds: 0, games: 0 };
    days.set(date, {
      date,
      rounds: day.rounds + g.rounds,
      games: day.games + 1,
    });
  }
  const busiest =
    [...days.values()]
      .sort((a, b) => b.rounds - a.rounds || a.date.localeCompare(b.date))
      .at(0) ?? null;
  const months = new Map<string, Scores>();
  const cumulative: { id: string; date: string; cam: number; laura: number }[] =
    [];
  const gamesWon: typeof cumulative = [];
  const gameTotals = { cam: 0, laura: 0 };
  const totals = { ...state.board.startingTotals };
  for (const g of dated) {
    totals.cam += g.cam;
    totals.laura += g.laura;
    const date = gameDate(g) ?? "";
    cumulative.push({ id: g.id, date, ...totals });
    if (g.winner !== "draw") gameTotals[g.winner]++;
    gamesWon.push({ id: g.id, date, ...gameTotals });
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
    busiest,
    highest,
    // Whoever reached it, or both if they share the record
    highestBy: highest
      ? players.filter((p) => games.some((g) => g[p] === highest))
      : [],
    cumulative,
    gamesWon,
    months: [...months].map(([date, scores]) => ({
      id: date,
      date,
      ...scores,
    })),
  };
}
