import "server-only";
import { randomUUID } from "node:crypto";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/firebase/admin";
import { historicGameEntry } from "@/uno/historic";
import { HistoricGameSchema, type Board } from "@/uno/model";
import { gameOf, RoomError, type RoomView } from "@/buzzer/model";
import {
  fail,
  key,
  live,
  memberRef,
  transaction,
  commandSchema,
  type Member,
} from "@/rooms/service";
import { colours } from "./engine/cards";
import {
  abandonRound,
  applyCommand,
  removePlayer,
  MAX_PLAYERS,
  MIN_PLAYERS,
  nextStartingIndex,
  startRound,
  type Command,
  type Result,
  type RoundState,
} from "./engine/round";
import { privateView, publicEvent, publicView } from "./engine/views";
import { RESULT_RETENTION_MS, type UnoHand, type UnoRoom } from "./room";
import { secureShuffle } from "./shuffle";
import { trackerGameId, trackerNotes } from "./tracker";

// All of the game's rules are in the engine. This file decides who may ask
// for what, runs the engine inside a transaction, and publishes the results:
// the public view for the room, and each player's own hand for them alone.

interface PrivateUno {
  owner: string;
  expiresAt: Timestamp;
  state?: RoundState | null;
  // Who sits where in the current round, to publish each hand to its owner
  seatUids?: Record<string, string>;
  starter?: string | null;
}

export const unoPlayerActions = [
  "leave",
  "play",
  "draw",
  "keep",
  "catch",
  "sayUno",
] as const;
type UnoPlayerAction = (typeof unoPlayerActions)[number];

// Only a catch has to name the version of the table it was made against.
// Everything else is checked by the engine against the real state.
const playerSchema = commandSchema.extend({
  version: z.number().int().nonnegative().optional(),
});
const playSchema = playerSchema.extend({
  cardId: z.number().int().min(0).max(107),
  colour: z.enum(colours).optional(),
  declareUno: z.boolean().optional(),
});

const handRef = (code: string, playerId: string) =>
  adminDb().doc(`roomHands/${code}_${playerId}`);
const expiryOf = (room: RoomView) => Timestamp.fromMillis(room.expiresAt);
function unoRoom(data: FirebaseFirestore.DocumentData | undefined): UnoRoom {
  if (!data) return fail("invalid", "This room is not available.");
  const room = data as UnoRoom;
  if (gameOf(room) !== "uno") fail("invalid", "This is not an Uno room.");
  return room;
}

function handDocument(
  room: UnoRoom,
  state: RoundState,
  playerId: string,
  uid: string,
): UnoHand {
  return {
    code: room.code,
    playerId,
    uid,
    round: room.round,
    expiresAt: room.expiresAt,
    ...privateView(state, playerId),
  };
}

// Publishes what an engine result changed: the room's public view, the hands
// that differ, and a result record once the round is over. The caller has done
// all of its reads, since a transaction may not read after it writes.
function commitRound(
  tx: FirebaseFirestore.Transaction,
  room: UnoRoom,
  secret: PrivateUno,
  previous: RoundState,
  result: Extract<Result, { ok: true }>,
  changes: Partial<UnoRoom> = {},
) {
  const next = result.state;
  const finished = next.phase === "finished";
  const scores = { ...room.scores };
  if (next.outcome?.type === "win")
    scores[next.outcome.winner] = (scores[next.outcome.winner] ?? 0) + 1;
  tx.update(adminDb().doc(`gameRooms/${room.code}`), {
    ...changes,
    version: room.version + 1,
    stage: finished ? "finished" : "playing",
    scores,
    view: publicView(next),
    events: result.events.map(publicEvent),
  });
  tx.update(adminDb().doc(`roomPrivate/${room.code}`), { state: next });
  const uids = secret.seatUids ?? {};
  // Only rewrite the hands that changed, including whose turn it is
  for (const id of next.players) {
    const view = privateView(next, id);
    if (
      JSON.stringify(privateView(previous, id)) !== JSON.stringify(view) &&
      uids[id]
    )
      tx.set(handRef(room.code, id), handDocument(room, next, id, uids[id]));
  }
  // Someone who has left no longer has a hand to publish
  for (const id of previous.players)
    if (!next.players.includes(id)) tx.delete(handRef(room.code, id));
  if (finished)
    tx.create(adminDb().doc(`roomResults/${room.code}_${room.round}`), {
      code: room.code,
      game: "uno",
      round: room.round,
      outcome: next.outcome,
      seats: room.seats,
      names: room.names,
      scores,
      finishedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + RESULT_RETENTION_MS),
    });
}

