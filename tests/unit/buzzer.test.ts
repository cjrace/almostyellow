import { describe, expect, test } from "vitest";
import { leaderboard } from "@/buzzer/model";
describe("Quiz players comparing confirmed buzzes", () => {
  test("see joint places only for exactly equal timestamps", () => {
    const results = leaderboard([
      { id: "c", name: "C", seconds: 2, nanoseconds: 1000000 },
      { id: "b", name: "B", seconds: 1, nanoseconds: 999999999 },
      { id: "a", name: "A", seconds: 1, nanoseconds: 999999999 },
    ]);
    expect(results.map((row) => [row.id, row.place, row.gap])).toEqual([
      ["a", 1, 0],
      ["b", 1, 0],
      ["c", 3, 1],
    ]);
  });
  test("retain distinct places when rounded gaps are equal", () => {
    const results = leaderboard([
      { id: "a", name: "A", seconds: 1, nanoseconds: 1 },
      { id: "b", name: "B", seconds: 1, nanoseconds: 2 },
    ]);
    expect(results.map((row) => [row.place, row.gap])).toEqual([
      [1, 0],
      [2, 0],
    ]);
  });
});
