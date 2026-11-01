"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuth } from "@/auth";
import { adminDb } from "@/firebase/admin";
import {
  emptyBoard,
  HistoricGameSchema,
  Id,
  LEASE_GRACE_MS,
  result,
  ScoreEventSchema,
  type Board,
  type EventHistory,
  type Game,
  type Lease,
  type UnoState,
} from "@/uno/model";

const boardRef = () => adminDb().doc("uno/scoreboard");
const gameRef = (id: string) => adminDb().doc(`unoGames/${id}`);

export async function readUnoState(): Promise<UnoState> {
  // Read board and games from one consistent transaction snapshot.
  return adminDb().runTransaction(
    async (tx) => {
      const board = await tx.get(boardRef());
      const games = await tx.get(adminDb().collection("unoGames"));
      return {
        board: board.exists ? (board.data() as Board) : emptyBoard(),
        games: games.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Game),
      };
    },
    { readOnly: true },
  );
}

// A cheap check for whether readUnoState would return anything new: the
// scoreboard version changes with every award, start, finish and historic game.
export async function readUnoVersion(): Promise<number> {
  const board = await boardRef().get();
  return board.exists ? (board.get("version") as number) : 0;
}

export async function readUnoHistory(gameId: string): Promise<EventHistory[]> {
  Id.parse(gameId);
  const events = await gameRef(gameId)
    .collection("events")
    .orderBy("receivedAt")
    .get();
  // Account identifiers and scoring leases are never part of the public response.
  return events.docs.map((doc) => {
    const data = doc.data() as EventHistory;
    return {
      id: doc.id,
      player: data.player,
      delta: data.delta,
      createdAt: data.createdAt,
      receivedAt: doc.get("receivedAt") as number,
    };
  });
}

export async function startUnoGame(): Promise<UnoState> {
  await requireAuth();
  const id = randomUUID();
  await adminDb().runTransaction(async (tx) => {
    const snapshot = await tx.get(boardRef());
    const board = snapshot.exists ? (snapshot.data() as Board) : emptyBoard();
    if (board.activeGameId) return;
    const now = Date.now();
    const game: Game = {
      id,
      cam: 0,
      laura: 0,
      status: "active",
      startedAt: now,
      finishedAt: null,
      playedOn: null,
      notes: "",
      source: "live",
      ...result({ cam: 0, laura: 0 }),
      version: 1,
      amended: false,
    };
    tx.create(gameRef(id), game);
    tx.set(boardRef(), {
      ...board,
      activeGameId: id,
      version: board.version + 1,
      updatedAt: now,
    });
  });
  return readUnoState();
}

export async function openUnoScoring(gameId: string): Promise<Lease> {
  const session = await requireAuth();
  Id.parse(gameId);
  const id = randomUUID();
  await adminDb().runTransaction(async (tx) => {
    const snapshot = await tx.get(gameRef(gameId));
    if (!snapshot.exists || snapshot.get("status") !== "active")
      throw new Error("This game has finished. Refresh to see its result.");
    tx.create(adminDb().doc(`unoLeases/${id}`), {
      gameId,
      accountId: session.uid,
      openedAt: Date.now(),
    });
  });
  return { id, gameId, accountId: session.uid };
}

export async function syncUnoEvents(input: unknown) {
  const session = await requireAuth();
  const events = z.array(ScoreEventSchema).min(1).max(25).parse(input);
  const accepted: string[] = [];
  const rejected: { id: string; message: string }[] = [];
  for (const event of events) {
    if (event.accountId !== session.uid) {
      rejected.push({
        id: event.id,
        message: "Sign in with the account that recorded this round.",
      });
      break;
    }
    const error = await adminDb().runTransaction(
      async (tx): Promise<string | null> => {
        const storedRef = gameRef(event.gameId)
          .collection("events")
          .doc(event.id);
        const [stored, gameSnapshot, boardSnapshot, lease] = await Promise.all([
          tx.get(storedRef),
          tx.get(gameRef(event.gameId)),
          tx.get(boardRef()),
          tx.get(adminDb().doc(`unoLeases/${event.leaseId}`)),
        ]);
        if (stored.exists) {
          const original = stored.data();
          return Object.entries(event).every(
            ([key, value]) => original?.[key] === value,
          )
            ? null
            : "This event ID already belongs to another round.";
        }
        if (!gameSnapshot.exists || !boardSnapshot.exists)
          return "The original game could not be found.";
        if (
          !lease.exists ||
          lease.get("accountId") !== session.uid ||
          lease.get("gameId") !== event.gameId
        )
          return "This device was not opened for scoring during that game.";
        const game = gameSnapshot.data() as Game;
        const board = boardSnapshot.data() as Board;
        if (game.source !== "live")
          return "Historic games cannot receive live rounds.";
        if (
          game.finishedAt !== null &&
          Date.now() > game.finishedAt + LEASE_GRACE_MS
        )
          return "This game finished more than 7 days ago, so late rounds can no longer be added.";
        const next = {
          cam: game.cam,
          laura: game.laura,
          [event.player]: game[event.player] + event.delta,
        };
        if (next[event.player] < 0 || board[event.player] + event.delta < 0)
          return "This correction would make a score negative. Review the original game and retry when its missing rounds have synced.";
        if (
          !Number.isSafeInteger(next[event.player]) ||
          !Number.isSafeInteger(board[event.player] + event.delta)
        )
          return "The score is too large to save safely.";
        const now = Date.now();
        tx.create(storedRef, {
          ...event,
          actionType: event.delta === 1 ? "award" : "correction",
          receivedAt: now,
        });
        tx.update(gameRef(game.id), {
          ...next,
          ...result(next),
          version: game.version + 1,
          amended: game.amended || game.status === "completed",
        });
        tx.update(boardRef(), {
          [event.player]: board[event.player] + event.delta,
          version: board.version + 1,
          updatedAt: now,
        });
        return null;
      },
    );
    if (error) {
      rejected.push({ id: event.id, message: error });
      break;
    }
    accepted.push(event.id);
  }
  return { accepted, rejected, state: await readUnoState() };
}

