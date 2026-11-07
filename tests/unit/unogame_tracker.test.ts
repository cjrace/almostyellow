import { describe, expect, it } from "vitest";
import { Id } from "@/uno/model";
import { trackerGameId, trackerNotes } from "@/unogame/tracker";

describe("tracker game ids for online rooms", () => {
  it("is a valid id that is the same for the same room", () => {
    const id = trackerGameId("ABCD", 1_700_000_000_000);
    expect(Id.safeParse(id).success).toBe(true);
    expect(trackerGameId("ABCD", 1_700_000_000_000)).toBe(id);
  });

  it("differs between rooms, including a reused code", () => {
    const id = trackerGameId("ABCD", 1_700_000_000_000);
    expect(trackerGameId("ABCE", 1_700_000_000_000)).not.toBe(id);
    expect(trackerGameId("ABCD", 1_700_000_000_001)).not.toBe(id);
  });

  it("notes where the game was played", () => {
    expect(trackerNotes("ABCD")).toBe("Played online (room ABCD)");
  });
});
