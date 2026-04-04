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
