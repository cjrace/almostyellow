// Pure Uno round engine. No Firebase, React, clock or randomness of its own:
// the caller injects `now` and `shuffle`, and keeps the full state server-only.
import {
  buildDeck,
  canPlayOn,
  colours,
  isWild,
  type Card,
  type Colour,
} from "./cards";

export const HAND_SIZE = 7;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const UNO_PROTECTION_MS = 3000;
const CATCH_PENALTY = 2;

export type Shuffle = <T>(items: readonly T[]) => T[];
export interface Context {
  now: number;
  shuffle: Shuffle;
}

export interface UnoWindow {
  player: string;
  // Catching is only allowed from this time, until the next draw or play.
  protectedUntil: number;
}
export type Outcome =
  | { type: "win"; winner: string }
  | { type: "blocked" }
  // The host ended the round early
  | { type: "abandoned" };

// Plain JSON, so it can be stored as is. The top of `stock` and `discard` is
// the last element.
export interface RoundState {
  phase: "playing" | "finished";
  players: string[];
  hands: Record<string, Card[]>;
  stock: Card[];
  discard: Card[];
  colour: Colour;
  direction: 1 | -1;
  current: number;
  // Id of the card just drawn, which the current player may still play.
  drawnCardId: number | null;
  uno: UnoWindow | null;
  outcome: Outcome | null;
}

export type Command =
  | {
      type: "play";
      player: string;
      cardId: number;
      colour?: Colour;
      declareUno?: boolean;
    }
  | { type: "draw"; player: string }
  | { type: "keep"; player: string }
  | { type: "catchUno"; player: string }
  // Says Uno after playing down to one card, while the window is still open
  | { type: "sayUno"; player: string };

// `cards` are only for the player concerned; see publicEvent in views.ts.
export type RoundEvent =
  | { type: "played"; player: string; card: Card; colour: Colour }
  | { type: "drew"; player: string; count: number; cards: Card[] }
  | {
      type: "penalty";
      player: string;
      reason: "draw2" | "wild4" | "uno";
      count: number;
      cards: Card[];
    }
  | { type: "skipped"; player: string }
  | { type: "reversed" }
  | { type: "kept"; player: string }
  | { type: "nothing-to-draw"; player: string }
  | { type: "uno-declared"; player: string }
  | { type: "uno-exposed"; player: string }
  | { type: "uno-caught"; catcher: string; player: string }
  | { type: "recycled"; count: number }
  | { type: "won"; player: string }
  | { type: "blocked" }
  | { type: "left"; player: string }
  | { type: "abandoned" };

export type ErrorCode =
  | "round_over"
  | "unknown_player"
  | "not_your_turn"
  | "unknown_card"
  | "not_playable"
  | "colour_required"
  | "must_play_or_keep"
  | "nothing_drawn"
  | "no_uno_window"
  | "nothing_to_declare"
  | "cannot_catch_self"
  | "uno_protected";

export type Result =
  | { ok: true; state: RoundState; events: RoundEvent[] }
  | { ok: false; error: { code: ErrorCode; message: string } };

const messages: Record<ErrorCode, string> = {
  round_over: "This round has finished.",
  unknown_player: "You are not seated in this round.",
  not_your_turn: "It is not your turn.",
  unknown_card: "That card is not in your hand.",
  not_playable: "That card cannot be played now.",
  colour_required: "Choose a colour for a wild card.",
  must_play_or_keep: "Play the card you drew or keep it.",
  nothing_drawn: "You have not drawn a card.",
  no_uno_window: "There is nobody to catch.",
  nothing_to_declare: "You have no Uno to say right now.",
  cannot_catch_self: "You cannot catch yourself.",
  uno_protected: "That player still has time to say Uno.",
};
const reject = (code: ErrorCode): Result => ({
  ok: false,
  error: { code, message: messages[code] },
});

function takeTop(cards: Card[]): Card {
  const card = cards.pop();
  if (!card) throw new Error("The deck ran out while dealing.");
  return card;
}

/** Setup mistakes are programmer errors, so they throw. */
export class SetupError extends Error {}

function checked(shuffle: Shuffle, cards: readonly Card[]): Card[] {
  const result = shuffle(cards);
  const ids = (list: readonly Card[]) =>
    list.map((c) => c.id).sort((a, b) => a - b);
  const before = ids(cards);
  const after = ids(result);
  if (
    before.length !== after.length ||
    before.some((id, index) => id !== after[index])
  )
    throw new Error("The shuffle must return a permutation of its input.");
  return result;
}

