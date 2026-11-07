import { describe, expect, it } from "vitest";
import {
  isWild,
  buildDeck,
  canPlayOn,
  DECK_SIZE,
  type Card,
  type Colour,
} from "@/unogame/engine/cards";
import {
  abandonRound,
  allCardIds,
  applyCommand,
  removePlayer,
  nextStartingIndex,
  playableCards,
  startRound,
  topCard,
  UNO_PROTECTION_MS,
  type Command,
  type Context,
  type RoundState,
  type Shuffle,
} from "@/unogame/engine/round";
import { privateView, publicEvent, publicView } from "@/unogame/engine/views";

// --- helpers ---------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle(seed: number): Shuffle {
  const random = mulberry32(seed);
  return (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
}
const keepOrder: Shuffle = (items) => [...items];
const at = (now = 0, shuffle: Shuffle = keepOrder): Context => ({
  now,
  shuffle,
});

// "R5", "Yskip", "Brev", "Gd2", "W", "W4"
function pick(used: Set<number>, spec: string): Card {
  const deck = buildDeck();
  const want = (card: Card) => {
    if (spec === "W") return card.kind === "wild";
    if (spec === "W4") return card.kind === "wild4";
    if (isWild(card)) return false;
    if (card.colour[0].toUpperCase() !== spec[0]) return false;
    const rest = spec.slice(1);
    if (rest === "skip") return card.kind === "skip";
    if (rest === "rev") return card.kind === "reverse";
    if (rest === "d2") return card.kind === "draw2";
    return card.kind === "number" && card.value === Number(rest);
  };
  const card = deck.find((c) => !used.has(c.id) && want(c));
  if (!card) throw new Error(`No spare card for ${spec}`);
  used.add(card.id);
  return card;
}
const colourOf = (card: Card): Colour =>
  "colour" in card ? card.colour : "red";

/** Builds a state from a few chosen cards. `stock` is listed top first. */
function rig(options: {
  hands: Record<string, string[]>;
  top: string;
  colour?: Colour;
  stock?: string[];
  discardBelow?: string[];
  current?: number;
  direction?: 1 | -1;
}): RoundState {
  const used = new Set<number>();
  const players = Object.keys(options.hands);
  const hands: Record<string, Card[]> = {};
  for (const player of players)
    hands[player] = options.hands[player].map((s) => pick(used, s));
  const below = (options.discardBelow ?? []).map((s) => pick(used, s));
  const top = pick(used, options.top);
  const stock = (options.stock ?? []).map((s) => pick(used, s)).reverse();
  return {
    phase: "playing",
    players,
    hands,
    stock,
    discard: [...below, top],
    colour: options.colour ?? colourOf(top),
    direction: options.direction ?? 1,
    current: options.current ?? 0,
    drawnCardId: null,
    uno: null,
    outcome: null,
  };
}
function run(state: RoundState, command: Command, ctx = at()) {
  const result = applyCommand(state, command, ctx);
  if (!result.ok)
    throw new Error(`${result.error.code}: ${result.error.message}`);
  expect(allCardIds(result.state)).toEqual(allCardIds(state));
  return result;
}
function errorOf(state: RoundState, command: Command, ctx = at()) {
  const result = applyCommand(state, command, ctx);
  if (result.ok) throw new Error("Expected the command to be rejected");
  return result.error.code;
}
function drawnId(state: RoundState): number {
  if (state.drawnCardId === null) throw new Error("No card has been drawn");
  return state.drawnCardId;
}
const card = (state: RoundState, player: string, index: number) =>
  state.hands[player][index];
const play = (
  state: RoundState,
  player: string,
  index: number,
  extra: Partial<Extract<Command, { type: "play" }>> = {},
  ctx = at(),
) =>
  run(
    state,
    { type: "play", player, cardId: card(state, player, index).id, ...extra },
    ctx,
  );

// --- the deck --------------------------------------------------------------

