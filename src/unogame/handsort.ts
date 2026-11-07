import { actionKinds, colours, isWild, type Card } from "./engine/cards";

// Where a card sits in a sorted hand: its colour (wilds last), then numbers
// from 0 up, then the action cards, and the card id to settle ties so the
// order never jumps about.
function sortKey(card: Card): [number, number] {
  if (isWild(card)) return [colours.length, card.kind === "wild" ? 0 : 1];
  const colour = colours.indexOf(card.colour);
  return card.kind === "number"
    ? [colour, card.value]
    : [colour, 10 + actionKinds.indexOf(card.kind)];
}

// Your hand as shown: red, yellow, green, blue, then wilds, with each colour
// in number order and then Skip, Reverse and Draw Two. The server's order is
// not touched, only what is shown.
export function sortHand(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const [colourA, rankA] = sortKey(a);
    const [colourB, rankB] = sortKey(b);
    return colourA - colourB || rankA - rankB || a.id - b.id;
  });
}
