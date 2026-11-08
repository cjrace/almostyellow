import { describe, expect, test } from "vitest";
import { SEEN_WAIT_MS, unseenPlayers, type UnoRoom } from "@/unogame/room";

const room = (extra: Partial<UnoRoom>) =>
  ({
    players: [
      { id: "a", name: "Cam" },
      { id: "b", name: "Laura" },
      { id: "c", name: "Sam" },
    ],
    seats: ["a", "b"],
    ...extra,
  }) as unknown as UnoRoom;

describe("Players who have not yet shown the result", () => {
  test("nobody is waited for when no round has been won", () => {
    expect(unseenPlayers(room({}), 5000)).toEqual([]);
    expect(unseenPlayers(room({ finishedAt: 0, seen: [] }), 5000)).toEqual([]);
  });

  test("seated players who have not reported are listed, without those who joined mid-round", () => {
    const finished = room({ finishedAt: 1000, seen: ["a"] });
    expect(unseenPlayers(finished, 2000).map((p) => p.id)).toEqual(["b"]);
  });

  test("a missing list of who has seen counts as nobody", () => {
    const finished = room({ finishedAt: 1000 });
    expect(unseenPlayers(finished, 2000).map((p) => p.id)).toEqual(["a", "b"]);
  });

  test("nobody is waited for once everyone has reported", () => {
    const finished = room({ finishedAt: 1000, seen: ["a", "b"] });
    expect(unseenPlayers(finished, 2000)).toEqual([]);
  });

  test("the wait ends after SEEN_WAIT_MS", () => {
    const finished = room({ finishedAt: 1000, seen: [] });
    expect(unseenPlayers(finished, 1000 + SEEN_WAIT_MS - 1)).toHaveLength(2);
    expect(unseenPlayers(finished, 1000 + SEEN_WAIT_MS)).toEqual([]);
  });
});