describe("Uno deck", () => {
  const deck = buildDeck();
  it("has 108 uniquely numbered cards with the standard make-up", () => {
    expect(deck).toHaveLength(DECK_SIZE);
    expect(new Set(deck.map((c) => c.id)).size).toBe(108);
    const count = (predicate: (c: Card) => boolean) =>
      deck.filter(predicate).length;
    expect(count((c) => c.kind === "number")).toBe(76);
    expect(count((c) => c.kind === "number" && c.value === 0)).toBe(4);
    for (const kind of ["skip", "reverse", "draw2"] as const)
      expect(count((c) => c.kind === kind)).toBe(8);
    expect(count((c) => c.kind === "wild")).toBe(4);
    expect(count((c) => c.kind === "wild4")).toBe(4);
  });

  it("matches on colour, number or symbol, and wilds always play", () => {
    const used = new Set<number>();
    const r5 = pick(used, "R5");
    expect(canPlayOn(pick(used, "R9"), r5, "red")).toBe(true);
    expect(canPlayOn(pick(used, "B5"), r5, "red")).toBe(true);
    expect(canPlayOn(pick(used, "B6"), r5, "red")).toBe(false);
    expect(canPlayOn(pick(used, "Bskip"), pick(used, "Rskip"), "red")).toBe(
      true,
    );
    expect(canPlayOn(pick(used, "Bskip"), r5, "red")).toBe(false);
    expect(canPlayOn(pick(used, "W4"), r5, "red")).toBe(true);
    // After a wild only the chosen colour counts.
    const wild = pick(used, "W");
    expect(canPlayOn(pick(used, "B1"), wild, "red")).toBe(false);
    expect(canPlayOn(pick(used, "R1"), wild, "red")).toBe(true);
  });
});

// --- dealing ---------------------------------------------------------------

describe("startRound", () => {
  const names = (n: number) =>
    Array.from({ length: n }, (_, i) => `p${String(i)}`);

  it.each([2, 3, 6, 10])(
    "deals seven each to %i players and conserves cards",
    (n) => {
      const state = startRound({
        players: names(n),
        startingIndex: 0,
        shuffle: seededShuffle(n),
      });
      for (const p of names(n)) expect(state.hands[p]).toHaveLength(7);
      expect(state.discard).toHaveLength(1);
      expect(state.stock).toHaveLength(108 - 7 * n - 1);
      expect(allCardIds(state)).toEqual(buildDeck().map((c) => c.id));
    },
  );

  it("always opens with a number card whatever the shuffle", () => {
    for (let seed = 0; seed < 300; seed++) {
      const state = startRound({
        players: names(4),
        startingIndex: 1,
        shuffle: seededShuffle(seed),
      });
      expect(topCard(state).kind).toBe("number");
      expect(state.colour).toBe(colourOf(topCard(state)));
      expect(allCardIds(state)).toHaveLength(108);
    }
  });

  it("opens with a number even when an action card is on top of the stock", () => {
    // The last card of the shuffle is the top of the stock.
    const wildFirst = ((items: readonly Card[]) => {
      const wilds = items.filter((c) => c.kind === "wild4");
      return [...items.filter((c) => c.kind !== "wild4"), ...wilds];
    }) as unknown as Shuffle;
    const state = startRound({
      players: names(2),
      startingIndex: 0,
      shuffle: wildFirst,
    });
    expect(topCard(state).kind).toBe("number");
    expect(allCardIds(state)).toHaveLength(108);
  });

  it("is deterministic for a given shuffle and starts with the chosen player", () => {
    const a = startRound({
      players: names(5),
      startingIndex: 3,
      shuffle: seededShuffle(7),
    });
    const b = startRound({
      players: names(5),
      startingIndex: 3,
      shuffle: seededShuffle(7),
    });
    expect(a).toEqual(b);
    expect(a.current).toBe(3);
    expect(a.direction).toBe(1);
  });

  it("rejects impossible set-ups and a shuffle that loses cards", () => {
    const shuffle = keepOrder;
    expect(() =>
      startRound({ players: names(1), startingIndex: 0, shuffle }),
    ).toThrow();
    expect(() =>
      startRound({ players: names(11), startingIndex: 0, shuffle }),
    ).toThrow();
    expect(() =>
      startRound({ players: ["a", "a"], startingIndex: 0, shuffle }),
    ).toThrow();
    expect(() =>
      startRound({ players: names(3), startingIndex: 3, shuffle }),
    ).toThrow();
    expect(() =>
      startRound({
        players: names(2),
        startingIndex: 0,
        shuffle: (items) => items.slice(1),
      }),
    ).toThrow(/permutation/);
  });

  it("rotates the starting player between rounds", () => {
    const seats = ["a", "b", "c"];
    expect(nextStartingIndex(seats, null)).toBe(0);
    expect(nextStartingIndex(seats, "a")).toBe(1);
    expect(nextStartingIndex(seats, "c")).toBe(0);
    expect(nextStartingIndex(seats, "gone")).toBe(0);
  });
});

// --- playing cards -----------------------------------------------------------