const takePlayerOut = (state: RoundState, playerId: string) =>
  removePlayer(state, playerId, { now: Date.now(), shuffle: secureShuffle });

function engineResult(result: Result): Extract<Result, { ok: true }> {
  if (!result.ok) throw new RoomError(result.error.code, result.error.message);
  return result;
}

export async function startUnoRound(
  owner: string,
  input: unknown,
): Promise<void> {
  const data = commandSchema.parse(input);
  await transaction(async (tx) => {
    const roomRef = adminDb().doc(`gameRooms/${data.code}`);
    const privateRef = adminDb().doc(`roomPrivate/${data.code}`);
    const receiptRef = adminDb().doc(
      `roomCommands/${key(`${owner}:${data.commandId}`)}`,
    );
    const [snapshot, privateDoc, receipt, members] = await Promise.all([
      tx.get(roomRef),
      tx.get(privateRef),
      tx.get(receiptRef),
      tx.get(
        adminDb()
          .collection("roomMembers")
          .where("code", "==", data.code)
          .where("status", "==", "active"),
      ),
    ]);
    const secret = privateDoc.data() as PrivateUno | undefined;
    if (secret?.owner !== owner)
      fail("forbidden", "You do not host this room.");
    if (receipt.exists) return;
    const room = unoRoom(snapshot.data());
    live(room);
    if (room.round !== data.round || room.version !== data.version)
      fail("stale", "The room changed. Review it and try again.");
    if (room.stage === "playing")
      fail("in_round", "A round is already being played.");
    if (room.players.length < MIN_PLAYERS)
      fail("too_few", `A round needs at least ${String(MIN_PLAYERS)} players.`);
    if (room.players.length > MAX_PLAYERS)
      fail("full", `A round has at most ${String(MAX_PLAYERS)} players.`);

    const uids: Record<string, string> = {};
    for (const doc of members.docs) {
      const member = doc.data() as Member;
      if (member.uid) uids[member.playerId] = member.uid;
    }
    const seats = room.players.map((p) => p.id);
    if (seats.some((id) => !uids[id]))
      fail("unavailable", "A player needs to reconnect. Try again.");

    const state = startRound({
      players: seats,
      startingIndex: nextStartingIndex(seats, secret.starter ?? null),
      shuffle: secureShuffle,
    });
    const next: UnoRoom = {
      ...room,
      round: randomUUID(),
      version: room.version + 1,
      stage: "playing",
      seats,
      names: Object.fromEntries(room.players.map((p) => [p.id, p.name])),
      view: publicView(state),
      events: [],
    };
    tx.set(roomRef, next);
    tx.update(privateRef, {
      state,
      seatUids: uids,
      starter: seats[state.current],
    });
    for (const id of seats)
      tx.set(handRef(room.code, id), handDocument(next, state, id, uids[id]));
    tx.create(receiptRef, { code: room.code, expiresAt: expiryOf(room) });
  });
}

