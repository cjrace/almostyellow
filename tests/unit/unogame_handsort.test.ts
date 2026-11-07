import { describe, expect, it } from "vitest";
import { buildDeck, isWild, type Card } from "@/unogame/engine/cards";
import { sortHand } from "@/unogame/handsort";

const deck = buildDeck();
const find = (predicate: (card: Card) => boolean) => {
  const card = deck.find(predicate);
  if (!card) throw new Error("No such card.");
  return card;
};

describe("sortHand", () => {
  it("orders colours red, yellow, green, blue, then wilds", () => {
    const hand = [
      find((c) => c.kind === "wild4"),
      find((c) => c.kind === "number" && c.colour === "blue"),
      find((c) => c.kind === "number" && c.colour === "green"),
      find((c) => c.kind === "wild"),
      find((c) => c.kind === "number" && c.colour === "yellow"),
      find((c) => c.kind === "number" && c.colour === "red"),
    ];
    expect(sortHand(hand).map((c) => (isWild(c) ? c.kind : c.colour))).toEqual([
      "red",
      "yellow",
      "green",
      "blue",
      "wild",
      "wild4",
    ]);
  });

  it("puts numbers in order, then Skip, Reverse and Draw Two", () => {
    const red = (kind: string, value?: number) =>
      find(
        (c) =>
          c.kind === kind &&
          "colour" in c &&
          c.colour === "red" &&
          (c.kind !== "number" || c.value === value),
      );
    const hand = [
      red("draw2"),
      red("number", 9),
      red("skip"),
      red("number", 0),
      red("reverse"),
      red("number", 4),
    ];
    expect(
      sortHand(hand).map((c) =>
        c.kind === "number" ? String(c.value) : c.kind,
      ),
    ).toEqual(["0", "4", "9", "skip", "reverse", "draw2"]);
  });

  it("keeps duplicates in a steady order, whatever order they arrive in", () => {
    const twos = deck.filter(
      (c) => c.kind === "number" && c.colour === "green" && c.value === 2,
    );
    expect(twos).toHaveLength(2);
    const forward = sortHand(twos).map((c) => c.id);
    const backward = sortHand([...twos].reverse()).map((c) => c.id);
    expect(forward).toEqual(backward);
  });

  it("keeps every card, and leaves the hand it was given alone", () => {
    const shuffled = [...deck].reverse();
    const copy = [...shuffled];
    const sorted = sortHand(shuffled);
    expect(shuffled).toEqual(copy);
    expect(sorted).toHaveLength(deck.length);
    expect(new Set(sorted.map((c) => c.id)).size).toBe(deck.length);
  });

  it("gives the same order for a drawn card as for one dealt there", () => {
    const hand = deck.slice(0, 7);
    const drawn = find((c) => c.kind === "number" && c.colour === "blue");
    expect(sortHand([...hand, drawn])).toEqual(sortHand([drawn, ...hand]));
  });
});