describe("playing a card", () => {
  it("rejects invalid moves without changing the state", () => {
    const state = rig({ hands: { a: ["B1", "R2"], b: ["R3"] }, top: "R5" });
    const before = structuredClone(state);
    expect(
      errorOf(state, {
        type: "play",
        player: "a",
        cardId: card(state, "a", 0).id,
      }),
    ).toBe("not_playable");
    expect(
      errorOf(state, {
        type: "play",
        player: "a",
        cardId: card(state, "b", 0).id,
      }),
    ).toBe("unknown_card");
    expect(
      errorOf(state, {
        type: "play",
        player: "b",
        cardId: card(state, "b", 0).id,
      }),
    ).toBe("not_your_turn");
    expect(errorOf(state, { type: "draw", player: "b" })).toBe("not_your_turn");
    expect(errorOf(state, { type: "keep", player: "a" })).toBe("nothing_drawn");
    expect(errorOf(state, { type: "catchUno", player: "b" })).toBe(
      "no_uno_window",
    );
    expect(errorOf(state, { type: "draw", player: "zed" })).toBe(
      "unknown_player",
    );
    expect(state).toEqual(before);
  });

  it("moves to the next player after a number card", () => {
    const state = rig({
      hands: { a: ["R2", "B1"], b: ["R3"], c: ["R4"] },
      top: "R5",
    });
    const { state: next, events } = play(state, "a", 0);
    expect(next.current).toBe(1);
    expect(topCard(next)).toEqual(card(state, "a", 0));
    expect(events[0]).toMatchObject({ type: "played", player: "a" });
  });

  it("needs a colour for wilds and then enforces it", () => {
    const state = rig({
      hands: { a: ["W", "B1"], b: ["R3", "B2"] },
      top: "R5",
      stock: ["G1"],
    });
    expect(
      errorOf(state, {
        type: "play",
        player: "a",
        cardId: card(state, "a", 0).id,
      }),
    ).toBe("colour_required");
    const { state: next } = play(state, "a", 0, { colour: "blue" });
    expect(next.colour).toBe("blue");
    expect(playableCards(next, "b").map((c) => c.id)).toEqual([
      card(state, "b", 1).id,
    ]);
    expect(
      errorOf(next, {
        type: "play",
        player: "b",
        cardId: card(state, "b", 0).id,
      }),
    ).toBe("not_playable");
  });

  it("skips the next player", () => {
    const state = rig({
      hands: { a: ["Rskip", "B1"], b: ["R3"], c: ["R4"] },
      top: "R5",
    });
    const { state: next, events } = play(state, "a", 0);
    expect(next.current).toBe(2);
    expect(events).toContainEqual({ type: "skipped", player: "b" });
  });

  it("reverses direction with three or more players", () => {
    const state = rig({
      hands: { a: ["Rrev", "B1"], b: ["R3"], c: ["R4", "Y1"] },
      top: "R5",
    });
    const { state: next } = play(state, "a", 0);
    expect(next.direction).toBe(-1);
    expect(next.current).toBe(2);
    const { state: after } = play(next, "c", 0);
    expect(after.current).toBe(1);
  });

  it("makes Reverse act as Skip with two players", () => {
    const state = rig({ hands: { a: ["Rrev", "B1"], b: ["R3"] }, top: "R5" });
    const { state: next } = play(state, "a", 0);
    expect(next.current).toBe(0);
    expect(next.direction).toBe(1);
  });

  it("makes the next player draw two and miss a turn, with no stacking", () => {
    const state = rig({
      hands: { a: ["Rd2", "B1"], b: ["Yd2"], c: ["R4"] },
      top: "R5",
      stock: ["G1", "G2", "G3"],
    });
    const { state: next, events } = play(state, "a", 0);
    expect(next.hands.b).toHaveLength(3);
    expect(next.current).toBe(2);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "penalty",
        player: "b",
        reason: "draw2",
        count: 2,
      }),
    );
  });

  it("lets Draw Two skip the opponent in a two-player game", () => {
    const state = rig({
      hands: { a: ["Rd2", "B1"], b: ["Y1"] },
      top: "R5",
      stock: ["G1", "G2"],
    });
    const { state: next } = play(state, "a", 0);
    expect(next.hands.b).toHaveLength(3);
    expect(next.current).toBe(0);
  });

  it("allows Wild Draw Four even with a matching card in hand", () => {
    const state = rig({
      hands: { a: ["W4", "R9"], b: ["Y1"], c: ["Y2"] },
      top: "R5",
      stock: ["G1", "G2", "G3", "G4"],
    });
    const { state: next } = play(state, "a", 0, { colour: "green" });
    expect(next.colour).toBe("green");
    expect(next.hands.b).toHaveLength(5);
    expect(next.current).toBe(2);
  });
});

// --- drawing ---------------------------------------------------------------

