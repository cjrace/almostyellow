import { randomUUID } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
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
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import {
  cleanupRooms,
  createRoom,
  hostCommand,
  joinRoom,
  playerCommand,
} from "@/rooms/service";
import type { RoomView } from "@/buzzer/model";
import { resetAndSeed } from "./seed";
import { assertEmulatorEnvironment } from "./guard";
import { users } from "./fixtures";
import { POST } from "@/app/api/buzzer/route";
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
async function state(code: string) {
  return (await adminDb().doc(`gameRooms/${code}`).get()).data() as RoomView;
}
async function command(code: string) {
  const room = await state(code);
  return {
    code,
    round: room.round,
    version: room.version,
    commandId: randomUUID(),
  };
}
describe("Quiz rooms and concurrent players", () => {
  test("guest endpoints refuse missing credentials and cross-origin requests", async () => {
    const request = (origin: string) =>
      new Request("http://localhost/api/buzzer", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          input: { code: "ABC234", name: "Guest" },
        }),
      });
    expect((await POST(request("https://elsewhere.example"))).status).toBe(403);
    expect((await POST(request("http://localhost"))).status).toBe(401);
  });
  test("closing during a buzz preserves only accepted results", async () => {
    const code = await createRoom(owner, randomUUID());
    await joinRoom("racer", { code, name: "Racer" });
    await hostCommand(owner, "open", await command(code));
    const input = await command(code);
    const [buzz, close] = await Promise.allSettled([
      playerCommand("racer", "buzz", input),
      hostCommand(owner, "close", input),
    ]);
    expect(close.status).toBe("fulfilled");
    expect((await state(code)).phase).toBe("closed");
    const count = (
      await adminDb().collection("roomBuzzes").where("code", "==", code).get()
    ).size;
    expect(count).toBe(buzz.status === "fulfilled" ? 1 : 0);
    if (count) await playerCommand("racer", "buzz", input);
    else
      await expect(playerCommand("racer", "buzz", input)).rejects.toThrow(
        "closed",
      );
    await hostCommand(owner, "reset", await command(code));
    await expect(playerCommand("racer", "buzz", input)).rejects.toThrow(
      "finished",
    );
  });
  test("create retries return one room and host commands require its owner", async () => {
    const id = randomUUID();
    const code = await createRoom(owner, id);
    expect(await createRoom(owner, id)).toBe(code);
    await expect(
      hostCommand(users.bob.uid, "open", await command(code)),
    ).rejects.toThrow("host");
    const reset = await command(code);
    await hostCommand(owner, "reset", reset);
    const round = (await state(code)).round;
    await hostCommand(owner, "reset", reset);
    expect((await state(code)).round).toBe(round);
  });
  test("admits at most twenty players and records each simultaneous buzz once", async () => {
    const code = await createRoom(owner, randomUUID());
    const joins = await Promise.allSettled(
      Array.from({ length: 22 }, (_, i) =>
        joinRoom(`guest${String(i)}`, { code, name: `Player ${String(i)}` }),
      ),
    );
    expect(joins.filter((join) => join.status === "fulfilled")).toHaveLength(
      20,
    );
    await hostCommand(owner, "open", await command(code));
    const input = await command(code);
    const started = Date.now();
    const times = await Promise.all(
      joins.map(async (join, i) => {
        if (join.status !== "fulfilled") return null;
        await Promise.all([
          playerCommand(`guest${String(i)}`, "buzz", input),
          playerCommand(`guest${String(i)}`, "buzz", input),
        ]);
        return Date.now() - started;
      }),
    );
    const saved = await adminDb()
      .collection("roomBuzzes")
      .where("code", "==", code)
      .get();
    expect(saved.size).toBe(20);
    expect(saved.docs.every((doc) => doc.get("at") instanceof Timestamp)).toBe(
      true,
    );
    const samples = times
      .filter((time): time is number => time !== null)
      .sort((a, b) => a - b);
    mkdirSync(".codex", { recursive: true });
    writeFileSync(
      ".codex/buzzer-load.json",
      JSON.stringify({
        median: samples[9],
        p95: samples[18],
        max: samples[19],
        errors: 0,
        listenerReadsFor20Players: 400,
      }),
    );
    console.info(
      "20-player duplicate-request confirmation latency (emulator ms)",
      {
        median: samples[9],
        p95: samples[18],
        max: samples[19],
        errors: 0,
        listenerReadsFor20Players: 400,
      },
    );
  }, 60000);
  test("late joins and leave/rejoin cannot enter an open round", async () => {
    const code = await createRoom(owner, randomUUID());
    await joinRoom("first", { code, name: "First" });
    await hostCommand(owner, "open", await command(code));
    await joinRoom("late", { code, name: "Late" });
    await expect(
      playerCommand("late", "buzz", await command(code)),
    ).rejects.toThrow("next question");
    await playerCommand("first", "leave", await command(code));
    await joinRoom("first", { code, name: "First" });
    await expect(
      playerCommand("first", "buzz", await command(code)),
    ).rejects.toThrow("next question");
    const old = await command(code);
    await hostCommand(owner, "reset", old);
    await hostCommand(owner, "open", await command(code));
    await expect(playerCommand("first", "buzz", old)).rejects.toThrow(
      "finished",
    );
    await playerCommand("first", "buzz", await command(code));
  });
  test("removed players cannot rejoin and their buzz remains recorded", async () => {
    const code = await createRoom(owner, randomUUID());
    const member = await joinRoom("guest", { code, name: "Guest" });
    await expect(joinRoom("other", { code, name: " guest " })).rejects.toThrow(
      "already",
    );
    await hostCommand(owner, "open", await command(code));
    await playerCommand("guest", "buzz", await command(code));
    await hostCommand(owner, "remove", {
      ...(await command(code)),
      playerId: member.playerId,
    });
    await expect(joinRoom("guest", { code, name: "Guest" })).rejects.toThrow(
      "removed",
    );
    expect(
      (await adminDb().collection("roomBuzzes").where("code", "==", code).get())
        .size,
    ).toBe(1);
  });
  test("rules isolate rooms and deny writes, old rounds and ended results", async () => {
    const code = await createRoom(owner, randomUUID());
    await joinRoom("guest", { code, name: "Guest" });
    const guest = env.authenticatedContext("guest").firestore();
    const outsider = env.authenticatedContext("outsider").firestore();
    await assertSucceeds(getDoc(doc(guest, "gameRooms", code)));
    await assertFails(getDoc(doc(outsider, "gameRooms", code)));
    await assertFails(setDoc(doc(guest, "gameRooms", code), { phase: "open" }));
    await hostCommand(owner, "open", await command(code));
    const old = await command(code);
    await playerCommand("guest", "buzz", old);
    const results = () =>
      getDocs(
        query(
          collection(guest, "roomBuzzes"),
          where("code", "==", code),
          where("round", "==", old.round),
        ),
      );
    await assertSucceeds(results());
    await hostCommand(owner, "reset", await command(code));
    await assertFails(results());
    await hostCommand(owner, "end", await command(code));
    await expect(joinRoom("new", { code, name: "New" })).rejects.toThrow(
      "ended",
    );
  });
  test("expiry denies access before bounded cleanup deletes records", async () => {
    const code = await createRoom(owner, randomUUID());
    await joinRoom("guest", { code, name: "Guest" });
    await adminDb()
      .doc(`gameRooms/${code}`)
      .update({
        expiresAt: Date.now() - 1000,
        cleanupAt: Timestamp.fromMillis(0),
      });
    await expect(joinRoom("other", { code, name: "Other" })).rejects.toThrow(
      "expired",
    );
    await assertFails(
      getDoc(
        doc(env.authenticatedContext("guest").firestore(), "gameRooms", code),
      ),
    );
    const batch = adminDb().batch();
    for (let i = 0; i < 105; i++)
      batch.set(adminDb().doc(`roomLimits/expired${String(i)}`), {
        expiresAt: Timestamp.fromMillis(0),
      });
    await batch.commit();
    await cleanupRooms();
    expect(
      (
        await adminDb()
          .collection("roomLimits")
          .where("expiresAt", "<=", Timestamp.now())
          .get()
      ).size,
    ).toBe(5);
    expect((await adminDb().doc(`gameRooms/${code}`).get()).exists).toBe(false);
  });
});