export function startRound(options: {
  players: readonly string[];
  startingIndex: number;
  shuffle: Shuffle;
}): RoundState {
  const { players, startingIndex, shuffle } = options;
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS)
    throw new SetupError(
      `A round needs ${String(MIN_PLAYERS)} to ${String(MAX_PLAYERS)} players.`,
    );
  if (new Set(players).size !== players.length || players.some((p) => !p))
    throw new SetupError("Player ids must be unique and not empty.");
  if (
    !Number.isInteger(startingIndex) ||
    startingIndex < 0 ||
    startingIndex >= players.length
  )
    throw new SetupError("The starting player is not seated.");

  const stock = checked(shuffle, buildDeck());
  const hands: Record<string, Card[]> = {};
  for (const player of players) hands[player] = [];
  for (let i = 0; i < HAND_SIZE; i++)
    for (const player of players) hands[player].push(takeTop(stock));
  // The opening discard is the first number card from the top, so no action
  // or wild card ever starts the round. The rest of the stock keeps its order.
  let index = stock.length - 1;
  while (index >= 0 && stock[index].kind !== "number") index--;
  const opener = index >= 0 ? stock.splice(index, 1)[0] : undefined;
  if (opener?.kind !== "number")
    throw new Error("The deck has no number card.");
  return {
    phase: "playing",
    players: [...players],
    hands,
    stock,
    discard: [opener],
    colour: opener.colour,
    direction: 1,
    current: startingIndex,
    drawnCardId: null,
    uno: null,
    outcome: null,
  };
}

/**
 * The next round's starter: the seat after the previous starter. If that
 * player has gone, or there was none, the first seat starts.
 */
export function nextStartingIndex(
  players: readonly string[],
  previousStarter: string | null,
): number {
  const index = previousStarter ? players.indexOf(previousStarter) : -1;
  return index === -1 ? 0 : (index + 1) % players.length;
}

export const topCard = (state: RoundState) =>
  state.discard[state.discard.length - 1];

/** Ids of every card in the round, sorted. Used to prove conservation. */
export function allCardIds(state: RoundState): number[] {
  return [
    ...state.stock,
    ...state.discard,
    ...Object.values(state.hands).flat(),
  ]
    .map((card) => card.id)
    .sort((a, b) => a - b);
}

export function playableCards(state: RoundState, player: string): Card[] {
  const top = topCard(state);
  const hand = state.hands[player] ?? [];
  if (state.drawnCardId !== null)
    return hand.filter((card) => card.id === state.drawnCardId);
  return hand.filter((card) => canPlayOn(card, top, state.colour));
}

const canDraw = (state: RoundState) =>
  state.stock.length > 0 || state.discard.length > 1;

function advance(state: RoundState, steps: number) {
  const n = state.players.length;
  state.current = (((state.current + state.direction * steps) % n) + n) % n;
}
const upcoming = (state: RoundState) => {
  const n = state.players.length;
  return state.players[(((state.current + state.direction) % n) + n) % n];
};

function recycle(state: RoundState, ctx: Context, events: RoundEvent[]) {
  if (state.discard.length <= 1) return;
  const rest = state.discard.slice(0, -1);
  state.discard = state.discard.slice(-1);
  state.stock = checked(ctx.shuffle, rest);
  events.push({ type: "recycled", count: rest.length });
}

/** Draws up to `count` cards, recycling once if needed. Never creates cards. */
function drawCards(
  state: RoundState,
  ctx: Context,
  player: string,
  count: number,
  events: RoundEvent[],
): Card[] {
  const drawn: Card[] = [];
  while (drawn.length < count) {
    if (state.stock.length === 0) recycle(state, ctx, events);
    const card = state.stock.pop();
    if (!card) break;
    drawn.push(card);
  }
  state.hands[player].push(...drawn);
  return drawn;
}

// A round nobody can progress ends with no winner. Wild cards are always
// playable, so this needs a shortage of cards that a full deck cannot reach.
function settle(state: RoundState, events: RoundEvent[]) {
  if (state.phase === "finished" || canDraw(state)) return;
  const top = topCard(state);
  const anyPlay = state.players.some((p) =>
    state.hands[p].some((card) => canPlayOn(card, top, state.colour)),
  );
  if (anyPlay) return;
  state.phase = "finished";
  state.outcome = { type: "blocked" };
  state.drawnCardId = null;
  state.uno = null;
  events.push({ type: "blocked" });
}

/**
 * Takes a player out of a round being played. Their cards are shuffled back
 * into the draw pile, so none are lost, and the turn passes on if it was
 * theirs. A last player left standing wins.
 */
export function removePlayer(
  previous: RoundState,
  player: string,
  ctx: Context,
): Result {
  if (previous.phase === "finished") return reject("round_over");
  const index = previous.players.indexOf(player);
  if (index === -1) return reject("unknown_player");
  const state = structuredClone(previous);
  const events: RoundEvent[] = [{ type: "left", player }];

  state.stock = checked(ctx.shuffle, [...state.stock, ...state.hands[player]]);
  state.hands = Object.fromEntries(
    Object.entries(state.hands).filter(([id]) => id !== player),
  );
  state.players.splice(index, 1);
  const n = state.players.length;
  if (index < state.current) state.current -= 1;
  else if (index === state.current) {
    // The next player in the direction of play takes the turn
    state.current = state.direction === 1 ? index % n : (index - 1 + n) % n;
    state.drawnCardId = null;
  }
  if (state.uno?.player === player) state.uno = null;

  if (n === 1) {
    state.phase = "finished";
    state.outcome = { type: "win", winner: state.players[0] };
    state.drawnCardId = null;
    state.uno = null;
    events.push({ type: "won", player: state.players[0] });
  } else settle(state, events);
  return { ok: true, state, events };
}