describe("drawing", () => {
  it("passes the turn when the drawn card cannot be played", () => {
    const state = rig({
      hands: { a: ["B1", "B2"], b: ["R3"] },
      top: "R5",
      stock: ["B3"],
    });
    const { state: next, events } = run(state, { type: "draw", player: "a" });
    expect(next.hands.a).toHaveLength(3);
    expect(next.current).toBe(1);
    expect(next.drawnCardId).toBeNull();
    expect(events[0]).toMatchObject({ type: "drew", player: "a", count: 1 });
  });

  it("lets a player play, or keep, a drawn card that fits", () => {
    const state = rig({
      hands: { a: ["B1", "B2"], b: ["R3"] },
      top: "R5",
      stock: ["R7", "R8"],
    });
    const { state: drawn } = run(state, { type: "draw", player: "a" });
    expect(drawn.current).toBe(0);
    expect(drawn.drawnCardId).toBe(drawn.hands.a[2].id);
    expect(errorOf(drawn, { type: "draw", player: "a" })).toBe(
      "must_play_or_keep",
    );
    expect(
      errorOf(drawn, {
        type: "play",
        player: "a",
        cardId: drawn.hands.a[0].id,
      }),
    ).toBe("must_play_or_keep");

    const { state: played } = run(drawn, {
      type: "play",
      player: "a",
      cardId: drawnId(drawn),
    });
    expect(played.current).toBe(1);
    expect(played.hands.a).toHaveLength(2);
    expect(played.drawnCardId).toBeNull();

    const { state: kept } = run(drawn, { type: "keep", player: "a" });
    expect(kept.current).toBe(1);
    expect(kept.hands.a).toHaveLength(3);
    expect(kept.drawnCardId).toBeNull();
  });

  it("does not allow drawing while holding a playable card", () => {
    const state = rig({
      hands: { a: ["R1", "B2"], b: ["R3"] },
      top: "R5",
      stock: ["B9"],
    });
    expect(errorOf(state, { type: "draw", player: "a" })).toBe("must_play");
  });

  it("does not allow drawing while holding a wild card, which is always playable", () => {
    const state = rig({
      hands: { a: ["B2", "W"], b: ["R3"] },
      top: "R5",
      stock: ["B9"],
    });
    expect(errorOf(state, { type: "draw", player: "a" })).toBe("must_play");
  });

  it("allows drawing when nothing in the hand can be played", () => {
    const state = rig({
      hands: { a: ["B1", "B2"], b: ["R3"] },
      top: "R5",
      stock: ["B9"],
    });
    expect(
      run(state, { type: "draw", player: "a" }).state.hands.a,
    ).toHaveLength(3);
  });

  it("limits the private view to the drawn card while a decision is pending", () => {
    const state = rig({
      hands: { a: ["B1", "B2"], b: ["R3"] },
      top: "R5",
      stock: ["R9"],
    });
    const { state: drawn } = run(state, { type: "draw", player: "a" });
    expect(privateView(drawn, "a")).toMatchObject({
      playableIds: [drawn.drawnCardId],
    });
    expect(privateView(drawn, "b").playableIds).toEqual([]);
  });
});

// --- finishing a round -------------------------------------------------------

describe("finishing a round", () => {
  it.each([
    ["a Skip", "Rskip", undefined],
    ["a Draw Two", "Rd2", undefined],
    ["a Wild Draw Four", "W4", "blue" as const],
    ["a Reverse", "Rrev", undefined],
    ["a number", "R9", undefined],
  ])(
    "is won by emptying the hand with %s, without applying its effect",
    (_name, spec, colour) => {
      const state = rig({
        hands: { a: [spec], b: ["Y1"], c: ["Y2"] },
        top: "R5",
        stock: ["G1", "G2", "G3", "G4"],
      });
      const { state: next, events } = play(state, "a", 0, { colour });
      expect(next.phase).toBe("finished");
      expect(next.outcome).toEqual({ type: "win", winner: "a" });
      expect(next.hands.b).toHaveLength(1);
      expect(events.at(-1)).toEqual({ type: "won", player: "a" });
      expect(errorOf(next, { type: "draw", player: "b" })).toBe("round_over");
    },
  );
});

// --- Uno ---------------------------------------------------------------------

