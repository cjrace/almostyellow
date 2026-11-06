// What may leave the server. The full RoundState (hands, stock order) never does.
import type { Card, Colour } from "./cards";
import {
  playableCards,
  topCard,
  type Outcome,
  type RoundEvent,
  type RoundState,
  type UnoWindow,
} from "./round";

export interface PublicView {
  phase: RoundState["phase"];
  players: { id: string; cards: number }[];
  currentPlayer: string;
  direction: 1 | -1;
  top: Card;
  colour: Colour;
  stockCount: number;
  discardCount: number;
  // Whether the current player is deciding about a card they just drew.
  drawPending: boolean;
  uno: UnoWindow | null;
  outcome: Outcome | null;
}

export interface PrivateView {
  hand: Card[];
  playableIds: number[];
  drawnCardId: number | null;
}

export function publicView(state: RoundState): PublicView {
  return {
    phase: state.phase,
    players: state.players.map((id) => ({ id, cards: state.hands[id].length })),
    currentPlayer: state.players[state.current],
    direction: state.direction,
    top: topCard(state),
    colour: state.colour,
    stockCount: state.stock.length,
    discardCount: state.discard.length,
    drawPending: state.drawnCardId !== null,
    uno: state.uno ? { ...state.uno } : null,
    outcome: state.outcome ? { ...state.outcome } : null,
  };
}

export function privateView(state: RoundState, player: string): PrivateView {
  const hand = state.hands[player] ?? [];
  const isCurrent =
    state.phase === "playing" && state.players[state.current] === player;
  return {
    hand: [...hand],
    playableIds: isCurrent ? playableCards(state, player).map((c) => c.id) : [],
    drawnCardId: isCurrent ? state.drawnCardId : null,
  };
}

export type PublicEvent =
  | Exclude<RoundEvent, { type: "drew" | "penalty" }>
  | { type: "drew"; player: string; count: number }
  | {
      type: "penalty";
      player: string;
      reason: "draw2" | "wild4" | "uno";
      count: number;
    };

/** Drops the cards that only the player concerned may see. */
export function publicEvent(event: RoundEvent): PublicEvent {
  if (event.type === "drew")
    return { type: event.type, player: event.player, count: event.count };
  if (event.type === "penalty")
    return {
      type: event.type,
      player: event.player,
      reason: event.reason,
      count: event.count,
    };
  return event;
}
