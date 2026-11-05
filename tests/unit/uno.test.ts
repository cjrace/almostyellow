import { describe, expect, it } from "vitest";
import {
  compareGames,
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
    // Rounds are totalled per day, not per game
    expect(stats.busiest).toEqual({ date: "2024-01-01", rounds: 6, games: 1 });
    expect(stats.cumulative).toHaveLength(2);
    expect(stats.cumulative.at(-1)).toMatchObject({ cam: 6, laura: 4 });
    // Whole games won, with a draw adding to neither side
    expect(stats.gamesWon.map(({ cam, laura }) => [cam, laura])).toEqual([
      [1, 0],
      [1, 0],
    ]);
    expect(stats.years).toEqual([
      { id: "2024", date: "2024", cam: 1, laura: 0 },
    ]);
  });
  it("recalculates an amended winner, margin, streak and yearly wins", () => {
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
    expect(after.highestBy.length).toBeGreaterThan(0);
    expect(after.years[0].cam).toBe(2);
  });
  it("counts year-only games in their year", () => {
    const stats = statistics({
      board: emptyBoard(),
      games: [game("a", 3, 1, "2020")],
    });
    expect(stats.years).toEqual([
      { id: "2020", date: "2020", cam: 1, laura: 0 },
    ]);
    expect(stats.cumulative).toHaveLength(1);
  });
  it("handles an empty history", () => {
    const stats = statistics({ board: emptyBoard(), games: [] });
    expect(stats.average).toBe(0);
    expect(stats.biggest).toBeNull();
    expect(stats.highest).toBe(0);
  });
});
it.each(["2024-02-30", "2024-13-01", "2024-06", "2024", "", "not a date"])(
  "rejects invalid historic date %s",
  (playedOn) => {
    expect(
      HistoricGameSchema.safeParse({
        id: "dbeb9180-6337-4257-8cca-97bf1bb0a153",
        cam: 1,
        laura: 2,
        playedOn,
        notes: "",
      }).success,
    ).toBe(false);
  },
);

it("orders same-day live games by completion time rather than UUID", () => {
  const start = Date.parse("2026-10-31T12:00:00Z");
  const winners = ["cam", "cam", "laura", "cam"];
  const ids = ["d", "c", "a", "b"];
  const games = winners.map((winner, index) => ({
    ...game(
      ids[index],
      winner === "cam" ? 2 : 1,
      winner === "laura" ? 2 : 1,
      null,
    ),
    source: "live" as const,
    startedAt: start + index * 60000,
    finishedAt: start + index * 60000 + 1000,
  }));
  const stats = statistics({
    board: emptyBoard(),
    games: [...games].reverse(),
  });
  expect(stats.dated.map((item) => item.winner)).toEqual(winners);
  expect(stats.streak.cam).toBe(2);
  expect(stats.cumulative.map((item) => item.id)).toEqual(ids);
});
it("uses start time when completion time is absent and IDs for exact ties", () => {
  const early = {
    ...game("z", 1, 0, null),
    source: "live" as const,
    startedAt: 1000,
    finishedAt: null,
  };
  const late = { ...early, id: "a", startedAt: 2000, finishedAt: 2000 };
  expect([late, early].sort(compareGames).map((item) => item.id)).toEqual([
    "z",
    "a",
  ]);
  expect(
    [{ ...late, id: "b" }, late].sort(compareGames).map((item) => item.id),
  ).toEqual(["a", "b"]);
});
it("places stable historic entries before live games on the same date", () => {
  const historic = game("b", 1, 0, "2026-10-31");
  const live = {
    ...historic,
    id: "a",
    source: "live" as const,
    finishedAt: Date.parse("2026-10-31T12:00:00Z"),
  };
  expect(
    [live, historic, { ...historic, id: "a" }]
      .sort(compareGames)
      .map((item) => [item.source, item.id]),
  ).toEqual([
    ["historic", "a"],
    ["historic", "b"],
    ["live", "a"],
  ]);
});
it("keeps legacy approximate dates deterministic and excludes undated games from trends", () => {
  const games = [
    game("unknown", 5, 1, null),
    game("year", 1, 0, "2020"),
    game("month", 0, 1, "2020-06"),
    game("day", 1, 0, "2020-06-02"),
  ];
  const stats = statistics({ board: emptyBoard(), games });
  expect(stats.dated.map((item) => item.id)).toEqual(["year", "month", "day"]);
  expect(stats.games).toHaveLength(4);
});