describe("Uno declaration and catching", () => {
  const setup = () =>
    rig({
      hands: { a: ["R1", "R2"], b: ["R3", "B4"], c: ["R4"] },
      top: "R5",
      stock: ["G1", "G2", "G3", "G4"],
    });

  it("opens no window when Uno is declared with the play", () => {
    const { state, events } = play(setup(), "a", 0, { declareUno: true });
    expect(state.uno).toBeNull();
    expect(events).toContainEqual({ type: "uno-declared", player: "a" });
  });

  it("ignores a declaration that does not leave one card", () => {
    const state = rig({
      hands: { a: ["R1", "R2", "R3"], b: ["B1"] },
      top: "R5",
    });
    const { state: next, events } = play(state, "a", 0, { declareUno: true });
    expect(next.uno).toBeNull();
    expect(events.some((e) => e.type === "uno-declared")).toBe(false);
  });

  it("protects an undeclared player for three seconds, then lets anyone catch once", () => {
    const { state } = play(setup(), "a", 0, {}, at(10_000));
    expect(state.uno).toEqual({
      player: "a",
      protectedUntil: 10_000 + UNO_PROTECTION_MS,
    });
    const catchCommand = (player: string): Command => ({
      type: "catchUno",
      player,
    });
    expect(
      errorOf(state, catchCommand("b"), at(10_000 + UNO_PROTECTION_MS - 1)),
    ).toBe("uno_protected");
    expect(errorOf(state, catchCommand("a"), at(20_000))).toBe(
      "cannot_catch_self",
    );

    const { state: caught, events } = run(
      state,
      catchCommand("b"),
      at(10_000 + UNO_PROTECTION_MS),
    );
    expect(caught.hands.a).toHaveLength(3);
    expect(caught.uno).toBeNull();
    expect(caught.current).toBe(state.current);
    expect(events[0]).toEqual({
      type: "uno-caught",
      catcher: "b",
      player: "a",
    });
    expect(errorOf(caught, catchCommand("c"), at(30_000))).toBe(
      "no_uno_window",
    );
  });

  it("lets the next player's draw or play end the opportunity", () => {
    const { state } = play(setup(), "a", 0, {}, at(0));
    // b holds nothing that matches, so drawing is their move
    const { state: afterDraw } = run(
      play(
        rig({
          hands: { a: ["R1", "R2"], b: ["B3", "B4"], c: ["R4"] },
          top: "R5",
          stock: ["G1", "G2", "G3", "G4"],
        }),
        "a",
        0,
        {},
        at(0),
      ).state,
      { type: "draw", player: "b" },
      at(1000),
    );
    expect(afterDraw.uno).toBeNull();
    expect(
      errorOf(afterDraw, { type: "catchUno", player: "c" }, at(5000)),
    ).toBe("no_uno_window");

    const { state: afterPlay } = play(
      state,
      "b",
      0,
      { declareUno: true },
      at(1000),
    );
    expect(afterPlay.uno).toBeNull();
  });

  it("applies to a drawn card played to reach one card", () => {
    const state = rig({
      hands: { a: ["B1"], b: ["R3"] },
      top: "R5",
      stock: ["R7"],
    });
    const { state: drawn } = run(state, { type: "draw", player: "a" });
    const { state: exposed } = run(
      drawn,
      { type: "play", player: "a", cardId: drawnId(drawn) },
      at(0),
    );
    expect(exposed.uno).toMatchObject({ player: "a" });
    const { state: declared } = run(drawn, {
      type: "play",
      player: "a",
      cardId: drawnId(drawn),
      declareUno: true,
    });
    expect(declared.uno).toBeNull();
  });

  it("clears the window when the caught player is not the one holding one card any more", () => {
    // Skip in a two-player game gives the same player another go.
    const state = rig({
      hands: { a: ["Rskip", "B2"], b: ["B3", "B4"] },
      top: "R5",
    });
    const { state: next } = play(state, "a", 0, {}, at(0));
    expect(next.current).toBe(0);
    expect(next.uno).toMatchObject({ player: "a" });
    const { state: again } = run(next, { type: "draw", player: "a" }, at(100));
    expect(again.uno).toBeNull();
  });

  it("takes only the cards that exist when the stock is short", () => {
    const state = rig({
      hands: { a: ["R1", "R2"], b: ["R3"] },
      top: "R5",
    });
    const { state: exposed } = play(state, "a", 0, {}, at(0));
    const { state: caught } = run(
      exposed,
      { type: "catchUno", player: "b" },
      at(3000),
    );
    expect(caught.hands.a).toHaveLength(2);
    expect(caught.stock).toHaveLength(0);
  });
});

// --- exhausted stock -----------------------------------------------------------

