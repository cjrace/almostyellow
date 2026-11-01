import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { adminDb } from "@/firebase/admin";
import { statistics, type ScoreEvent } from "@/uno/model";
import { resetAndSeed } from "./seed";
import { users } from "./fixtures";

const { requireAuth } = vi.hoisted(() => ({ requireAuth: vi.fn() }));
vi.mock("@/auth", () => ({ requireAuth }));
const {
  startUnoGame,
  openUnoScoring,
  syncUnoEvents,
  finishUnoGame,
  readUnoState,
  readUnoVersion,
  readUnoHistory,
  addHistoricUnoGame,
} = await import("@/services/uno");
beforeEach(async () => {
  requireAuth.mockResolvedValue({ uid: users.alice.uid });
  await resetAndSeed();
});
async function setup() {
  const state = await startUnoGame();
  const gameId = state.board.activeGameId ?? "";
  const lease = await openUnoScoring(gameId);
  const event = (changes: Partial<ScoreEvent> = {}): ScoreEvent => ({
    id: randomUUID(),
    gameId,
    leaseId: lease.id,
    player: "cam",
    delta: 1,
    createdAt: Date.now(),
    accountId: users.alice.uid,
    ...changes,
  });
  return { gameId, event };
}

describe("Uno scoring transactions", () => {
  test("starts only one active game under concurrent requests", async () => {
    await Promise.all([startUnoGame(), startUnoGame(), startUnoGame()]);
    const state = await readUnoState();
    expect(state.games).toHaveLength(1);
    expect(state.games[0].id).toBe(state.board.activeGameId);
  });
  test("applies awards and corrections exactly once, including retries", async () => {
    const { gameId, event } = await setup();
    const events = [
      event(),
      event(),
      event({ delta: -1 }),
      event({ player: "laura" }),
    ];
    const first = await syncUnoEvents(events);
    const retry = await syncUnoEvents(events);
    expect(first.accepted).toHaveLength(4);
    expect(retry.accepted).toHaveLength(4);
    expect(retry.state.board).toMatchObject({ cam: 1, laura: 1 });
    expect(retry.state.games[0]).toMatchObject({
      cam: 1,
      laura: 1,
      rounds: 2,
      winner: "draw",
    });
    const history = await readUnoHistory(gameId);
    expect(history).toHaveLength(4);
    expect(history[0]).not.toHaveProperty("accountId");
    expect(history[0]).not.toHaveProperty("leaseId");
  });
  test("preserves concurrent points from separate authorised accounts", async () => {
    const { gameId, event } = await setup();
    const aliceEvents = Array.from({ length: 5 }, () => event());
    await syncUnoEvents(aliceEvents);
    requireAuth.mockResolvedValue({ uid: users.bob.uid });
    const bobLease = await openUnoScoring(gameId);
    const bobEvents = Array.from({ length: 4 }, () =>
      event({
        accountId: users.bob.uid,
        leaseId: bobLease.id,
        player: "laura",
      }),
    );
    const saved = await syncUnoEvents(bobEvents);
    expect(saved.state.board).toMatchObject({ cam: 5, laura: 4 });
  });
  test("rejects another account, invalid input and an event ID reused with different data", async () => {
    const { event } = await setup();
    const original = event();
    await syncUnoEvents([original]);
    expect(
      (await syncUnoEvents([{ ...original, player: "laura" }])).rejected,
    ).toHaveLength(1);
    requireAuth.mockResolvedValue({ uid: users.bob.uid });
    expect((await syncUnoEvents([event()])).rejected).toHaveLength(1);
    await expect(syncUnoEvents([event({ delta: 5 as 1 })])).rejects.toThrow();
    await expect(
      syncUnoEvents([event({ gameId: "../outside" })]),
    ).rejects.toThrow();
    expect((await readUnoState()).board.cam).toBe(1);
  });
  test("retains a negative correction for explicit resolution and stops its ordered batch", async () => {
    const { event } = await setup();
    const saved = await syncUnoEvents([event({ delta: -1 }), event()]);
    expect(saved.rejected).toHaveLength(1);
    expect(saved.accepted).toEqual([]);
    expect(saved.state.board.cam).toBe(0);
  });
  test("refreshes stale finish confirmations and preserves totals on duplicate completion", async () => {
    const { gameId, event } = await setup();
    const before = await readUnoState();
    await syncUnoEvents([event()]);
    expect(
      (await finishUnoGame(gameId, before.games[0].version)).finished,
    ).toBe(false);
    const current = await readUnoState();
    expect(
      (await finishUnoGame(gameId, current.games[0].version)).finished,
    ).toBe(true);
    const duplicate = await finishUnoGame(gameId, current.games[0].version);
    expect(duplicate.state.board).toMatchObject({ cam: 1, activeGameId: null });
  });
  test("replays an existing device lease onto its completed original game and amends statistics", async () => {
    const { gameId, event } = await setup();
    await syncUnoEvents([event({ player: "laura" })]);
    let state = await readUnoState();
    await finishUnoGame(gameId, state.games[0].version);
    await expect(openUnoScoring(gameId)).rejects.toThrow("finished");
    await startUnoGame();
    const saved = await syncUnoEvents([event(), event()]);
    state = saved.state;
    expect(state.board).toMatchObject({ cam: 2, laura: 1 });
    expect(state.games.find((g) => g.id === gameId)).toMatchObject({
      status: "completed",
      cam: 2,
      laura: 1,
      winner: "cam",
      amended: true,
    });
    expect(
      state.games.find((g) => g.id === state.board.activeGameId),
    ).toMatchObject({ cam: 0, laura: 0 });
    expect(statistics(state).wins).toEqual({ cam: 1, laura: 0 });
    expect(
      (await syncUnoEvents([event({ leaseId: randomUUID() })])).rejected,
    ).toHaveLength(1);
  });
  test("stops accepting late rounds 7 days after a game finishes and deletes its leases", async () => {
    const { gameId, event } = await setup();
    const state = await readUnoState();
    await finishUnoGame(gameId, state.games[0].version);
    const leases = adminDb().collection("unoLeases");
    const [lease] = (await leases.get()).docs;
    expect(lease.get("expiresAt")).toBeGreaterThan(Date.now());
    // Move the finish and expiry back past the 7 day grace period
    const eightDays = 8 * 24 * 60 * 60 * 1000;
    await adminDb()
      .doc(`unoGames/${gameId}`)
      .update({ finishedAt: Date.now() - eightDays });
    await lease.ref.update({ expiresAt: Date.now() - 1000 });
    const late = await syncUnoEvents([event()]);
    expect(late.rejected[0].message).toContain("7 days");
    // The next game to finish clears the expired lease
    const next = await startUnoGame();
    const nextGame = next.games.find((g) => g.id === next.board.activeGameId);
    await finishUnoGame(next.board.activeGameId ?? "", nextGame?.version ?? 0);
    expect((await leases.get()).empty).toBe(true);
  });
  test("reads only the scoreboard version", async () => {
    expect(await readUnoVersion()).toBe(0);
    await startUnoGame();
    expect(await readUnoVersion()).toBe((await readUnoState()).board.version);
  });
  test("stores historic scores, dates and notes once", async () => {
    const entry = {
      id: randomUUID(),
      cam: 12,
      laura: 9,
      playedOn: "2021-07-15",
      notes: "Summer holiday",
    };
    await addHistoricUnoGame(entry);
    await addHistoricUnoGame(entry);
    const second = { ...entry, id: randomUUID(), playedOn: "2022-01-02" };
    await addHistoricUnoGame(second);
    await addHistoricUnoGame(second);
    const state = await readUnoState();
    expect(state.board).toMatchObject({ cam: 24, laura: 18 });
    expect(state.games).toHaveLength(2);
    expect(state.games.find((g) => g.id === entry.id)).toMatchObject({
      playedOn: "2021-07-15",
      notes: "Summer holiday",
      source: "historic",
    });
    await expect(addHistoricUnoGame({ ...entry, cam: 30 })).rejects.toThrow();
    expect((await adminDb().doc(`unoGames/${entry.id}`).get()).get("cam")).toBe(
      12,
    );
  });
});