/** Ends a round early with no winner, for the host. */
export function abandonRound(previous: RoundState): Result {
  if (previous.phase === "finished") return reject("round_over");
  const state = structuredClone(previous);
  state.phase = "finished";
  state.outcome = { type: "abandoned" };
  state.drawnCardId = null;
  state.uno = null;
  return { ok: true, state, events: [{ type: "abandoned" }] };
}

export function applyCommand(
  previous: RoundState,
  command: Command,
  ctx: Context,
): Result {
  if (previous.phase === "finished") return reject("round_over");
  if (!previous.players.includes(command.player))
    return reject("unknown_player");
  const state = structuredClone(previous);
  const events: RoundEvent[] = [];
  const player = command.player;

  if (command.type === "sayUno") {
    // Allowed at any time until the next draw or play, even after the
    // protected time, so saying it beats a catch that has not happened yet
    if (state.uno?.player !== player) return reject("nothing_to_declare");
    state.uno = null;
    events.push({ type: "uno-declared", player });
    return { ok: true, state, events };
  }

  if (command.type === "catchUno") {
    const window = state.uno;
    if (!window) return reject("no_uno_window");
    if (window.player === player) return reject("cannot_catch_self");
    if (ctx.now < window.protectedUntil) return reject("uno_protected");
    state.uno = null;
    const cards = drawCards(state, ctx, window.player, CATCH_PENALTY, events);
    events.push({ type: "uno-caught", catcher: player, player: window.player });
    events.push({
      type: "penalty",
      player: window.player,
      reason: "uno",
      count: cards.length,
      cards,
    });
    settle(state, events);
    return { ok: true, state, events };
  }

  if (state.players[state.current] !== player) return reject("not_your_turn");

  if (command.type === "keep") {
    if (state.drawnCardId === null) return reject("nothing_drawn");
    state.drawnCardId = null;
    events.push({ type: "kept", player });
    advance(state, 1);
    settle(state, events);
    return { ok: true, state, events };
  }

  if (command.type === "draw") {
    if (state.drawnCardId !== null) return reject("must_play_or_keep");
    state.uno = null;
    const drawn = drawCards(state, ctx, player, 1, events);
    if (drawn.length === 0) {
      events.push({ type: "nothing-to-draw", player });
      advance(state, 1);
    } else {
      const card = drawn[0];
      events.push({ type: "drew", player, count: 1, cards: [card] });
      if (canPlayOn(card, topCard(state), state.colour))
        state.drawnCardId = card.id;
      else advance(state, 1);
    }
    settle(state, events);
    return { ok: true, state, events };
  }

  // play
  const hand = state.hands[player];
  const card = hand.find((c) => c.id === command.cardId);
  if (!card) return reject("unknown_card");
  if (state.drawnCardId !== null && card.id !== state.drawnCardId)
    return reject("must_play_or_keep");
  if (!canPlayOn(card, topCard(state), state.colour))
    return reject("not_playable");
  let colour: Colour;
  if (isWild(card)) {
    if (!command.colour || !colours.includes(command.colour))
      return reject("colour_required");
    colour = command.colour;
  } else colour = card.colour;

  hand.splice(hand.indexOf(card), 1);
  state.discard.push(card);
  state.colour = colour;
  state.drawnCardId = null;
  state.uno = null;
  events.push({ type: "played", player, card, colour: state.colour });

  // Action cards that empty the hand still win; their effects are not applied.
  if (hand.length === 0) {
    state.phase = "finished";
    state.outcome = { type: "win", winner: player };
    events.push({ type: "won", player });
    return { ok: true, state, events };
  }
  if (hand.length === 1) {
    if (command.declareUno) events.push({ type: "uno-declared", player });
    else {
      state.uno = { player, protectedUntil: ctx.now + UNO_PROTECTION_MS };
      events.push({ type: "uno-exposed", player });
    }
  }

  const penalise = (reason: "draw2" | "wild4", count: number) => {
    const victim = upcoming(state);
    const cards = drawCards(state, ctx, victim, count, events);
    events.push({
      type: "penalty",
      player: victim,
      reason,
      count: cards.length,
      cards,
    });
    events.push({ type: "skipped", player: victim });
    advance(state, 2);
  };
  switch (card.kind) {
    case "skip":
      events.push({ type: "skipped", player: upcoming(state) });
      advance(state, 2);
      break;
    case "reverse":
      events.push({ type: "reversed" });
      if (state.players.length === 2) {
        // Acts as Skip.
        events.push({ type: "skipped", player: upcoming(state) });
        advance(state, 2);
      } else {
        state.direction = state.direction === 1 ? -1 : 1;
        advance(state, 1);
      }
      break;
    case "draw2":
      penalise("draw2", 2);
      break;
    case "wild4":
      penalise("wild4", 4);
      break;
    default:
      advance(state, 1);
  }
  settle(state, events);
  return { ok: true, state, events };
}