describe("running out of cards", () => {
  it("recycles every discard except the top, then draws", () => {
    const state = rig({
      hands: { a: ["B1"], b: ["Y1"] },
      top: "R5",
      discardBelow: ["G2", "G3", "G4"],
    });
    const { state: next, events } = run(state, { type: "draw", player: "a" });
    expect(events[0]).toEqual({ type: "recycled", count: 3 });
    expect(next.discard).toEqual([topCard(state)]);
    expect(next.hands.a).toHaveLength(2);
    expect(next.stock).toHaveLength(2);
  });

  it("draws what it can when a penalty is larger than the supply", () => {
    const state = rig({
      hands: { a: ["W4", "R9"], b: ["Y1"], c: ["Y2"] },
      top: "R5",
      stock: ["G1"],
    });
    const { state: next, events } = play(state, "a", 0, { colour: "red" });
    expect(next.hands.b).toHaveLength(3);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "penalty", player: "b", count: 2 }),
    );
    expect(next.stock).toHaveLength(0);
  });

  it("passes the turn when there is nothing to draw but someone can still play", () => {
    const state = rig({ hands: { a: ["B1"], b: ["R2", "R3"] }, top: "R5" });
    const { state: next, events } = run(state, { type: "draw", player: "a" });
    expect(events[0]).toEqual({ type: "nothing-to-draw", player: "a" });
    expect(next.phase).toBe("playing");
    expect(next.current).toBe(1);
  });

  it("ends a completely blocked round with no winner and no lost cards", () => {
    const state = rig({ hands: { a: ["B1"], b: ["B2"] }, top: "R5" });
    const { state: next, events } = run(state, { type: "draw", player: "a" });
    expect(next.phase).toBe("finished");
    expect(next.outcome).toEqual({ type: "blocked" });
    expect(events.at(-1)).toEqual({ type: "blocked" });
    expect(errorOf(next, { type: "draw", player: "b" })).toBe("round_over");
  });
});

// --- whole rounds ----------------------------------------------------------------

describe("complete rounds", () => {
  it("plays a scripted two-player round", () => {
    let s = rig({
      hands: { a: ["R3", "Rskip", "R9"], b: ["G4", "Y2"] },
      top: "R5",
      stock: ["Y9", "B1", "G1"],
    });
    s = play(s, "a", 0).state; // R3
    expect(s.current).toBe(1);
    s = run(s, { type: "draw", player: "b" }).state; // Y9, no match
    expect(s.current).toBe(0);
    s = play(s, "a", 0, { declareUno: true }).state; // Skip, a goes again
    expect(s.current).toBe(0);
    expect(s.uno).toBeNull();
    s = play(s, "a", 0).state; // R9 wins
    expect(s.outcome).toEqual({ type: "win", winner: "a" });
    expect(s.hands.b).toHaveLength(3);
  });

  it("plays a scripted three-player round with reverse, wild, draw two and keep", () => {
    let s = rig({
      hands: { a: ["Yrev", "G1", "Y2"], b: ["Yd2", "Y3"], c: ["W", "R4"] },
      top: "Y5",
      stock: ["R8", "R9", "Y9"],
    });
    s = play(s, "a", 0).state; // reverse: c is next
    expect(s.direction).toBe(-1);
    expect(s.current).toBe(2);
    s = play(s, "c", 0, { colour: "yellow" }).state; // wild
    expect(s.current).toBe(1);
    s = play(s, "b", 0, { declareUno: true }).state; // Draw Two: a draws two and is skipped
    expect(s.hands.a).toHaveLength(4);
    expect(s.current).toBe(2);
    s = run(s, { type: "draw", player: "c" }).state; // Y9 fits yellow
    expect(s.drawnCardId).not.toBeNull();
    s = run(s, { type: "keep", player: "c" }).state;
    expect(s.current).toBe(1);
    s = play(s, "b", 0).state; // Y3 wins
    expect(s.outcome).toEqual({ type: "win", winner: "b" });
  });

  it.each([2, 3, 4, 7, 10])(
    "random %i-player rounds always finish and never create or lose a card",
    (n) => {
      const names = Array.from({ length: n }, (_, i) => `p${String(i)}`);
      const deckIds = buildDeck().map((c) => c.id);
      let wins = 0;
      for (let seed = 1; seed <= 15; seed++) {
        const random = mulberry32(seed * 1000 + n);
        const shuffle = seededShuffle(seed);
        let state = startRound({
          players: names,
          startingIndex: seed % n,
          shuffle,
        });
        let now = 0;
        let moves = 0;
        while (state.phase === "playing") {
          expect(++moves).toBeLessThan(5000);
          now += 1000;
          const ctx = { now, shuffle };
          if (state.uno && random() < 0.5) {
            const catcher = names[Math.floor(random() * n)];
            const caught = applyCommand(
              state,
              { type: "catchUno", player: catcher },
              ctx,
            );
            if (caught.ok) state = caught.state;
          }
          const player = state.players[state.current];
          let command: Command;
          if (state.drawnCardId !== null)
            command =
              random() < 0.5
                ? {
                    type: "play",
                    player,
                    cardId: state.drawnCardId,
                    colour: "blue",
                  }
                : { type: "keep", player };
          else {
            const options = playableCards(state, player);
            command = options.length
              ? {
                  type: "play",
                  player,
                  cardId: options[Math.floor(random() * options.length)].id,
                  colour: (["red", "yellow", "green", "blue"] as const)[
                    Math.floor(random() * 4)
                  ],
                  declareUno: random() < 0.7,
                }
              : { type: "draw", player };
          }
          const result = applyCommand(state, command, ctx);
          if (!result.ok)
            throw new Error(
              `${result.error.code} on ${JSON.stringify(command)}`,
            );
          state = result.state;
          expect(allCardIds(state)).toEqual(deckIds);
        }
        if (state.outcome?.type === "win") wins++;
      }
      expect(wins).toBeGreaterThan(0);
    },
  );
});

