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
import { controlUnoRoom, unoPlayerCommand } from "@/unogame/service";
import { playableCards, type RoundState } from "@/unogame/engine/round";
import type { Card } from "@/unogame/engine/cards";
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
  action: "start" | "remove" | "end",
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

  test("drawing adds a card to the drawer's hand only", async () => {
    const { code, seated } = await started(2);
    const { seat } = await turn(code, seated);
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

  test("seated players cannot leave or be removed mid-round, others can", async () => {
    const { code, seated } = await started(2);
    const late = await joinRoom("late", { code, name: "Late" }, false, "uno");
    const current = await room(code);
    await expect(
      unoPlayerCommand(seated[0].uid, "leave", {
        code,
        round: current.round,
        commandId: randomUUID(),
      }),
    ).rejects.toThrow("round finishes");
    await expect(
      host(code, "remove", { playerId: seated[1].playerId }),
    ).rejects.toThrow("Wait for the round");
    await unoPlayerCommand("late", "leave", {
      code,
      round: current.round,
      commandId: randomUUID(),
    });
    expect((await room(code)).players.map((p) => p.id)).not.toContain(
      late.playerId,
    );
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