export async function finishUnoGame(gameId: string, expectedVersion: number) {
  await requireAuth();
  Id.parse(gameId);
  z.number().int().nonnegative().parse(expectedVersion);
  const finished = await adminDb().runTransaction(async (tx) => {
    const now = Date.now();
    // All reads come before any write.
    const [gameSnapshot, boardSnapshot, gameLeases, expiredLeases] =
      await Promise.all([
        tx.get(gameRef(gameId)),
        tx.get(boardRef()),
        tx.get(adminDb().collection("unoLeases").where("gameId", "==", gameId)),
        tx.get(
          adminDb()
            .collection("unoLeases")
            .where("expiresAt", "<", now)
            .limit(100),
        ),
      ]);
    if (!gameSnapshot.exists || !boardSnapshot.exists)
      throw new Error("Game not found.");
    const game = gameSnapshot.data() as Game;
    const board = boardSnapshot.data() as Board;
    if (game.status === "completed") return true;
    if (board.activeGameId !== gameId || game.version !== expectedVersion)
      return false;
    tx.update(gameRef(gameId), {
      status: "completed",
      finishedAt: now,
      ...result(game),
      version: game.version + 1,
    });
    tx.update(boardRef(), {
      activeGameId: null,
      lastFinishedGameId: gameId,
      version: board.version + 1,
      updatedAt: now,
    });
    // This game's leases stop working after the grace period, and any that
    // already have are deleted.
    for (const lease of gameLeases.docs)
      tx.update(lease.ref, { expiresAt: now + LEASE_GRACE_MS });
    for (const lease of expiredLeases.docs) tx.delete(lease.ref);
    return true;
  });
  return { finished, state: await readUnoState() };
}

export async function addHistoricUnoGame(input: unknown) {
  await requireAuth();
  const data = HistoricGameSchema.parse(input);
  await adminDb().runTransaction(async (tx) => {
    const [existing, boardSnapshot] = await Promise.all([
      tx.get(gameRef(data.id)),
      tx.get(boardRef()),
    ]);
    if (existing.exists) {
      if (
        existing.get("source") !== "historic" ||
        ["cam", "laura", "playedOn", "notes"].some(
          (key) => (existing.get(key) ?? "") !== data[key as keyof typeof data],
        )
      )
        throw new Error("This entry ID has already been used.");
      return;
    }
    const board = boardSnapshot.exists
      ? (boardSnapshot.data() as Board)
      : emptyBoard();
    const now = Date.now();
    const game: Game = {
      ...data,
      playedOn: data.playedOn,
      status: "completed",
      source: "historic",
      startedAt: now,
      finishedAt: now,
      ...result(data),
      version: 1,
      amended: false,
    };
    tx.create(gameRef(data.id), game);
    tx.set(boardRef(), {
      ...board,
      cam: board.cam + data.cam,
      laura: board.laura + data.laura,
      version: board.version + 1,
      updatedAt: now,
    });
  });
  return readUnoState();
}

// Round wins from historic games are part of the lifetime totals, so changing
// or removing one adjusts the scoreboard in the same transaction.
export async function updateHistoricUnoGame(input: unknown) {
  await requireAuth();
  const data = HistoricGameSchema.parse(input);
  await adminDb().runTransaction(async (tx) => {
    const [existing, boardSnapshot] = await Promise.all([
      tx.get(gameRef(data.id)),
      tx.get(boardRef()),
    ]);
    if (!existing.exists || existing.get("source") !== "historic")
      throw new Error("This historic game could not be found.");
    const board = boardSnapshot.exists
      ? (boardSnapshot.data() as Board)
      : emptyBoard();
    const game = existing.data() as Game;
    const totals = {
      cam: board.cam - game.cam + data.cam,
      laura: board.laura - game.laura + data.laura,
    };
    if (totals.cam < 0 || totals.laura < 0)
      throw new Error("These scores would make a lifetime total negative.");
    const now = Date.now();
    tx.update(gameRef(data.id), {
      cam: data.cam,
      laura: data.laura,
      playedOn: data.playedOn,
      notes: data.notes,
      ...result(data),
      version: game.version + 1,
    });
    tx.set(boardRef(), {
      ...board,
      ...totals,
      version: board.version + 1,
      updatedAt: now,
    });
  });
  return readUnoState();
}

export async function deleteHistoricUnoGame(id: string) {
  await requireAuth();
  Id.parse(id);
  await adminDb().runTransaction(async (tx) => {
    const [existing, boardSnapshot] = await Promise.all([
      tx.get(gameRef(id)),
      tx.get(boardRef()),
    ]);
    // Deleting twice is harmless, but a live game is never removed this way.
    if (!existing.exists) return;
    if (existing.get("source") !== "historic")
      throw new Error("Only historic games can be deleted.");
    const board = boardSnapshot.exists
      ? (boardSnapshot.data() as Board)
      : emptyBoard();
    const game = existing.data() as Game;
    const totals = {
      cam: board.cam - game.cam,
      laura: board.laura - game.laura,
    };
    if (totals.cam < 0 || totals.laura < 0)
      throw new Error(
        "Deleting this game would make a lifetime total negative.",
      );
    tx.delete(gameRef(id));
    tx.set(boardRef(), {
      ...board,
      ...totals,
      version: board.version + 1,
      updatedAt: Date.now(),
    });
  });
  return readUnoState();
}