// --- purity and views ----------------------------------------------------------------

describe("purity and views", () => {
  it("leaves its input untouched and repeats exactly for the same inputs", () => {
    const state = rig({
      hands: { a: ["R1", "R2"], b: ["R3"] },
      top: "R5",
      stock: ["G1"],
    });
    const before = structuredClone(state);
    const command: Command = {
      type: "play",
      player: "a",
      cardId: card(state, "a", 0).id,
    };
    const first = applyCommand(state, command, at(5));
    const second = applyCommand(state, command, at(5));
    expect(state).toEqual(before);
    expect(first).toEqual(second);
  });

  it("publishes counts and the table, never hands or stock", () => {
    const state = startRound({
      players: ["a", "b", "c"],
      startingIndex: 0,
      shuffle: seededShuffle(3),
    });
    const view = publicView(state);
    expect(view.players).toEqual([
      { id: "a", cards: 7 },
      { id: "b", cards: 7 },
      { id: "c", cards: 7 },
    ]);
    expect(view.stockCount).toBe(state.stock.length);
    expect(view.top).toEqual(topCard(state));
    expect(Object.keys(view).sort()).not.toContain("hands");
    expect(JSON.stringify(view)).not.toContain(
      JSON.stringify(state.hands.a[0]),
    );
  });

  it("shows a player only their own hand and plays", () => {
    const state = rig({ hands: { a: ["R1", "B2"], b: ["R3"] }, top: "R5" });
    expect(privateView(state, "a").hand).toEqual(state.hands.a);
    expect(privateView(state, "a").playableIds).toEqual([state.hands.a[0].id]);
    expect(privateView(state, "b").playableIds).toEqual([]);
    expect(privateView(state, "b").hand).toEqual(state.hands.b);
  });

  it("strips drawn cards from events before publishing them", () => {
    const state = rig({
      hands: { a: ["B1", "B2"], b: ["R3"] },
      top: "R5",
      stock: ["B3"],
    });
    const { events } = run(state, { type: "draw", player: "a" });
    const drew = events.find((e) => e.type === "drew");
    if (!drew) throw new Error("No draw event");
    expect(drew).toHaveProperty("cards");
    const shown = publicEvent(drew);
    expect(shown).toEqual({ type: "drew", player: "a", count: 1 });
  });
});

describe("saying Uno after the play", () => {
  const exposed = () =>
    play(
      rig({
        hands: { a: ["R1", "R2"], b: ["B3", "B4"], c: ["R4"] },
        top: "R5",
        stock: ["G1", "G2", "G3", "G4"],
      }),
      "a",
      0,
      {},
      at(10_000),
    ).state;

  it("closes the window, inside the protected time or after it", () => {
    for (const now of [10_500, 10_000 + UNO_PROTECTION_MS + 5000]) {
      const { state, events } = run(
        exposed(),
        { type: "sayUno", player: "a" },
        at(now),
      );
      expect(state.uno).toBeNull();
      expect(events).toEqual([{ type: "uno-declared", player: "a" }]);
      // Nobody can catch a declared player, and the turn is unchanged
      expect(state.current).toBe(exposed().current);
      expect(
        errorOf(state, { type: "catchUno", player: "b" }, at(now + 10_000)),
      ).toBe("no_uno_window");
    }
  });

  it("only works for the player on one card, before the next draw or play", () => {
    const state = exposed();
    expect(errorOf(state, { type: "sayUno", player: "b" }, at(11_000))).toBe(
      "nothing_to_declare",
    );
    const { state: afterDraw } = run(
      state,
      { type: "draw", player: "b" },
      at(11_000),
    );
    expect(
      errorOf(afterDraw, { type: "sayUno", player: "a" }, at(12_000)),
    ).toBe("nothing_to_declare");
    expect(errorOf(state, { type: "sayUno", player: "zed" })).toBe(
      "unknown_player",
    );
  });

  it("is rejected when nothing needs declaring", () => {
    const state = rig({ hands: { a: ["R1", "R2"], b: ["R3"] }, top: "R5" });
    expect(errorOf(state, { type: "sayUno", player: "a" })).toBe(
      "nothing_to_declare",
    );
  });
});

