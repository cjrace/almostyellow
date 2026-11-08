import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/firebase/admin";
import {
  cleanupRooms,
  createRoom,
  joinGuestRoom,
  joinRoom,
  playerCommand,
} from "@/rooms/service";
import {
  controlUnoRoom,
  saveRoomToTracker,
  unoPlayerCommand,
} from "@/unogame/service";
import { trackerGameId } from "@/unogame/tracker";
import { playableCards, type RoundState } from "@/unogame/engine/round";
import { canPlayOn, type Card } from "@/unogame/engine/cards";
import type { UnoHand, UnoRoom } from "@/unogame/room";
import { POST } from "@/app/api/uno/route";
import { POST as buzzerPOST } from "@/app/api/buzzer/route";
import { resetAndSeed } from "./seed";
import { assertEmulatorEnvironment } from "./guard";
import { users } from "./fixtures";

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: assertEmulatorEnvironment().projectId,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await resetAndSeed();
});

const owner = users.alice.uid;

async function room(code: string) {
  return (await adminDb().doc(`gameRooms/${code}`).get()).data() as UnoRoom;
}
async function secretState(code: string) {
  const data = (await adminDb().doc(`roomPrivate/${code}`).get()).data() as {
    state: RoundState;
  };
  return data.state;
}
async function hand(code: string, playerId: string) {
  return (await adminDb().doc(`roomHands/${code}_${playerId}`).get()).data() as
    UnoHand | undefined;
}
async function table(players: number) {
  const code = await createRoom(owner, randomUUID(), "uno");
  const seated: { uid: string; playerId: string }[] = [];
  for (let i = 0; i < players; i++) {
    const uid = `player${String(i)}`;
    const { playerId } = await joinRoom(
      uid,
      { code, name: `Player ${String(i)}` },
      false,
      "uno",
    );
    seated.push({ uid, playerId });
  }
  return { code, seated };
}
async function host(
  code: string,
  action: "start" | "remove" | "end" | "abandon",
  extra: object = {},
) {
  const current = await room(code);
  await controlUnoRoom(owner, action, {
    code,
    round: current.round,
    version: current.version,
    commandId: randomUUID(),
    ...extra,
  });
}
async function started(players: number) {
  const setup = await table(players);
  await host(setup.code, "start");
  return setup;
}
// The seat whose turn it is, and a card that seat may play
async function turn(code: string, seated: { uid: string; playerId: string }[]) {
  const state = await secretState(code);
  const playerId = state.players[state.current];
  const seat = seated.find((s) => s.playerId === playerId);
  if (!seat) throw new Error("Nobody is seated there.");
  return { state, seat, playable: playableCards(state, playerId) };
}
// Swaps any card the player to move could play for one they could not, in the
// server's record and in their published hand, so drawing is their only move
async function noPlayableCards(
  code: string,
  seated: { uid: string; playerId: string }[],
) {
  const ref = adminDb().doc(`roomPrivate/${code}`);
  const state = await secretState(code);
  const playerId = state.players[state.current];
  const seat = seated.find((s) => s.playerId === playerId);
  if (!seat) throw new Error("Nobody is seated there.");
  const top = state.discard[state.discard.length - 1];
  const dead = (card: Card) => !canPlayOn(card, top, state.colour);
  state.hands[playerId] = state.hands[playerId].map((card) => {
    if (dead(card)) return card;
    const index = state.stock.findIndex(dead);
    const [swap] = state.stock.splice(index, 1, card);
    return swap;
  });
  await ref.update({ state });
  await adminDb()
    .doc(`roomHands/${code}_${playerId}`)
    .update({ hand: state.hands[playerId], playableIds: [] });
  return { state, seat };
}
// Gives the player to move a plain number card that matches the pile, so
// playing it simply passes the turn on
async function givePlainCard(
  code: string,
  seated: { uid: string; playerId: string }[],
) {
  const state = await secretState(code);
  const mover = state.players[state.current];
  const seat = seated.find((s) => s.playerId === mover);
  if (!seat) throw new Error("Nobody is seated there.");
  const index = state.stock.findIndex((c) => c.kind === "number");
  const [plain] = state.stock.splice(index, 1);
  if (plain.kind !== "number") throw new Error("Needs a number card.");
  state.hands[mover].push(plain);
  state.colour = plain.colour;
  await adminDb().doc(`roomPrivate/${code}`).update({ state });
  return { seat, plain };
}
async function play(
  code: string,
  uid: string,
  card: Card,
  commandId = randomUUID(),
) {
  const current = await room(code);
  await unoPlayerCommand(uid, "play", {
    code,
    round: current.round,
    commandId,
    cardId: card.id,
    ...(card.kind === "wild" || card.kind === "wild4" ? { colour: "red" } : {}),
  });
}

