import { describe, expect, test } from "vitest";
import { announceEvents, announceTable } from "@/unogame/announce";
import type { PublicEvent, PublicView } from "@/unogame/engine/views";

const names = { me: "Cam", laura: "Laura" };
const say = (events: PublicEvent[]) => announceEvents(events, names, "me");

describe("Announcing what happened at the table", () => {
  test("says you for the listener and names for everyone else", () => {
    expect(
      say([
        {
          type: "played",
          player: "me",
          card: { id: 1, kind: "number", colour: "red", value: 5 },
          colour: "red",
        },
        { type: "drew", player: "laura", count: 1 },
      ]),
    ).toBe("You played Red 5. Laura drew a card.");
  });

  test("names the colour chosen for a wild card", () => {
    expect(
      say([
        {
          type: "played",
          player: "laura",
          card: { id: 100, kind: "wild4" },
          colour: "blue",
        },
      ]),
    ).toBe("Laura played Wild Draw Four, and chose blue.");
  });

  test("counts penalties and puts Uno right", () => {
    expect(
      say([
        { type: "penalty", player: "me", reason: "draw2", count: 2 },
        { type: "penalty", player: "laura", reason: "uno", count: 2 },
        { type: "uno-caught", catcher: "me", player: "laura" },
        { type: "uno-caught", catcher: "laura", player: "me" },
        { type: "uno-declared", player: "laura" },
        { type: "uno-exposed", player: "me" },
      ]),
    ).toBe(
      "You had to draw 2 cards. Laura drew 2 cards for not saying Uno. You caught Laura for Uno. Laura caught you for Uno. Laura said Uno. You did not say Uno.",
    );
  });

  test("uses was and were correctly for skips", () => {
    expect(
      say([
        { type: "skipped", player: "me" },
        { type: "skipped", player: "laura" },
      ]),
    ).toBe("You were skipped. Laura was skipped.");
  });

  test("covers the rest of the round", () => {
    expect(
      say([
        { type: "reversed" },
        { type: "kept", player: "laura" },
        { type: "nothing-to-draw", player: "me" },
        { type: "recycled", count: 30 },
        { type: "won", player: "me" },
        { type: "blocked" },
      ]),
    ).toBe(
      "The direction was reversed. Laura kept the card they drew. There was nothing left to draw. The discard pile was shuffled back into the draw pile. You won the round. Nobody can move, so the round ends with no winner.",
    );
  });

  test("says who left and when the host ends the round", () => {
    expect(
      say([{ type: "left", player: "laura" }, { type: "abandoned" }]),
    ).toBe("Laura left the game. The host ended the round.");
    expect(say([{ type: "left", player: "me" }])).toBe("You left the game.");
  });

  test("says nothing when nothing happened, and copes with an unknown player", () => {
    expect(say([])).toBe("");
    expect(say([{ type: "drew", player: "gone", count: 3 }])).toBe(
      "A player drew 3 cards.",
    );
  });
});

describe("Announcing the table", () => {
  const view = (changes: Partial<PublicView> = {}): PublicView => ({
    phase: "playing",
    players: [
      { id: "me", cards: 7 },
      { id: "laura", cards: 7 },
    ],
    currentPlayer: "laura",
    direction: 1,
    top: { id: 1, kind: "number", colour: "red", value: 5 },
    colour: "red",
    stockCount: 93,
    discardCount: 1,
    drawPending: false,
    uno: null,
    outcome: null,
    ...changes,
  });

  test("says a round has started whenever one is dealt, not only the first", () => {
    expect(announceTable({ view: view(), events: [], names }, "me")).toBe(
      "The round has started. It is Laura's turn.",
    );
    expect(
      announceTable(
        { view: view({ currentPlayer: "me" }), events: [], names },
        "me",
      ),
    ).toBe("The round has started. It is your turn.");
  });

  test("says what happened, then whose turn it is, once play is under way", () => {
    expect(
      announceTable(
        {
          view: view({ currentPlayer: "me" }),
          events: [{ type: "drew", player: "laura", count: 1 }],
          names,
        },
        "me",
      ),
    ).toBe("Laura drew a card. It is your turn.");
  });

  test("gives no turn once the round is over", () => {
    expect(
      announceTable(
        {
          view: view({
            phase: "finished",
            outcome: { type: "win", winner: "laura" },
          }),
          events: [{ type: "won", player: "laura" }],
          names,
        },
        "me",
      ),
    ).toBe("Laura won the round.");
  });
});