describe("players leaving and rounds ending early", () => {
  const three = (extra: Partial<Parameters<typeof rig>[0]> = {}) =>
    rig({
      hands: { a: ["R1", "R2"], b: ["R3", "G4", "B5"], c: ["R6", "Y7"] },
      top: "R5",
      stock: ["G1", "G2"],
      ...extra,
    });
  const leave = (state: RoundState, player: string, ctx = at()) => {
    const result = removePlayer(state, player, ctx);
    if (!result.ok) throw new Error(result.error.code);
    expect(allCardIds(result.state)).toEqual(allCardIds(state));
    return result;
  };

  it("returns their cards to the draw pile and keeps the turn where it was", () => {
    const state = three({ current: 2 });
    const { state: next, events } = leave(state, "a");
    expect(next.players).toEqual(["b", "c"]);
    expect(next.hands).not.toHaveProperty("a");
    expect(next.stock).toHaveLength(state.stock.length + 2);
    expect(next.players[next.current]).toBe("c");
    expect(events).toEqual([{ type: "left", player: "a" }]);
  });

  it("refills an empty draw pile without touching the discard pile", () => {
    const state = three({
      hands: { a: ["R1", "R2"], b: ["B3", "G4", "B6"], c: ["R6", "Y7"] },
      stock: [],
      discardBelow: ["G9", "Y9"],
      current: 1,
    });
    const leaverIds = state.hands.a.map((c) => c.id).sort((x, y) => x - y);
    const { state: next } = leave(state, "a");
    expect(next.stock.map((c) => c.id).sort((x, y) => x - y)).toEqual(
      leaverIds,
    );
    expect(next.discard).toEqual(state.discard);

    const drawn = run(next, { type: "draw", player: "b" });
    expect(drawn.events.map((e) => e.type)).not.toContain("recycled");
    expect(drawn.state.hands.b).toHaveLength(4);
  });

  it("passes the turn on to the next player in the direction of play", () => {
    const forward = leave(three({ current: 1 }), "b").state;
    expect(forward.players[forward.current]).toBe("c");
    const last = leave(three({ current: 2 }), "c").state;
    expect(last.players[last.current]).toBe("a");
    const backward = leave(three({ current: 1, direction: -1 }), "b").state;
    expect(backward.players[backward.current]).toBe("a");
    const wrapped = leave(three({ current: 0, direction: -1 }), "a").state;
    expect(wrapped.players[wrapped.current]).toBe("c");
  });

  it("clears a card drawn by the player who left", () => {
    const state = three({
      hands: { a: ["R1", "R2"], b: ["B3", "G4", "B6"], c: ["R6", "Y7"] },
      current: 1,
    });
    const { state: drawn } = run(state, { type: "draw", player: "b" });
    const { state: next } = leave(
      { ...drawn, drawnCardId: drawn.hands.b[0].id, current: 1 },
      "b",
    );
    expect(next.drawnCardId).toBeNull();
  });

  it("drops an Uno window that belonged to the player who left", () => {
    const state = { ...three(), uno: { player: "a", protectedUntil: 0 } };
    expect(leave(state, "a").state.uno).toBeNull();
    expect(leave(state, "c").state.uno).toEqual(state.uno);
  });

  it("gives the round to the last player left", () => {
    const state = rig({ hands: { a: ["R1"], b: ["R2"] }, top: "R5" });
    const { state: next, events } = leave(state, "b");
    expect(next.phase).toBe("finished");
    expect(next.outcome).toEqual({ type: "win", winner: "a" });
    expect(events.map((e) => e.type)).toEqual(["left", "won"]);
  });

  it("rejects strangers and finished rounds", () => {
    const state = three();
    const stranger = removePlayer(state, "zed", at());
    expect(stranger.ok ? "" : stranger.error.code).toBe("unknown_player");
    const over = removePlayer({ ...state, phase: "finished" }, "a", at());
    expect(over.ok ? "" : over.error.code).toBe("round_over");
  });

  it("ends a round with no winner when the host abandons it", () => {
    const state = { ...three(), uno: { player: "a", protectedUntil: 0 } };
    const result = abandonRound(state);
    if (!result.ok) throw new Error("Expected the round to end.");
    expect(result.state.phase).toBe("finished");
    expect(result.state.outcome).toEqual({ type: "abandoned" });
    expect(result.state.uno).toBeNull();
    expect(result.events).toEqual([{ type: "abandoned" }]);
    const again = abandonRound(result.state);
    expect(again.ok ? "" : again.error.code).toBe("round_over");
  });
});