describe("Uno rooms", () => {
  test("a room belongs to one game and admits two to ten players", async () => {
    const buzzer = await createRoom(owner, randomUUID());
    await expect(
      joinRoom("guest", { code: buzzer, name: "Guest" }, false, "uno"),
    ).rejects.toThrow("not available");
    const { code } = await table(10);
    await expect(
      joinRoom("guest", { code, name: "Guest" }, false, "buzzer"),
    ).rejects.toThrow("not available");
    await expect(
      joinRoom("eleventh", { code, name: "Eleventh" }, false, "uno"),
    ).rejects.toThrow("full");
    // The buzzer keeps its limit of twenty
    for (let i = 0; i < 20; i++)
      await joinRoom(`b${String(i)}`, { code: buzzer, name: `B${String(i)}` });
    await expect(
      joinRoom("b20", { code: buzzer, name: "B20" }),
    ).rejects.toThrow("full");
    expect((await room(code)).stage).toBe("lobby");
  });

  test("buzzer commands cannot reach an Uno room", async () => {
    const { code, seated } = await table(2);
    const current = await room(code);
    await expect(
      playerCommand(seated[0].uid, "buzz", {
        code,
        round: current.round,
        version: current.version,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow("not a buzzer room");
  });

  test("only the host starts a round, and it needs two players", async () => {
    const { code } = await table(1);
    await expect(host(code, "start")).rejects.toThrow("at least 2");
    await joinRoom("second", { code, name: "Second" }, false, "uno");
    const current = await room(code);
    await expect(
      controlUnoRoom("someone-else", "start", {
        code,
        round: current.round,
        version: current.version,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow("do not host");
    await host(code, "start");
    await expect(host(code, "start")).rejects.toThrow("already being played");
  });

  test("starting deals seven cards to each seat and publishes no hands", async () => {
    const { code, seated } = await started(3);
    const published = await room(code);
    expect(published.stage).toBe("playing");
    expect(published.seats).toEqual(seated.map((s) => s.playerId));
    expect(published.view?.players.map((p) => p.cards)).toEqual([7, 7, 7]);
    expect(Object.keys(published)).not.toContain("state");
    expect(JSON.stringify(published)).not.toContain('"hands"');
    expect(JSON.stringify(published)).not.toContain('"stock":[');
    const state = await secretState(code);
    expect(state.stock.length + state.discard.length).toBe(108 - 21);
    for (const seat of seated)
      expect((await hand(code, seat.playerId))?.hand).toHaveLength(7);
  });

  test("a play moves the turn on and updates only the hands that changed", async () => {
    const { code, seated } = await started(3);
    const { seat, playable, state } = await turn(code, seated);
    const before = await room(code);
    // The opening discard is a number, so something may need drawing first
    if (playable.length === 0) return;
    await play(code, seat.uid, playable[0]);
    const after = await room(code);
    expect(after.version).toBe(before.version + 1);
    expect(after.events.length).toBeGreaterThan(0);
    const mine = await hand(code, seat.playerId);
    expect(mine?.hand.some((c) => c.id === playable[0].id)).toBe(false);
    expect(mine?.hand).toHaveLength(6);
    expect((await secretState(code)).discard.length).toBe(
      state.discard.length + 1,
    );
  });

  test("repeating a command id changes nothing", async () => {
    const { code, seated } = await started(2);
    const { seat, playable } = await turn(code, seated);
    if (playable.length === 0) return;
    const commandId = randomUUID();
    await play(code, seat.uid, playable[0], commandId);
    const once = await room(code);
    await play(code, seat.uid, playable[0], commandId);
    expect((await room(code)).version).toBe(once.version);
  });

  test("two copies of a command arriving together apply it once", async () => {
    // A resend can reach the server while the first copy is still running
    const { code, seated } = await started(2);
    const { seat, plain } = await givePlainCard(code, seated);
    const before = await secretState(code);
    const commandId = randomUUID();
    const results = await Promise.allSettled([
      play(code, seat.uid, plain, commandId),
      play(code, seat.uid, plain, commandId),
    ]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    const after = await secretState(code);
    expect(after.discard).toHaveLength(before.discard.length + 1);
    expect(after.hands[seat.playerId]).toHaveLength(
      before.hands[seat.playerId].length - 1,
    );
  });

  test("playing out of turn or with a card you do not hold is refused", async () => {
    const { code, seated } = await started(3);
    const { seat, playable, state } = await turn(code, seated);
    const other = seated.find((s) => s.uid !== seat.uid);
    if (!other) throw new Error("Needs another player.");
    const card = state.hands[seat.playerId][0];
    await expect(play(code, other.uid, card)).rejects.toThrow("not your turn");
    const stranger = state.hands[other.playerId][0];
    await expect(play(code, seat.uid, stranger)).rejects.toThrow(
      "not in your hand",
    );
    expect((await room(code)).version).toBe(1);
    expect(playable).toBeDefined();
  });

  test("a player holding a card they can play cannot draw", async () => {
    const { code, seated } = await started(2);
    const { seat, playable } = await turn(code, seated);
    if (playable.length === 0) return;
    const current = await room(code);
    await expect(
      unoPlayerCommand(seat.uid, "draw", {
        code,
        round: current.round,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow("cannot draw");
    expect((await room(code)).version).toBe(current.version);
  });

  test("drawing adds a card to the drawer's hand only", async () => {
    const { code, seated } = await started(2);
    const { seat } = await noPlayableCards(code, seated);
    const current = await room(code);
    await unoPlayerCommand(seat.uid, "draw", {
      code,
      round: current.round,
      commandId: randomUUID(),
    });
    const after = await room(code);
    const drawer = after.view?.players.find((p) => p.id === seat.playerId);
    expect(drawer?.cards).toBe(8);
    expect((await hand(code, seat.playerId))?.hand).toHaveLength(8);
    expect(JSON.stringify(after.events)).not.toContain('"cards":[');
  });

  test("catching needs the version the player saw", async () => {
    const { code, seated } = await started(2);
    const current = await room(code);
    await expect(
      unoPlayerCommand(seated[0].uid, "catch", {
        code,
        round: current.round,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow();
    await expect(
      unoPlayerCommand(seated[0].uid, "catch", {
        code,
        round: current.round,
        version: current.version - 1,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow("table changed");
    await expect(
      unoPlayerCommand(seated[0].uid, "catch", {
        code,
        round: current.round,
        version: current.version,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow("nobody to catch");
  });

  test("a player who leaves mid-round takes their cards out of play and the round goes on", async () => {
    const { code, seated } = await started(3);
    const before = await secretState(code);
    const leaver = seated[1];
    const current = await room(code);
    await unoPlayerCommand(leaver.uid, "leave", {
      code,
      round: current.round,
      commandId: randomUUID(),
    });
    const after = await secretState(code);
    expect(after.phase).toBe("playing");
    expect(after.players).not.toContain(leaver.playerId);
    expect(after.players).toHaveLength(2);
    // Every card is still somewhere
    const ids = (state: RoundState) =>
      [...state.stock, ...state.discard, ...Object.values(state.hands).flat()]
        .map((c) => c.id)
        .sort((x, y) => x - y);
    expect(ids(after)).toEqual(ids(before));
    const published = await room(code);
    expect(published.players.map((p) => p.id)).not.toContain(leaver.playerId);
    expect(published.view?.players).toHaveLength(2);
    expect(published.events).toEqual([
      { type: "left", player: leaver.playerId },
    ]);
    expect(await hand(code, leaver.playerId)).toBeUndefined();
    expect(published.version).toBe(current.version + 1);
    // A retry of the same command changes nothing more
    const commandId = randomUUID();
    await unoPlayerCommand(seated[2].uid, "leave", {
      code,
      round: current.round,
      commandId,
    });
    await unoPlayerCommand(seated[2].uid, "leave", {
      code,
      round: current.round,
      commandId,
    });
    expect((await room(code)).version).toBe(published.version + 1);
  });

  test("the last player left in a round wins it, and it is scored once", async () => {
    const { code, seated } = await started(2);
    const current = await room(code);
    await unoPlayerCommand(seated[0].uid, "leave", {
      code,
      round: current.round,
      commandId: randomUUID(),
    });
    const finished = await room(code);
    expect(finished.stage).toBe("finished");
    expect(finished.view?.outcome).toEqual({
      type: "win",
      winner: seated[1].playerId,
    });
    expect(finished.scores[seated[1].playerId]).toBe(1);
    const result = await adminDb()
      .doc(`roomResults/${code}_${current.round}`)
      .get();
    expect(result.exists).toBe(true);
    expect((await secretState(code)).phase).toBe("finished");
  });

  test("the host can remove a player mid-round, and others can still join and leave", async () => {
    const { code, seated } = await started(3);
    const late = await joinRoom("late", { code, name: "Late" }, false, "uno");
    await host(code, "remove", { playerId: seated[0].playerId });
    const state = await secretState(code);
    expect(state.players).not.toContain(seated[0].playerId);
    expect(await hand(code, seated[0].playerId)).toBeUndefined();
    const current = await room(code);
    expect(current.players.map((p) => p.id)).toContain(late.playerId);
    await unoPlayerCommand("late", "leave", {
      code,
      round: current.round,
      commandId: randomUUID(),
    });
    expect((await room(code)).players.map((p) => p.id)).not.toContain(
      late.playerId,
    );
    // The removed player can no longer act
    await expect(
      unoPlayerCommand(seated[0].uid, "draw", {
        code,
        round: current.round,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow("no longer in this room");
  });

  test("the host can end a round early, scores stay, and the next one can start", async () => {
    const { code, seated } = await started(2);
    await host(code, "abandon");
    const abandoned = await room(code);
    expect(abandoned.stage).toBe("finished");
    expect(abandoned.view?.outcome).toEqual({ type: "abandoned" });
    expect(abandoned.scores).toEqual({});
    expect(abandoned.events).toEqual([{ type: "abandoned" }]);
    await expect(host(code, "abandon")).rejects.toThrow("no round");
    await expect(
      unoPlayerCommand(seated[0].uid, "draw", {
        code,
        round: abandoned.round,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow("no round");
    await host(code, "start");
    expect((await room(code)).stage).toBe("playing");
  });

  test("only the host can end a round", async () => {
    const { code } = await started(2);
    const current = await room(code);
    await expect(
      controlUnoRoom("player0", "abandon", {
        code,
        round: current.round,
        version: current.version,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow("do not host");
  });

  test("a won round scores, is kept for a week, and the next starts a seat later", async () => {
    const { code, seated } = await started(3);
    const state = await secretState(code);
    const winner = state.players[state.current];
    const seat = seated.find((s) => s.playerId === winner);
    if (!seat) throw new Error("Nobody is seated there.");
    // Leave the player on their last card, which matches the colour in play
    const index = state.stock.findIndex((c) => c.kind === "number");
    const [last] = state.stock.splice(index, 1);
    if (last.kind !== "number") throw new Error("Needs a number card.");
    state.hands[winner] = [last];
    state.colour = last.colour;
    await adminDb().doc(`roomPrivate/${code}`).update({ state });

    await play(code, seat.uid, last);
    const finished = await room(code);
    expect(finished.stage).toBe("finished");
    expect(finished.scores).toEqual({ [winner]: 1 });
    expect(finished.view?.outcome).toEqual({ type: "win", winner });
    const results = await adminDb()
      .collection("roomResults")
      .where("code", "==", code)
      .get();
    expect(results.size).toBe(1);
    const kept = results.docs[0].get("expiresAt") as Timestamp;
    const days = (kept.toMillis() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
    await expect(play(code, seat.uid, last)).rejects.toThrow();

    // The next round waits until every seated player has shown the result
    expect(finished.seen).toEqual([]);
    await expect(host(code, "start")).rejects.toThrow("see who won");
    for (const s of seated)
      await unoPlayerCommand(s.uid, "seen", {
        code,
        round: finished.round,
        commandId: randomUUID(),
      });
    expect((await room(code)).seen).toHaveLength(3);
    await host(code, "start");
    const next = await room(code);
    expect(next.stage).toBe("playing");
    expect(next.round).not.toBe(finished.round);
    expect(next.scores).toEqual({ [winner]: 1 });
    const second = await secretState(code);
    expect(second.players[second.current]).toBe(
      state.players[(state.current + 1) % 3],
    );
  });

  test("a won round starts again after the wait even if a device never reports", async () => {
    const { code, seated } = await started(2);
    const state = await secretState(code);
    const winner = state.players[state.current];
    const seat = seated.find((s) => s.playerId === winner);
    if (!seat) throw new Error("Nobody is seated there.");
    const index = state.stock.findIndex((c) => c.kind === "number");
    const [last] = state.stock.splice(index, 1);
    if (last.kind !== "number") throw new Error("Needs a number card.");
    state.hands[winner] = [last];
    state.colour = last.colour;
    await adminDb().doc(`roomPrivate/${code}`).update({ state });
    await play(code, seat.uid, last);
    await expect(host(code, "start")).rejects.toThrow("see who won");
    await adminDb()
      .doc(`gameRooms/${code}`)
      .update({ finishedAt: Date.now() - 16_000 });
    await host(code, "start");
    expect((await room(code)).stage).toBe("playing");
  });

  test("the next player waits a moment after the turn passes", async () => {
    const { code, seated } = await started(2);
    const { seat, plain } = await givePlainCard(code, seated);
    await play(code, seat.uid, plain);
    const after = await room(code);
    expect(after.turnReadyAt).toBeGreaterThan(Date.now());
    // Whoever is next, with nothing to play so drawing is their move, is
    // refused until the pause is over
    const { seat: next } = await noPlayableCards(code, seated);
    await expect(
      unoPlayerCommand(next.uid, "draw", {
        code,
        round: after.round,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow("Wait a moment");
    // Once the pause is over the same move goes through
    await adminDb()
      .doc(`gameRooms/${code}`)
      .update({ turnReadyAt: Date.now() - 1 });
    const before = (await secretState(code)).hands[next.playerId].length;
    await unoPlayerCommand(next.uid, "draw", {
      code,
      round: after.round,
      commandId: randomUUID(),
    });
    expect(
      (await secretState(code)).hands[next.playerId].length,
    ).toBeGreaterThan(before);
  });

  test("expired rooms go but their results stay for the week", async () => {
    const { code, seated } = await started(2);
    const state = await secretState(code);
    const winner = state.players[state.current];
    const seat = seated.find((s) => s.playerId === winner);
    if (!seat) throw new Error("Nobody is seated there.");
    const index = state.stock.findIndex((c) => c.kind === "number");
    const [last] = state.stock.splice(index, 1);
    if (last.kind !== "number") throw new Error("Needs a number card.");
    state.hands[winner] = [last];
    state.colour = last.colour;
    await adminDb().doc(`roomPrivate/${code}`).update({ state });
    await play(code, seat.uid, last);

    const past = Timestamp.fromMillis(Date.now() - 1000);
    for (const path of [
      `gameRooms/${code}`,
      `roomPrivate/${code}`,
      `roomHands/${code}_${seat.playerId}`,
    ])
      await adminDb().doc(path).update({ expiresAt: past, cleanupAt: past });
    await cleanupRooms();
    expect((await adminDb().doc(`gameRooms/${code}`).get()).exists).toBe(false);
    expect(
      (await adminDb().doc(`roomHands/${code}_${seat.playerId}`).get()).exists,
    ).toBe(false);
    expect(
      (
        await adminDb()
          .collection("roomResults")
          .where("code", "==", code)
          .get()
      ).size,
    ).toBe(1);
  });

  test("rules show each player their own hand and nobody else's", async () => {
    const { code, seated } = await started(2);
    const [first, second] = seated;
    const mine = env.authenticatedContext(first.uid).firestore();
    await assertSucceeds(getDoc(doc(mine, "gameRooms", code)));
    await assertSucceeds(
      getDoc(doc(mine, "roomHands", `${code}_${first.playerId}`)),
    );
    await assertFails(
      getDoc(doc(mine, "roomHands", `${code}_${second.playerId}`)),
    );
    await assertFails(getDoc(doc(mine, "roomPrivate", code)));
    await assertFails(
      setDoc(doc(mine, "roomHands", `${code}_${first.playerId}`), { hand: [] }),
    );
    await assertFails(setDoc(doc(mine, "gameRooms", code), { stage: "lobby" }));
    const outsider = env.authenticatedContext("outsider").firestore();
    await assertFails(getDoc(doc(outsider, "gameRooms", code)));
    await assertFails(
      getDoc(doc(outsider, "roomHands", `${code}_${first.playerId}`)),
    );
    await host(code, "end");
    await assertFails(
      getDoc(doc(mine, "roomHands", `${code}_${first.playerId}`)),
    );
  });

  test("rules let a player wait for their own hand before the deal", async () => {
    const { code, seated } = await table(2);
    const [first, second] = seated;
    const mine = env.authenticatedContext(first.uid).firestore();
    const ownHand = doc(mine, "roomHands", `${code}_${first.playerId}`);
    expect((await assertSucceeds(getDoc(ownHand))).exists()).toBe(false);
    await assertFails(
      getDoc(doc(mine, "roomHands", `${code}_${second.playerId}`)),
    );
    for (const id of [
      code,
      `${code}_${first.playerId}_x`,
      `x_${first.playerId}`,
    ])
      await assertFails(getDoc(doc(mine, "roomHands", id)));
    const outsider = env.authenticatedContext("outsider").firestore();
    await assertFails(
      getDoc(doc(outsider, "roomHands", `${code}_${first.playerId}`)),
    );

    await host(code, "start");
    expect((await assertSucceeds(getDoc(ownHand))).exists()).toBe(true);
    await host(code, "remove", { playerId: first.playerId });
    await assertFails(getDoc(ownHand));
  });

  test("guests get their own Uno identity and cookie", async () => {
    const code = await createRoom(owner, randomUUID(), "uno");
    const secret = "a".repeat(64);
    const joined = await joinGuestRoom({ code, name: "Cam" }, secret, "uno");
    const idToken = await exchange(joined.token);
    const identity = await adminAuth().verifyIdToken(idToken);
    expect(identity.uid).toMatch(/^uno-[a-f0-9]{64}$/);
    expect(identity.unoRoom).toBe(code);
    expect(identity.buzzerRoom).toBeUndefined();
    const buzzer = await createRoom(owner, randomUUID());
    const other = await joinGuestRoom({ code: buzzer, name: "Cam" }, secret);
    expect(
      (await adminAuth().verifyIdToken(await exchange(other.token))).uid,
    ).toMatch(/^buzzer-[a-f0-9]{64}$/);

    const request = (path: string, cookie?: string) =>
      new NextRequest(`https://example.test${path}`, {
        method: "POST",
        headers: {
          origin: "https://example.test",
          "Content-Type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify({ action: "join", input: { code, name: "Lou" } }),
      });
    const response = await POST(request("/api/uno"));
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(new RegExp(`^uno-guest-${code}=[a-f0-9]{64};`));
    expect(header).toContain("Path=/api/uno");
    expect(header).toContain("HttpOnly");
    const command = await POST(
      new NextRequest("https://example.test/api/uno", {
        method: "POST",
        headers: {
          origin: "https://example.test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "draw", input: { code } }),
      }),
    );
    expect(command.status).toBe(401);

    // An Uno sign-in is no use to the buzzer, even with the right code
    const crossed = await buzzerPOST(
      new NextRequest("https://example.test/api/buzzer", {
        method: "POST",
        headers: {
          origin: "https://example.test",
          authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "leave",
          input: {
            code,
            round: randomUUID(),
            version: 0,
            commandId: randomUUID(),
          },
        }),
      }),
    );
    expect(crossed.status).toBe(401);
  });
});

// Custom tokens are exchanged for ID tokens through the Auth emulator
async function exchange(customToken: string) {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "";
  const response = await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  return ((await response.json()) as { idToken: string }).idToken;
}

describe("saving a room to the Uno tracker", () => {
  // A room between rounds with some rounds already won
  async function finishedTable(players = 2, wins: number[] = [2, 1]) {
    const setup = await table(players);
    await adminDb()
      .doc(`gameRooms/${setup.code}`)
      .update({
        stage: "finished",
        scores: Object.fromEntries(
          setup.seated.map((s, i) => [s.playerId, wins[i] ?? 0]),
        ),
      });
    return setup;
  }
  async function save(code: string, camPlayerId: string, by = owner) {
    const current = await room(code);
    await saveRoomToTracker(by, {
      code,
      round: current.round,
      version: current.version,
      camPlayerId,
      playedOn: "2026-11-07",
    });
  }
  const scoreboard = async () =>
    (await adminDb().doc("uno/scoreboard").get()).data() as
      { cam: number; laura: number } | undefined;

  test("the host's two-player scores become one finished tracker game", async () => {
    const { code, seated } = await finishedTable();
    await save(code, seated[1].playerId);
    const saved = await room(code);
    const id = trackerGameId(code, saved.expiresAt);
    expect(saved.trackerGameId).toBe(id);
    expect(saved.phase).toBe("ended");
    const game = (await adminDb().doc(`unoGames/${id}`).get()).data();
    expect(game).toMatchObject({
      cam: 1,
      laura: 2,
      winner: "laura",
      status: "completed",
      source: "historic",
      playedOn: "2026-11-07",
      notes: `Played online (room ${code})`,
    });
    expect(await scoreboard()).toMatchObject({ cam: 1, laura: 2 });
  });

  test("saving the same room twice counts it once", async () => {
    const { code, seated } = await finishedTable();
    await save(code, seated[0].playerId);
    await save(code, seated[0].playerId);
    expect(await scoreboard()).toMatchObject({ cam: 2, laura: 1 });
    const games = await adminDb().collection("unoGames").get();
    expect(games.size).toBe(1);
  });

  test("only the host can save, and only between rounds with two players", async () => {
    const { code, seated } = await finishedTable();
    await expect(save(code, seated[0].playerId, "stranger")).rejects.toThrow(
      "do not host",
    );
    await adminDb().doc(`gameRooms/${code}`).update({ stage: "playing" });
    await expect(save(code, seated[0].playerId)).rejects.toThrow(
      "Finish a round",
    );

    const three = await finishedTable(3, [1, 1, 0]);
    await expect(save(three.code, three.seated[0].playerId)).rejects.toThrow(
      "two players",
    );
    const none = await finishedTable(2, [0, 0]);
    await expect(save(none.code, none.seated[0].playerId)).rejects.toThrow(
      "Nobody has won",
    );
    await expect(save(code, randomUUID())).rejects.toThrow();
    expect(await scoreboard()).toBeUndefined();
  });

  test("a stale room is refused", async () => {
    const { code, seated } = await finishedTable();
    const current = await room(code);
    await expect(
      saveRoomToTracker(owner, {
        code,
        round: current.round,
        version: current.version + 1,
        camPlayerId: seated[0].playerId,
        playedOn: "2026-11-07",
      }),
    ).rejects.toThrow("changed");
  });
});
