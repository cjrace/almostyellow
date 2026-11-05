import { describe, expect, test } from "vitest";
import { leaderboard } from "@/buzzer/model";
import { playerSignInError } from "@/buzzer/errors";

describe("Player sign-in errors", () => {
  test("retains Firebase's error code without blaming browser storage", () => {
    expect(playerSignInError({ code: "auth/internal-error" })).toBe(
      "Could not sign in as a player. Reload to try again. Error code: auth/internal-error.",
    );
  });
  test.each([
    ["auth/operation-not-allowed", "sign-in settings"],
    ["auth/admin-restricted-operation", "account creation is restricted"],
    ["auth/network-request-failed", "Check your connection"],
    ["auth/web-storage-unsupported", "Allow browser storage"],
    ["auth/too-many-requests", "Wait a moment"],
  ])("explains %s and preserves its diagnostic code", (code, advice) => {
    expect(playerSignInError({ code })).toContain(advice);
    expect(playerSignInError({ code })).toContain(`Error code: ${code}.`);
  });
  test.each([undefined, null, new Error("Private details"), { code: 400 }])(
    "uses a generic message for errors without a Firebase auth code: %j",
    (error) => {
      expect(playerSignInError(error)).toBe(
        "Could not sign in as a player. Reload to try again.",
      );
    },
  );
});
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