export async function controlUnoRoom(
  owner: string,
  action: "start" | "remove" | "end" | "abandon",
  input: unknown,
): Promise<void> {
  if (action === "start") return startUnoRound(owner, input);
  const data = commandSchema
    .extend({ playerId: z.uuid().optional() })
    .parse(input);
  await transaction(async (tx) => {
    const roomRef = adminDb().doc(`gameRooms/${data.code}`);
    const receiptRef = adminDb().doc(
      `roomCommands/${key(`${owner}:${data.commandId}`)}`,
    );
    const [privateDoc, snapshot, receipt] = await Promise.all([
      tx.get(adminDb().doc(`roomPrivate/${data.code}`)),
      tx.get(roomRef),
      tx.get(receiptRef),
    ]);
    if (!privateDoc.exists || (privateDoc.data() as PrivateUno).owner !== owner)
      fail("forbidden", "You do not host this room.");
    if (receipt.exists) return;
    const room = unoRoom(snapshot.data());
    live(room);
    if (room.round !== data.round || room.version !== data.version)
      fail("stale", "The room changed. Review it and try again.");
    const secret = privateDoc.data() as PrivateUno;
    const state = secret.state;
    const inRound = room.stage === "playing" ? state : undefined;
    if (action === "abandon") {
      if (!inRound)
        return fail("not_playing", "There is no round being played.");
      commitRound(
        tx,
        room,
        secret,
        inRound,
        engineResult(abandonRound(inRound)),
      );
      tx.create(receiptRef, { code: data.code, expiresAt: expiryOf(room) });
      return;
    }
    const next: Partial<UnoRoom> = { version: room.version + 1 };
    if (action === "end") next.phase = "ended";
    else {
      if (!data.playerId) fail("invalid", "Choose a player.");
      const playerId = data.playerId;
      const members = await tx.get(
        adminDb()
          .collection("roomMembers")
          .where("code", "==", data.code)
          .where("playerId", "==", data.playerId),
      );
      members.docs.forEach((doc) => tx.update(doc.ref, { status: "removed" }));
      next.players = room.players.filter((p) => p.id !== playerId);
      // A player in the round takes their cards back out of play
      if (inRound?.players.includes(playerId)) {
        commitRound(
          tx,
          room,
          secret,
          inRound,
          engineResult(takePlayerOut(inRound, playerId)),
          { players: next.players },
        );
        tx.create(receiptRef, { code: data.code, expiresAt: expiryOf(room) });
        return;
      }
    }
    tx.update(roomRef, next);
    tx.create(receiptRef, { code: data.code, expiresAt: expiryOf(room) });
  });
}

function toCommand(
  action: Exclude<UnoPlayerAction, "leave">,
  player: string,
  input: unknown,
): Command {
  switch (action) {
    case "play": {
      const data = playSchema.parse(input);
      return {
        type: "play",
        player,
        cardId: data.cardId,
        ...(data.colour ? { colour: data.colour } : {}),
        ...(data.declareUno ? { declareUno: true } : {}),
      };
    }
    case "draw":
      return { type: "draw", player };
    case "keep":
      return { type: "keep", player };
    case "catch":
      return { type: "catchUno", player };
    case "sayUno":
      return { type: "sayUno", player };
  }
}

