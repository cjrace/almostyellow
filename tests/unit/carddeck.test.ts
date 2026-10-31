import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardBackImagePath,
  createCardDeck,
  drawCards,
  getCardImagePath,
  getCardName,
  isRedSuit,
  shuffleDeck,
} from "@/components/carddeck";

// Small seeded generator so shuffles can be repeated
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

const names = (cards: Card[]) =>
  cards.map((card) => getCardName(card.suit, card.rank));

describe("card deck", () => {
  it("has 52 different cards", () => {
    expect(new Set(names(createCardDeck())).size).toBe(52);
  });

  it("shuffles without losing cards or changing the original", () => {
    const deck = createCardDeck();
    const before = names(deck);
    const shuffled = shuffleDeck(deck, seededRandom(1));

    expect(names(deck)).toEqual(before);
    expect(names(shuffled)).not.toEqual(before);
    expect([...names(shuffled)].sort()).toEqual([...before].sort());
  });

  it("gives the same order for the same random numbers", () => {
    expect(shuffleDeck(createCardDeck(), seededRandom(7))).toEqual(
      shuffleDeck(createCardDeck(), seededRandom(7)),
    );
  });

  it("draws from the top until the deck runs out", () => {
    const deck = createCardDeck();
    const { drawn, remaining } = drawCards(deck, 4);

    expect(drawn).toEqual(deck.slice(0, 4));
    expect(remaining).toHaveLength(48);

    const last = drawCards(deck.slice(50), 4);
    expect(last.drawn).toHaveLength(2);
    expect(last.remaining).toHaveLength(0);
    expect(drawCards([], 1)).toEqual({ drawn: [], remaining: [] });
  });

  it("knows which suits are red", () => {
    expect(["Hearts", "Diamonds", "Clubs", "Spades"].map(isRedSuit)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });
});

describe("card images", () => {
  const publicDir = join(import.meta.dirname, "..", "..", "public");
  const labels: Record<string, string> = {
    Ace: "A",
    King: "K",
    Queen: "Q",
    Jack: "J",
    Ten: "10",
    Nine: "9",
    Eight: "8",
    Seven: "7",
    Six: "6",
    Five: "5",
    Four: "4",
    Three: "3",
    Two: "2",
  };

  it.each(createCardDeck())("$rank of $suit has a matching image", (card) => {
    const svg = readFileSync(join(publicDir, getCardImagePath(card)), "utf8");
    const colour = isRedSuit(card.suit) ? "#b91c1c" : "#171717";
    const otherColour = isRedSuit(card.suit) ? "#171717" : "#b91c1c";

    expect(svg).toContain(
      `<title>${getCardName(card.suit, card.rank)}</title>`,
    );
    expect(svg).toContain(`>${labels[card.rank]}</text>`);
    expect(svg).toContain(`fill="${colour}"`);
    expect(svg).not.toContain(otherColour);
  });

  it("has a card back that doesn't name a card", () => {
    const svg = readFileSync(join(publicDir, CardBackImagePath), "utf8");
    expect(svg).toContain("<title>Face-down card</title>");
    expect(svg).not.toMatch(/Hearts|Diamonds|Clubs|Spades/);
  });
});
