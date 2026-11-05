export const SuitNames = ["Hearts", "Diamonds", "Clubs", "Spades"];
export const RankNames = [
  "Ace",
  "King",
  "Queen",
  "Jack",
  "Ten",
  "Nine",
  "Eight",
  "Seven",
  "Six",
  "Five",
  "Four",
  "Three",
  "Two",
];

export interface Card {
  suit: string;
  rank: string;
}

export function getCardName(suit: string, rank: string): string {
  return `${rank} of ${suit}`;
}

export function createCardDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of Object.values(SuitNames)) {
    for (const rank of Object.values(RankNames)) {
      const card: Card = {
        suit,
        rank,
      };
      deck.push(card);
    }
  }

  return deck;
}

// Fisher–Yates shuffle that returns a new deck and leaves the original alone.
// Pass a different random function in tests to get a fixed order.
export function shuffleDeck(
  deck: Card[],
  random: () => number = Math.random,
): Card[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Takes cards from the top of the deck, or as many as are left
export function drawCards(
  deck: Card[],
  count: number,
): { drawn: Card[]; remaining: Card[] } {
  return { drawn: deck.slice(0, count), remaining: deck.slice(count) };
}

export function isRedSuit(suit: string): boolean {
  return suit === "Hearts" || suit === "Diamonds";
}

export function getCardImagePath(card: Card): string {
  return `/images/cards/${card.rank.toLowerCase()}-${card.suit.toLowerCase()}.svg`;
}

export const CardBackImagePath = "/images/cards/back.svg";
