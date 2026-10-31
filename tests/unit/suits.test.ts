import { describe, expect, it } from "vitest";
import {
  Card,
  createCardDeck,
  shuffleDeck,
  SuitNames,
} from "@/components/carddeck";
import {
  calculateResult,
  chooseSuit,
  currentPlayer,
  describeResult,
  isFinalTurn,
  isSafeRound,
  magicNumber,
  namePlayers,
  replay,
  reveal,
  startGame,
  SuitsState,
  TOTAL_TURNS,
} from "@/components/suitsgame";

const players = (count: number) =>
  Array.from({ length: count }, (_, i) => `P${(i + 1).toString()}`);

// Four cards with the given number of hearts
const hand = (hearts: number): Card[] =>
  Array.from({ length: 4 }, (_, i) => ({
    suit: i < hearts ? "Hearts" : "Spades",
    rank: "Two",
  }));

function playTurn(state: SuitsState, suit = "Hearts") {
  return reveal(chooseSuit(state, suit));
}

function playWholeGame(state: SuitsState) {
  while (state.phase !== "complete") {
    state = playTurn(state);
  }
  return state;
}

describe("Suits setup", () => {
  it("names blank players by their position", () => {
    expect(namePlayers(["", " Ben ", "  "])).toEqual([
      "Player 1",
      "Ben",
      "Player 3",
    ]);
  });

  it("needs 2 to 13 players and a full deck", () => {
    expect(() => startGame(players(1), createCardDeck())).toThrow();
    expect(() => startGame(players(14), createCardDeck())).toThrow();
    expect(() => startGame(players(2), createCardDeck().slice(1))).toThrow();
    expect(startGame(players(13), createCardDeck()).phase).toBe("guessing");
  });
});

describe("Suits scoring", () => {
  it.each([2, 3, 4, 7, 13])("scores every match count with %i players", (n) => {
    expect(calculateResult("Hearts", hand(0), n, false)).toEqual({
      matches: 0,
      kind: "drink",
      drinks: 2 * (n - 1),
      doubled: false,
    });
    for (let k = 1; k <= 4; k++) {
      expect(calculateResult("Hearts", hand(k), n, false)).toEqual({
        matches: k,
        kind: "assign",
        drinks: k * (n - 1),
        doubled: false,
      });
    }
  });

  it("doubles both results on the final turn", () => {
    expect(calculateResult("Hearts", hand(3), 4, true).drinks).toBe(18);
    expect(calculateResult("Hearts", hand(0), 4, true).drinks).toBe(12);
  });

  it("makes one of every suit a safe round, whatever the guess", () => {
    const oneOfEach = SuitNames.map((suit) => ({ suit, rank: "Two" }));
    expect(isSafeRound(oneOfEach)).toBe(true);
    expect(isSafeRound(hand(2))).toBe(false);

    expect(calculateResult("Hearts", oneOfEach, 4, false)).toEqual({
      matches: 1,
      kind: "safe",
      drinks: 1,
      doubled: false,
    });
    expect(calculateResult("Clubs", oneOfEach, 4, true).drinks).toBe(2);
    expect(
      describeResult("Ben", calculateResult("Clubs", oneOfEach, 4, true)),
    ).toBe(
      "One of every suit, so everyone except Ben drinks 2 (doubled for the final turn).",
    );
  });

  it("makes the magic number the number of other players", () => {
    expect(magicNumber(2)).toBe(1);
    expect(magicNumber(13)).toBe(12);
  });

  it("describes results", () => {
    expect(
      describeResult("Ben", calculateResult("Hearts", hand(1), 2, false)),
    ).toBe("Ben matched 1 card. Hand out 1 drink.");
    expect(
      describeResult("Ben", calculateResult("Hearts", hand(0), 3, true)),
    ).toBe("No matches. Ben drinks 8 (doubled for the final turn).");
  });
});

describe("Suits turns", () => {
  it.each([2, 3, 5, 13])("cycles through %i players over 13 turns", (n) => {
    let state = startGame(players(n), shuffleDeck(createCardDeck()));
    const order: string[] = [];

    for (let turn = 0; turn < TOTAL_TURNS; turn++) {
      order.push(currentPlayer(state));
      expect(isFinalTurn(state)).toBe(turn === TOTAL_TURNS - 1);
      state = playTurn(state);
      expect(state.lastTurn?.player).toBe(order[turn]);
      expect(state.lastTurn?.result.doubled).toBe(turn === TOTAL_TURNS - 1);
    }

    expect(order).toEqual(
      Array.from(
        { length: TOTAL_TURNS },
        (_, i) => `P${((i % n) + 1).toString()}`,
      ),
    );
    expect(state.phase).toBe("complete");
    expect(state.deck).toHaveLength(0);
  });

  it("uses all 52 cards exactly once", () => {
    let state = startGame(players(3), shuffleDeck(createCardDeck()));
    const seen: Card[] = [];

    while (state.phase !== "complete") {
      state = playTurn(state);
      seen.push(...(state.lastTurn?.cards ?? []));
    }

    expect(new Set(seen.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });

  it("moves straight on to the next player, with the last turn on show", () => {
    const state = playTurn(
      startGame(["Ben", "Cam"], createCardDeck()),
      "Clubs",
    );

    expect(state.phase).toBe("guessing");
    expect(currentPlayer(state)).toBe("Cam");
    expect(state.chosenSuit).toBeNull();
    expect(state.lastTurn?.player).toBe("Ben");
    expect(state.lastTurn?.suit).toBe("Clubs");
    expect(state.lastTurn?.cards).toHaveLength(4);
  });

  it("keeps the final result on screen when the game ends", () => {
    const state = playWholeGame(startGame(players(2), createCardDeck()));
    expect(state.phase).toBe("complete");
    expect(state.turn).toBe(TOTAL_TURNS - 1);
    expect(state.lastTurn?.cards).toHaveLength(4);
    expect(state.lastTurn?.result.doubled).toBe(true);
  });

  it("ignores a reveal with no suit, so a double click can't draw twice", () => {
    const start = startGame(players(2), createCardDeck());
    expect(reveal(start)).toBe(start);

    const revealed = playTurn(start);
    expect(reveal(revealed)).toBe(revealed);
    expect(revealed.deck).toHaveLength(48);
  });

  it("won't take a guess once the game is over", () => {
    const finished = playWholeGame(startGame(players(2), createCardDeck()));
    expect(chooseSuit(finished, "Clubs")).toBe(finished);
  });

  it("replays with the same players and a new deck", () => {
    const finished = playWholeGame(startGame(["Ben", ""], createCardDeck()));
    const newDeck = shuffleDeck(createCardDeck());
    const again = replay(finished, newDeck);

    expect(again.players).toEqual(["Ben", "Player 2"]);
    expect(again.phase).toBe("guessing");
    expect(again.turn).toBe(0);
    expect(again.deck).toBe(newDeck);
    expect(again.lastTurn).toBeNull();
  });
});
