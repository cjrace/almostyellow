import { Card, RankNames, SuitNames } from "./card";

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
