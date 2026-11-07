// How Uno cards are named and drawn. The ordinary playing-card API in
// src/components/carddeck.tsx is left alone; the engine's cards are the only
// Uno type.
import type { Card, Colour } from "./engine/cards";

export const colourNames: Record<Colour, string> = {
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
};

export function getUnoCardName(card: Card): string {
  switch (card.kind) {
    case "number":
      return `${colourNames[card.colour]} ${String(card.value)}`;
    case "skip":
      return `${colourNames[card.colour]} Skip`;
    case "reverse":
      return `${colourNames[card.colour]} Reverse`;
    case "draw2":
      return `${colourNames[card.colour]} Draw Two`;
    case "wild":
      return "Wild";
    case "wild4":
      return "Wild Draw Four";
  }
}

// Names match scripts/generate-uno-svgs.mts
export function getUnoCardImagePath(card: Card): string {
  switch (card.kind) {
    case "number":
      return `/images/uno/${card.colour}-${String(card.value)}.svg`;
    case "skip":
      return `/images/uno/${card.colour}-skip.svg`;
    case "reverse":
      return `/images/uno/${card.colour}-reverse.svg`;
    case "draw2":
      return `/images/uno/${card.colour}-draw-two.svg`;
    case "wild":
      return "/images/uno/wild.svg";
    case "wild4":
      return "/images/uno/wild-draw-four.svg";
  }
}

// The existing orange card back with Mr Tayto
export const unoCardBackImagePath = "/images/cards/back.svg";