export async function unoPlayerCommand(
  uid: string,
  action: UnoPlayerAction,
  input: unknown,
): Promise<void> {
  const data = (action === "play" ? playSchema : playerSchema).parse(input);
  // Catching names no one, so it must say which table it was made against
  if (action === "catch" && data.version === undefined)
    throw new z.ZodError([]);
  await transaction(async (tx) => {
    const roomRef = adminDb().doc(`gameRooms/${data.code}`);
    const privateRef = adminDb().doc(`roomPrivate/${data.code}`);
    const receiptRef = adminDb().doc(
      `roomCommands/${key(`${uid}:${data.commandId}`)}`,
    );
    const [snapshot, membership, receipt, privateDoc] = await Promise.all([
      tx.get(roomRef),
      tx.get(memberRef(data.code, uid)),
      tx.get(receiptRef),
      tx.get(privateRef),
    ]);
    // A retry of a command that already went through changes nothing
    if (receipt.exists) return;
    const room = unoRoom(snapshot.data());
    live(room);
    const member = membership.data() as Member | undefined;
    if (member?.status !== "active")
      fail("removed", "You are no longer in this room.");
    if (action === "leave") {
      const secret = privateDoc.data() as PrivateUno | undefined;
      const state = secret?.state;
      const players = room.players.filter((p) => p.id !== member.playerId);
      tx.update(memberRef(data.code, uid), { status: "left" });
      if (
        secret &&
        state?.phase === "playing" &&
        state.players.includes(member.playerId)
      )
        commitRound(
          tx,
          room,
          secret,
          state,
          engineResult(takePlayerOut(state, member.playerId)),
          { players },
        );
      else tx.update(roomRef, { players });
      tx.create(receiptRef, { code: data.code, expiresAt: expiryOf(room) });
      return;
    }
    if (room.stage !== "playing")
      fail("not_playing", "There is no round being played.");
    if (data.round !== room.round) fail("stale", "That round has finished.");
    if (action === "catch" && data.version !== room.version)
      fail("stale", "The table changed. Check it and try again.");
    const secret = privateDoc.data() as PrivateUno | undefined;
    const state = secret?.state;
    if (!secret || !state)
      return fail("unavailable", "The round is not ready.");

    const result = applyCommand(
      state,
      toCommand(action, member.playerId, input),
      { now: Date.now(), shuffle: secureShuffle },
    );
    if (!result.ok)
      throw new RoomError(result.error.code, result.error.message);

    commitRound(tx, room, secret, state, result);
    tx.create(receiptRef, { code: data.code, expiresAt: expiryOf(room) });
  });
}

const trackerSchema = commandSchema.extend({
  // Which of the two players is Cam; the other is Laura
  camPlayerId: z.uuid(),
  playedOn: HistoricGameSchema.shape.playedOn,
});

/**
 * Saves the room's scores to the Uno tracker as one finished game. It only
 * works for the host, between rounds, with exactly two players, and a room
 * can be saved once: its game id comes from the room, so a repeat changes
 * nothing.
 */
export async function saveRoomToTracker(
  owner: string,
  input: unknown,
): Promise<void> {
  const data = trackerSchema.parse(input);
  await transaction(async (tx) => {
    const roomRef = adminDb().doc(`gameRooms/${data.code}`);
    const [privateDoc, snapshot] = await Promise.all([
      tx.get(adminDb().doc(`roomPrivate/${data.code}`)),
      tx.get(roomRef),
    ]);
    if (!privateDoc.exists || (privateDoc.data() as PrivateUno).owner !== owner)
      fail("forbidden", "You do not host this room.");
    const room = unoRoom(snapshot.data());
    live(room);
    if (room.trackerGameId) return;
    const id = trackerGameId(room.code, room.expiresAt);
    const [game, board] = await Promise.all([
      tx.get(adminDb().doc(`unoGames/${id}`)),
      tx.get(adminDb().doc("uno/scoreboard")),
    ]);
    if (room.round !== data.round || room.version !== data.version)
      fail("stale", "The room changed. Review it and try again.");
    if (room.stage !== "finished")
      fail("not_finished", "Finish a round before saving to the tracker.");
    if (room.players.length !== 2)
      fail("invalid", "Only a game with two players can be saved.");
    const cam = room.players.find((p) => p.id === data.camPlayerId);
    const laura = room.players.find((p) => p.id !== data.camPlayerId);
    if (!cam || !laura) fail("invalid", "Choose which player is Cam.");
    const scores = {
      cam: room.scores[cam.id] ?? 0,
      laura: room.scores[laura.id] ?? 0,
    };
    if (scores.cam + scores.laura === 0)
      fail("invalid", "Nobody has won a round yet.");
    if (!game.exists) {
      const entry = historicGameEntry(
        {
          id,
          ...scores,
          playedOn: data.playedOn,
          notes: trackerNotes(room.code),
        },
        board.exists ? (board.data() as Board) : undefined,
        Date.now(),
      );
      tx.create(game.ref, entry.game);
      tx.set(board.ref, entry.board);
    }
    tx.update(roomRef, { trackerGameId: id, version: room.version + 1 });
  });
}
