import { describe, expect, it } from "vitest";
import {
  emptyBoard,
  HistoricGameSchema,
  result,
  statistics,
  type Game,
} from "@/uno/model";

function game(
  id: string,
  cam: number,
  laura: number,
  playedOn: string | null,
): Game {
  return {
    id,
    cam,
    laura,
    playedOn,
    status: "completed",
    startedAt: 0,
    finishedAt: 0,
    datePrecision: playedOn ? "day" : "unknown",
    notes: "",
    source: "historic",
    version: 1,
    amended: false,
    ...result({ cam, laura }),
  };
}

describe("Uno statistics", () => {
  it("includes undated games in totals and records without inventing a trend date", () => {
    const board = { ...emptyBoard(), cam: 9, laura: 7 };
    const stats = statistics({
      board,
      games: [
        game("a", 4, 2, "2024-01-01"),
        game("b", 2, 2, "2024-02-01"),
        game("c", 3, 3, null),
      ],
    });
    expect(stats.games).toHaveLength(3);
    expect(stats.wins).toEqual({ cam: 1, laura: 0 });
    expect(stats.draws).toBe(2);
    expect(stats.biggest?.id).toBe("a");
    expect(stats.closest?.margin).toBe(0);
    expect(stats.cumulative).toHaveLength(2);
    expect(stats.cumulative.at(-1)).toMatchObject({ cam: 6, laura: 4 });
    expect(stats.months).toEqual([
      { id: "2024-01", date: "2024-01", cam: 1, laura: 0 },
      { id: "2024-02", date: "2024-02", cam: 0, laura: 0 },
    ]);
  });
  it("recalculates an amended winner, margin, streak and monthly wins", () => {
    const games = [
      game("a", 2, 1, "2024-01-01"),
      game("b", 1, 4, "2024-01-02"),
    ];
    const before = statistics({ board: emptyBoard(), games });
    expect(before.wins).toEqual({ cam: 1, laura: 1 });
    games[1] = {
      ...games[1],
      cam: 5,
      amended: true,
      ...result({ cam: 5, laura: 4 }),
    };
    const after = statistics({ board: emptyBoard(), games });
    expect(after.wins).toEqual({ cam: 2, laura: 0 });
    expect(after.streak.cam).toBe(2);
    expect(after.highest).toBe(5);
    expect(after.months[0].cam).toBe(2);
  });
  it("does not assign year-only games to January", () => {
    const stats = statistics({
      board: emptyBoard(),
      games: [{ ...game("a", 3, 1, "2020"), datePrecision: "year" }],
    });
    expect(stats.months).toEqual([]);
    expect(stats.cumulative).toHaveLength(1);
  });
  it("handles an empty history", () => {
    const stats = statistics({ board: emptyBoard(), games: [] });
    expect(stats.average).toBe(0);
    expect(stats.biggest).toBeNull();
    expect(stats.highest).toBe(0);
  });
});
it.each(["2024-02-30", "2024-13-01", "not a date"])(
  "rejects invalid historic date %s",
  (playedOn) => {
    expect(
      HistoricGameSchema.safeParse({
        id: "dbeb9180-6337-4257-8cca-97bf1bb0a153",
        cam: 1,
        laura: 2,
        playedOn,
        datePrecision: "day",
        notes: "",
      }).success,
    ).toBe(false);
  },
);
