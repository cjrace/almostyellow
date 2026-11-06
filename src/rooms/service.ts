import "server-only";
import { randomInt, randomUUID, createHash } from "node:crypto";
import {
  FieldValue,
  Timestamp,
  type Transaction,
} from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb } from "@/firebase/admin";
import { RoomError, type RoomView } from "@/buzzer/model";

function transaction<T>(operation: (tx: Transaction) => Promise<T>) {
  return adminDb().runTransaction(operation, { maxAttempts: 30 });
}

const id = z.uuid();
const codeSchema = z.string().regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
export const joinInputSchema = z
  .object({ code: codeSchema, name: z.string().trim().min(1).max(30) })
  .strict();
export const commandSchema = z.object({
  code: codeSchema,
  commandId: id,
  round: id,
  version: z.number().int().nonnegative(),
});
interface Member {
  playerId: string;
  expiresAt: Timestamp;
  status: "active" | "left" | "removed";
}
interface PrivateRoom {
  owner: string;
  expiresAt: Timestamp;
}
const collections = [
  "gameRooms",
  "roomPrivate",
  "roomMembers",
  "roomBuzzes",
  "roomCommands",
  "roomLimits",
];
const key = (value: string) => createHash("sha256").update(value).digest("hex");
const memberRef = (code: string, uid: string) =>
  adminDb().doc(`roomMembers/${code}_${uid}`);
