// Uno cards. Separate from the ordinary playing-card API on purpose.
export const colours = ["red", "yellow", "green", "blue"] as const;
export type Colour = (typeof colours)[number];
export const actionKinds = ["skip", "reverse", "draw2"] as const;
export type ActionKind = (typeof actionKinds)[number];

// Every card has a stable id (0-107) so duplicates stay distinguishable and
// tests and the server can prove no card is ever created or lost.
export type Card =
  | { id: number; kind: "number"; colour: Colour; value: number }
  | { id: number; kind: ActionKind; colour: Colour }
  | { id: number; kind: "wild" | "wild4" };

export const DECK_SIZE = 108;

type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  const add = (card: WithoutId<Card>) =>
    deck.push({ ...card, id: deck.length });
  for (const colour of colours) {
    add({ kind: "number", colour, value: 0 });
    for (let value = 1; value <= 9; value++) {
      add({ kind: "number", colour, value });
      add({ kind: "number", colour, value });
    }
    for (const kind of actionKinds) {
      add({ kind, colour });
      add({ kind, colour });
    }
  }
  for (let i = 0; i < 4; i++) {
    add({ kind: "wild" });
    add({ kind: "wild4" });
  }
  return deck;
}

export function isWild(
  card: Card,
): card is Extract<Card, { kind: "wild" | "wild4" }> {
  return card.kind === "wild" || card.kind === "wild4";
}

// `colour` is the colour currently in force, which differs from the top
// card's own colour after a wild.
export function canPlayOn(card: Card, top: Card, colour: Colour): boolean {
  if (isWild(card)) return true;
  if (card.colour === colour) return true;
  if (card.kind === "number")
    return top.kind === "number" && top.value === card.value;
  return top.kind === card.kind;
}
