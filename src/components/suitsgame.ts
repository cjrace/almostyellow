// Rules for Suits, kept apart from the page so they can be tested on their own
// and reused if the game is ever played across several devices.
import { Card, drawCards } from "@/components/carddeck";

export const TOTAL_TURNS = 13;
export const CARDS_PER_TURN = 4;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 13;

export type SuitsPhase = "setup" | "guessing" | "revealed" | "complete";

export interface SuitsResult {
  matches: number;
  kind: "assign" | "drink"; // Hand drinks out, or drink them yourself
  drinks: number;
  doubled: boolean;
}

export interface SuitsState {
  phase: SuitsPhase;
  players: string[];
  deck: Card[];
  turn: number; // 0 to TOTAL_TURNS - 1
  chosenSuit: string | null;
  revealed: Card[];
  result: SuitsResult | null;
}

export const initialSuitsState: SuitsState = {
  phase: "setup",
  players: [],
  deck: [],
  turn: 0,
  chosenSuit: null,
  revealed: [],
  result: null,
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

export function calculateResult(
  chosenSuit: string,
  cards: Card[],
  playerCount: number,
  finalTurn: boolean,
): SuitsResult {
  const matches = cards.filter((card) => card.suit === chosenSuit).length;
  const multiplier = finalTurn ? 2 : 1;
  const others = playerCount - 1;

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

// A guess can only change before the cards are revealed
export function chooseSuit(state: SuitsState, suit: string): SuitsState {
  if (state.phase !== "guessing") return state;
  return { ...state, chosenSuit: suit };
}

// Does nothing if there's no guess yet or the cards are already showing, so a
// double click can't draw twice
export function reveal(state: SuitsState): SuitsState {
  if (state.phase !== "guessing" || state.chosenSuit === null) return state;

  const { drawn, remaining } = drawCards(state.deck, CARDS_PER_TURN);
  const finalTurn = isFinalTurn(state);

  return {
    ...state,
    // The final result stays on screen with the end of game controls
    phase: finalTurn ? "complete" : "revealed",
    deck: remaining,
    revealed: drawn,
    result: calculateResult(
      state.chosenSuit,
      drawn,
      state.players.length,
      finalTurn,
    ),
  };
}

export function nextPlayer(state: SuitsState): SuitsState {
  if (state.phase !== "revealed") return state;

  return {
    ...state,
    phase: "guessing",
    turn: state.turn + 1,
    chosenSuit: null,
    revealed: [],
    result: null,
  };
}

// Same players, new deck
export function replay(state: SuitsState, shuffledDeck: Card[]): SuitsState {
  return startGame(state.players, shuffledDeck);
}

export function isUnfinished(state: SuitsState): boolean {
  return state.phase === "guessing" || state.phase === "revealed";
}

export function describeResult(player: string, result: SuitsResult): string {
  const drinks = `${result.drinks.toString()} ${result.drinks === 1 ? "drink" : "drinks"}`;
  const doubled = result.doubled ? " (doubled for the final turn)" : "";

  if (result.kind === "assign") {
    const cards = result.matches === 1 ? "card" : "cards";
    return `${player} matched ${result.matches.toString()} ${cards}. Hand out ${drinks}${doubled}.`;
  }

  return `No matches. ${player} drinks ${result.drinks.toString()}${doubled}.`;
}
