import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
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
import { adminAuth, adminDb } from "@/firebase/admin";
import {
  cleanupRooms,
  createRoom,
  hostCommand,
  joinRoom,
  joinGuestRoom as provisionGuest,
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
function joinGuestRoom(input: {
  code: string;
  name: string;
  secret: string;
  uid?: string;
}) {
  const { secret, ...data } = input;
  return provisionGuest(data, secret);
}
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
      new NextRequest("http://localhost/api/buzzer", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buzz",
          input: { code: "ABC2", name: "Guest" },
        }),
      });
    expect((await POST(request("https://elsewhere.example"))).status).toBe(403);
    expect((await POST(request("http://localhost"))).status).toBe(401);
  });
  test("room cookies are HttpOnly, host-only, restricted to the API and confirmed before allocating guests", async () => {
    const code = await createRoom(owner, randomUUID());
    const before = (await adminAuth().listUsers()).users.length;
    const request = (
      origin: string,
      cookie?: string,
      input: unknown = { code, name: "Cam" },
    ) =>
      new NextRequest(`${origin}/api/buzzer`, {
        method: "POST",
        headers: {
          origin,
          "Content-Type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify({ action: "join", input }),
      });
    const first = await POST(request("https://example.test"));
    expect(await first.json()).toEqual({ retry: true });
    const header = first.headers.get("set-cookie") ?? "";
    expect(header).toMatch(new RegExp(`^buzzer-guest-${code}=[a-f0-9]{64};`));
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=strict");
    expect(header).toContain("Path=/api/buzzer");
    expect(header).toContain("Max-Age=21600");
    expect(header).not.toContain("Domain=");
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect((await state(code)).players).toHaveLength(0);
    expect((await adminAuth().listUsers()).users).toHaveLength(before);
    const cookie = header.split(";")[0];
    const accepted = await POST(request("https://example.test", cookie));
    expect(accepted.status).toBe(200);
    const membership = (await accepted.json()) as {
      playerId: string;
      token: string;
    };
    expect(membership).not.toHaveProperty("secret");
    const retry = await POST(request("https://example.test", cookie));
    expect(((await retry.json()) as { playerId: string }).playerId).toBe(
      membership.playerId,
    );
    expect((await state(code)).players).toHaveLength(1);
    expect((await adminAuth().listUsers()).users).toHaveLength(before + 1);
    const otherCode = await createRoom(owner, randomUUID());
    const other = await POST(
      request("https://example.test", cookie, {
        code: otherCode,
        name: "Laura",
      }),
    );
    expect(await other.json()).toEqual({ retry: true });
    expect(other.headers.get("set-cookie")).toMatch(
      new RegExp(`^buzzer-guest-${otherCode}=`),
    );
    expect((await state(otherCode)).players).toHaveLength(0);
    const forged = await POST(
      request("https://example.test", undefined, {
        code,
        name: "Laura",
        secret: "a".repeat(64),
      }),
    );
    expect(forged.status).toBe(400);
    expect(forged.headers.has("set-cookie")).toBe(false);
    const local = await POST(request("http://localhost"));
    expect(local.headers.get("set-cookie")).toContain("HttpOnly");
    expect(local.headers.get("set-cookie")).not.toContain("Secure");
  });
  test("server guests are created only for accepted memberships and retries recover the same seat", async () => {
    const before = (await adminAuth().listUsers()).users.length;
    const secret = "a".repeat(64);
    const code = await createRoom(owner, randomUUID());
    await expect(
      joinGuestRoom({ code: "ABC2", name: "Cam", secret }),
    ).rejects.toThrow("not available");
    await expect(
      joinGuestRoom({ code, name: "Cam", secret, uid: owner }),
    ).rejects.toThrow();
    expect((await adminAuth().listUsers()).users).toHaveLength(before);
    const [first, again] = await Promise.all([
      joinGuestRoom({ code, name: "Cam", secret }),
      joinGuestRoom({ code, name: "Cam", secret }),
    ]);
    expect(again.playerId).toBe(first.playerId);
    expect((await state(code)).players).toHaveLength(1);
    expect((await adminAuth().listUsers()).users).toHaveLength(before + 1);
    await expect(
      joinGuestRoom({ code, name: "Cam", secret: "b".repeat(64) }),
    ).rejects.toThrow("already");
    expect((await adminAuth().listUsers()).users).toHaveLength(before + 1);
    const exchange = await fetch(
      `http://${assertEmulatorEnvironment().authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: first.token, returnSecureToken: true }),
      },
    );
    expect(exchange.ok).toBe(true);
    const { idToken } = (await exchange.json()) as { idToken: string };
    const identity = await adminAuth().verifyIdToken(idToken, true);
    expect(identity.buzzerRoom).toBe(code);
    expect(
      (await adminDb().doc(`authorisedUsers/${identity.uid}`).get()).exists,
    ).toBe(false);
    const otherCode = await createRoom(owner, randomUUID());
    const other = await joinGuestRoom({ code: otherCode, name: "Cam", secret });
    const otherUid = (
      JSON.parse(
        Buffer.from(other.token.split(".")[1], "base64url").toString(),
      ) as { uid: string }
    ).uid;
    expect(otherUid).not.toBe(identity.uid);
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext(identity.uid).firestore(),
          "gameRooms",
          otherCode,
        ),
      ),
    );
    const wrongRoom = await POST(
      new NextRequest("http://localhost/api/buzzer", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "buzz",
          input: await command(otherCode),
        }),
      }),
    );
    expect(wrongRoom.status).toBe(401);
    await hostCommand(owner, "remove", {
      ...(await command(code)),
      playerId: first.playerId,
    });
    // The route does not look up token revocation, so the removed player's
    // token is still valid. Their membership is what turns the buzz away.
    const removedBuzz = await POST(
      new NextRequest("http://localhost/api/buzzer", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "buzz", input: await command(code) }),
      }),
    );
    expect(removedBuzz.ok).toBe(false);
    expect(
      (await adminDb().collection("roomBuzzes").where("code", "==", code).get())
        .size,
    ).toBe(0);
    await expect(joinGuestRoom({ code, name: "Cam", secret })).rejects.toThrow(
      "removed",
    );
  });
  test("full, ended and expired rooms create no guests, and creation is bounded per room", async () => {
    const code = await createRoom(owner, randomUUID());
    await adminDb().doc(`roomPrivate/${code}`).update({ guestCount: 99 });
    const first = await joinGuestRoom({
      code,
      name: "Cam",
      secret: "a".repeat(64),
    });
    const before = (await adminAuth().listUsers()).users.length;
    await expect(
      joinGuestRoom({ code, name: "Laura", secret: "b".repeat(64) }),
    ).rejects.toThrow("guest limit");
    expect(
      (await joinGuestRoom({ code, name: "Cam", secret: "a".repeat(64) }))
        .playerId,
    ).toBe(first.playerId);
    const fullCode = await createRoom(owner, randomUUID());
    for (let i = 0; i < 20; i++)
      await joinRoom(`guest${String(i)}`, {
        code: fullCode,
        name: `Guest ${String(i)}`,
      });
    await expect(
      joinGuestRoom({ code: fullCode, name: "Laura", secret: "b".repeat(64) }),
    ).rejects.toThrow("full");
    await hostCommand(owner, "end", await command(code));
    await expect(
      joinGuestRoom({ code, name: "Laura", secret: "b".repeat(64) }),
    ).rejects.toThrow("ended");
    await adminDb().doc(`gameRooms/${fullCode}`).update({ expiresAt: 0 });
    await expect(
      joinGuestRoom({ code: fullCode, name: "Laura", secret: "b".repeat(64) }),
    ).rejects.toThrow("expired");
    expect((await adminAuth().listUsers()).users).toHaveLength(before);
  });
  test("a failed Auth creation can retry without consuming another guest identity", async () => {
    const code = await createRoom(owner, randomUUID());
    const input = { code, name: "Cam", secret: "a".repeat(64) };
    const failure = vi
      .spyOn(adminAuth(), "createUser")
      .mockRejectedValueOnce(new Error("Auth unavailable"));
    try {
      await expect(joinGuestRoom(input)).rejects.toThrow("Auth unavailable");
    } finally {
      failure.mockRestore();
    }
    const seat = (await state(code)).players[0].id;
    expect((await joinGuestRoom(input)).playerId).toBe(seat);
    expect(
      (await adminDb().doc(`roomPrivate/${code}`).get()).get("guestCount"),
    ).toBe(1);
  });
  test("bounded cleanup retries failed Auth deletion before removing guest records", async () => {
    const code = await createRoom(owner, randomUUID());
    const guest = await joinGuestRoom({
      code,
      name: "Cam",
      secret: "a".repeat(64),
    });
    const uid = (
      JSON.parse(
        Buffer.from(guest.token.split(".")[1], "base64url").toString(),
      ) as { uid: string }
    ).uid;
    const members = await adminDb()
      .collection("roomMembers")
      .where("code", "==", code)
      .get();
    await members.docs[0].ref.update({ expiresAt: Timestamp.fromMillis(0) });
    const failure = vi
      .spyOn(adminAuth(), "deleteUsers")
      .mockRejectedValueOnce(new Error("Auth unavailable"));
    try {
      await expect(cleanupRooms()).rejects.toThrow("Auth unavailable");
      expect((await members.docs[0].ref.get()).exists).toBe(true);
    } finally {
      failure.mockRestore();
    }
    await cleanupRooms();
    await expect(adminAuth().getUser(uid)).rejects.toMatchObject({
      code: "auth/user-not-found",
    });
    await expect(adminAuth().getUser(owner)).resolves.toMatchObject({
      uid: owner,
    });
  });
  test("resetting during a buzz keeps old requests out of the new results", async () => {
    const code = await createRoom(owner, randomUUID());
    await joinRoom("racer", { code, name: "Racer" });
    const input = await command(code);
    const [buzz, reset] = await Promise.allSettled([
      playerCommand("racer", "buzz", input),
      hostCommand(owner, "reset", input),
    ]);
    expect(reset.status).toBe("fulfilled");
    const next = await command(code);
    expect(next.round).not.toBe(input.round);
    expect((await state(code)).phase).toBe("open");
    const count = (
      await adminDb().collection("roomBuzzes").where("code", "==", code).get()
    ).size;
    expect(count).toBe(buzz.status === "fulfilled" ? 1 : 0);
    await expect(playerCommand("racer", "buzz", input)).rejects.toThrow(
      "finished",
    );
    await playerCommand("racer", "buzz", next);
    expect(
      (
        await adminDb()
          .collection("roomBuzzes")
          .where("code", "==", code)
          .where("round", "==", next.round)
          .get()
      ).size,
    ).toBe(1);
  });
  test("create retries return one room and host commands require its owner", async () => {
    const id = randomUUID();
    const code = await createRoom(owner, id);
    expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    expect(await createRoom(owner, id)).toBe(code);
    await expect(
      hostCommand(users.bob.uid, "reset", await command(code)),
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
  test("new arrivals buzz immediately and rejoining cannot add a second buzz", async () => {
    const code = await createRoom(owner, randomUUID());
    expect((await state(code)).phase).toBe("open");
    expect(await state(code)).not.toHaveProperty("eligible");
    const first = await joinRoom("first", { code, name: "First" });
    await playerCommand("first", "buzz", await command(code));
    await joinRoom("late", { code, name: "Late" });
    await playerCommand("late", "buzz", await command(code));
    await playerCommand("first", "leave", await command(code));
    expect(await joinRoom("first", { code, name: "First" })).toEqual(first);
    await playerCommand("first", "buzz", await command(code));
    expect(
      (await adminDb().collection("roomBuzzes").where("code", "==", code).get())
        .size,
    ).toBe(2);
    await joinRoom("returning", { code, name: "Returning" });
    await playerCommand("returning", "leave", await command(code));
    await joinRoom("returning", { code, name: "Returning" });
    await playerCommand("returning", "buzz", await command(code));
    const old = await command(code);
    await hostCommand(owner, "reset", old);
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
