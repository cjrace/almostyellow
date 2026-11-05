// Rules for Suits, kept apart from the page so they can be tested on their own
// and reused if the game is ever played across several devices.
import { Card, drawCards } from "@/components/carddeck";

export const TOTAL_TURNS = 13;
export const CARDS_PER_TURN = 4;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 13;

export type SuitsPhase = "setup" | "guessing" | "complete";

export interface SuitsResult {
  matches: number;
  // Hand drinks out, drink them yourself, or a safe round where everyone else
  // drinks instead
  kind: "assign" | "drink" | "safe";
  drinks: number; // For a safe round, what each other player drinks
  doubled: boolean;
}

// The cards from the turn just played, which stay on show while the next
// player picks their suit
export interface SuitsTurn {
  player: string;
  suit: string;
  cards: Card[];
  result: SuitsResult;
}

export interface SuitsState {
  phase: SuitsPhase;
  players: string[];
  deck: Card[];
  turn: number; // 0 to TOTAL_TURNS - 1
  chosenSuit: string | null;
  lastTurn: SuitsTurn | null;
}

export const initialSuitsState: SuitsState = {
  phase: "setup",
  players: [],
  deck: [],
  turn: 0,
  chosenSuit: null,
  lastTurn: null,
};

// Blank names become "Player 1", "Player 2" and so on
export function namePlayers(names: string[]): string[] {
  return names.map((name, index) => {
    const trimmed = name.trim();
    return trimmed === "" ? `Player ${(index + 1).toString()}` : trimmed;
  });
}

// Pass in a shuffled deck, so the rules themselves have no randomness
export function startGame(players: string[], shuffledDeck: Card[]): SuitsState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Suits needs between ${MIN_PLAYERS.toString()} and ${MAX_PLAYERS.toString()} players`,
    );
  }
  if (shuffledDeck.length < TOTAL_TURNS * CARDS_PER_TURN) {
    throw new Error("Suits needs a full deck");
  }

  return {
    ...initialSuitsState,
    phase: "guessing",
    players: namePlayers(players),
    deck: shuffledDeck,
  };
}

export function currentPlayer(state: SuitsState): string {
  return state.players[state.turn % state.players.length];
}

export function isFinalTurn(state: SuitsState): boolean {
  return state.turn === TOTAL_TURNS - 1;
}

// The number of other players, which every drink is multiplied by
export function magicNumber(playerCount: number): number {
  return playerCount - 1;
}

// One card of every suit
export function isSafeRound(cards: Card[]): boolean {
  return new Set(cards.map((card) => card.suit)).size === CARDS_PER_TURN;
}

export function calculateResult(
  chosenSuit: string,
  cards: Card[],
  playerCount: number,
  finalTurn: boolean,
): SuitsResult {
  const matches = cards.filter((card) => card.suit === chosenSuit).length;
  const multiplier = finalTurn ? 2 : 1;
  const others = magicNumber(playerCount);

  if (isSafeRound(cards)) {
    return { matches, kind: "safe", drinks: multiplier, doubled: finalTurn };
  }

  return matches > 0
    ? {
        matches,
        kind: "assign",
        drinks: matches * others * multiplier,
        doubled: finalTurn,
      }
    : {
        matches,
        kind: "drink",
        drinks: 2 * others * multiplier,
        doubled: finalTurn,
      };
}

// A guess can only be made while the game is going
export function chooseSuit(state: SuitsState, suit: string): SuitsState {
  if (state.phase !== "guessing") return state;
  return { ...state, chosenSuit: suit };
}

// Plays the turn and moves straight on to the next player, who starts with no
// suit picked. Does nothing without a guess, so a double click can't draw twice
export function reveal(state: SuitsState): SuitsState {
  if (state.phase !== "guessing" || state.chosenSuit === null) return state;

  const { drawn, remaining } = drawCards(state.deck, CARDS_PER_TURN);
  const finalTurn = isFinalTurn(state);
  const lastTurn: SuitsTurn = {
    player: currentPlayer(state),
    suit: state.chosenSuit,
    cards: drawn,
    result: calculateResult(
      state.chosenSuit,
      drawn,
      state.players.length,
      finalTurn,
    ),
  };

  return {
    ...state,
    // The final result stays on screen with the end of game controls
    phase: finalTurn ? "complete" : "guessing",
    turn: finalTurn ? state.turn : state.turn + 1,
    deck: remaining,
    chosenSuit: null,
    lastTurn,
  };
}

// Same players, new deck
export function replay(state: SuitsState, shuffledDeck: Card[]): SuitsState {
  return startGame(state.players, shuffledDeck);
}

export function isUnfinished(state: SuitsState): boolean {
  return state.phase === "guessing";
}

export function describeResult(player: string, result: SuitsResult): string {
  const drinks = `${result.drinks.toString()} ${result.drinks === 1 ? "drink" : "drinks"}`;
  const doubled = result.doubled ? " (doubled for the final turn)" : "";

  if (result.kind === "safe") {
    return `One of every suit, so everyone except ${player} drinks ${result.drinks.toString()}${doubled}.`;
  }

  if (result.kind === "assign") {
    const cards = result.matches === 1 ? "card" : "cards";
    return `${player} matched ${result.matches.toString()} ${cards}. Hand out ${drinks}${doubled}.`;
  }

  return `No matches. ${player} drinks ${result.drinks.toString()}${doubled}.`;
}