export function membershipId(code: string, uid: string) {
  return `${code}_${uid}`;
}
function fail(code: string, message: string): never {
  throw new RoomError(code, message);
}
function live(room: RoomView) {
  if (room.expiresAt <= Date.now()) fail("expired", "This room has expired.");
  if (room.phase === "ended") fail("ended", "This room has ended.");
}
export async function cleanupRooms() {
  for (const collection of collections) {
    const expired = await adminDb()
      .collection(collection)
      .where(
        collection === "gameRooms" ? "cleanupAt" : "expiresAt",
        "<=",
        Timestamp.now(),
      )
      .limit(100)
      .get();
    if (expired.empty) continue;
    if (collection === "roomMembers") {
      const uids = expired.docs
        .map((doc) => doc.get("guestUid") as string | undefined)
        .filter((uid): uid is string => !!uid?.startsWith("buzzer-"));
      if (uids.length) {
        const result = await adminAuth().deleteUsers(uids);
        if (result.failureCount)
          throw new Error("Could not delete expired guests.");
      }
    }
    const batch = adminDb().batch();
    expired.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
export async function createRoom(owner: string, commandId: string) {
  id.parse(commandId);
  await cleanupRooms().catch(() => {
    console.error("Buzzer cleanup failed.");
  });
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from(
      { length: 6 },
      () => alphabet[randomInt(alphabet.length)],
    ).join("");
    const result = await transaction(async (tx) => {
      const receiptRef = adminDb().doc(
        `roomCommands/${key(`${owner}:${commandId}`)}`,
      );
      const receipt = await tx.get(receiptRef);
      if (receipt.exists) return receipt.get("code") as string;
      const roomRef = adminDb().doc(`gameRooms/${code}`);
      if (
        (await tx.get(roomRef)).exists ||
        (await tx.get(adminDb().doc(`roomPrivate/${code}`))).exists
      )
        return null;
      const expiresAt = Date.now() + 6 * 60 * 60 * 1000;
      const expiry = Timestamp.fromMillis(expiresAt);
      tx.create(roomRef, {
        code,
        round: randomUUID(),
        version: 0,
        phase: "ready",
        expiresAt,
        players: [],
        eligible: [],
        cleanupAt: expiry,
      });
      tx.create(adminDb().doc(`roomPrivate/${code}`), {
        owner,
        expiresAt: expiry,
      });
      tx.create(receiptRef, { code, expiresAt: expiry });
      return code;
    });
    if (result) return result;
  }
  return fail("unavailable", "Could not create a room. Try again.");
}
export async function joinRoom(
  uid: string,
  input: unknown,
  serverGuest = false,
) {
  const { code, name } = z
    .object({ code: codeSchema, name: z.string().trim().min(1).max(30) })
    .parse(input);
  // Count invalid codes as attempts too; all instances share this limit.
  await transaction(async (tx) => {
    const ref = adminDb().doc(`roomLimits/${key(uid)}`);
    const limit = await tx.get(ref);
    const now = Date.now();
    const fresh =
      !limit.exists || (limit.get("start") as number) + 60000 <= now;
    const count = fresh ? 0 : (limit.get("count") as number);
    if (count >= 20)
      fail("rate_limited", "Too many join attempts. Wait a minute.");
    tx.set(ref, {
      start: fresh ? now : (limit.get("start") as number),
      count: count + 1,
      expiresAt: Timestamp.fromMillis(now + 60000),
    });
  });
  return transaction(async (tx) => {
    const roomRef = adminDb().doc(`gameRooms/${code}`);
    const [snapshot, membership] = await Promise.all([
      tx.get(roomRef),
      tx.get(memberRef(code, uid)),
    ]);
    if (!snapshot.exists) fail("invalid", "This room code is not available.");
    const room = snapshot.data() as RoomView;
    live(room);
    const storedMember = membership.data() as Member | undefined;
    const member =
      storedMember?.expiresAt.toMillis() === room.expiresAt
        ? storedMember
        : undefined;
    if (member?.status === "removed")
      fail("removed", "You have been removed from this room.");
    if (member?.status === "active") return { playerId: member.playerId };
    if (room.players.length >= 20) fail("full", "This room is full.");
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      fail("name_taken", "Someone is already using that name.");
    if (serverGuest && !member) {
      const privateRef = adminDb().doc(`roomPrivate/${code}`);
      const privateRoom = await tx.get(privateRef);
      const count = (privateRoom.get("guestCount") as number | undefined) ?? 0;
      if (count >= 100)
        fail(
          "rate_limited",
          "This room has reached its guest limit. Ask the host to create another room.",
        );
      tx.update(privateRef, { guestCount: count + 1 });
    }
    const playerId = member?.playerId ?? randomUUID();
    tx.set(memberRef(code, uid), {
      playerId,
      status: "active",
      code,
      expiresAt: Timestamp.fromMillis(room.expiresAt),
      ...(serverGuest ? { guestUid: uid } : {}),
    });
    // Rejoining retains the seat identifier but never restores open-round eligibility.
    tx.update(roomRef, { players: [...room.players, { id: playerId, name }] });
    return { playerId };
  });
}
export async function joinGuestRoom(input: unknown, secret: string) {
  const data = joinInputSchema.parse(input);
  z.string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(secret);
  // Store only a room-specific hash. The prefix retires local-storage keys
  // from the previous flow, even if someone copies one into a cookie.
  const uid = `buzzer-${key(`cookie:${data.code}:${secret}`)}`;
  const membership = await joinRoom(uid, data, true);
  // Membership must succeed before any Auth record is created. A retry uses
  // the same UID if either the response or the token exchange was lost.
  try {
    await adminAuth().createUser({ uid });
  } catch (error) {
    if (!(
      error instanceof Error &&
      "code" in error &&
      error.code === "auth/uid-already-exists"
    ))
      throw error;
  }
  return {
    ...membership,
    token: await adminAuth().createCustomToken(uid, { buzzerRoom: data.code }),
  };
}
export async function hostCommand(
  owner: string,
  action: "open" | "close" | "reset" | "remove" | "end",
  input: unknown,
) {
  const data = commandSchema.extend({ playerId: id.optional() }).parse(input);
  return transaction(async (tx) => {
    const roomRef = adminDb().doc(`gameRooms/${data.code}`);
    const receiptRef = adminDb().doc(
      `roomCommands/${key(`${owner}:${data.commandId}`)}`,
    );
    const [privateDoc, snapshot, receipt] = await Promise.all([
      tx.get(adminDb().doc(`roomPrivate/${data.code}`)),
      tx.get(roomRef),
      tx.get(receiptRef),
    ]);
    if (
      !privateDoc.exists ||
      (privateDoc.data() as PrivateRoom).owner !== owner
    )
      fail("forbidden", "You do not host this room.");
    if (receipt.exists) return;
    const room = snapshot.data() as RoomView;
    live(room);
    if (room.round !== data.round || room.version !== data.version)
      fail("stale", "The room changed. Review it and try again.");
    const next: Partial<RoomView> = { version: room.version + 1 };
    if (action === "open") {
      if (room.phase !== "ready")
        fail("closed", "Reset before opening another round.");
      next.phase = "open";
      next.eligible = room.players.map((p) => p.id);
    } else if (action === "close") {
      if (room.phase !== "open") fail("closed", "Buzzing is not open.");
      next.phase = "closed";
    } else if (action === "reset") {
      next.phase = "ready";
      next.round = randomUUID();
      next.eligible = [];
    } else if (action === "end") next.phase = "ended";
    else {
      if (!data.playerId) fail("invalid", "Choose a player.");
      const members = await tx.get(
        adminDb()
          .collection("roomMembers")
          .where("code", "==", data.code)
          .where("playerId", "==", data.playerId),
      );
      members.docs.forEach((doc) => tx.update(doc.ref, { status: "removed" }));
      next.players = room.players.filter((p) => p.id !== data.playerId);
      next.eligible = room.eligible.filter((p) => p !== data.playerId);
    }
    tx.update(roomRef, next);
    tx.create(receiptRef, {
      code: data.code,
      expiresAt: Timestamp.fromMillis(room.expiresAt),
    });
  });
}
export async function playerCommand(
  uid: string,
  action: "leave" | "buzz",
  input: unknown,
) {
  const data = commandSchema.parse(input);
  return transaction(async (tx) => {
    const roomRef = adminDb().doc(`gameRooms/${data.code}`);
    const membershipRef = memberRef(data.code, uid);
    const receiptRef = adminDb().doc(
      `roomCommands/${key(`${uid}:${data.commandId}:leave`)}`,
    );
    if (action === "leave" && (await tx.get(receiptRef)).exists) return;
    const [snapshot, membership] = await Promise.all([
      tx.get(roomRef),
      tx.get(membershipRef),
    ]);
    if (!snapshot.exists) fail("invalid", "This room is not available.");
    const room = snapshot.data() as RoomView;
    live(room);
    const member = membership.data() as Member | undefined;
    if (member?.status !== "active")
      fail("removed", "You are no longer in this room.");
    if (data.round !== room.round) fail("stale", "This question has finished.");
    if (action === "leave") {
      tx.create(receiptRef, {
        code: data.code,
        expiresAt: Timestamp.fromMillis(room.expiresAt),
      });
      tx.update(membershipRef, { status: "left" });
      tx.update(roomRef, {
        players: room.players.filter((p) => p.id !== member.playerId),
        eligible: room.eligible.filter((p) => p !== member.playerId),
      });
      return;
    }
    const buzzRef = adminDb().doc(
      `roomBuzzes/${data.code}_${data.round}_${member.playerId}`,
    );
    if ((await tx.get(buzzRef)).exists) return;
    if (room.phase !== "open") fail("closed", "Buzzing is closed.");
    if (!room.eligible.includes(member.playerId))
      fail("waiting", "Wait for the next question.");
    const player = room.players.find((p) => p.id === member.playerId);
    if (!player) fail("removed", "You are no longer in this room.");
    tx.create(buzzRef, {
      code: data.code,
      round: room.round,
      playerId: member.playerId,
      name: player.name,
      at: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(room.expiresAt),
    });
  });
}
