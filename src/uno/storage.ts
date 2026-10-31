import type { Lease, PendingEvent, UnoState } from "./model";

export interface LocalEvent extends PendingEvent {
  order: number;
}
export interface LocalData {
  state: UnoState | null;
  events: LocalEvent[];
  lease: Lease | null;
  accountId: string | null;
  checkedAt: number;
}
const DB = "almostyellow-uno";
const empty = (): LocalData => ({
  state: null,
  events: [],
  lease: null,
  accountId: null,
  checkedAt: 0,
});

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB, 1);
    } catch {
      reject(
        new Error(
          "Device storage is unavailable. Enable browser storage or leave private browsing, then reload.",
        ),
      );
      return;
    }
    request.onupgradeneeded = () => {
      request.result.createObjectStore("data");
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(
        new Error(
          "Device storage is unavailable. Enable browser storage or free some space, then reload.",
        ),
      );
    };
    request.onblocked = () => {
      reject(
        new Error(
          "Close other Uno tabs, then reload to enable device storage.",
        ),
      );
    };
  });
}

// One read-modify-write transaction serialises tabs and atomically acknowledges
// server totals and queue entries. No round is shown as saved before oncomplete.
export async function changeLocal(
  update?: (data: LocalData) => LocalData,
): Promise<LocalData> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("data", update ? "readwrite" : "readonly");
    const store = tx.objectStore("data");
    const request = store.get("current");
    let value: LocalData;
    let failure: unknown;
    request.onsuccess = () => {
      try {
        value = (request.result as LocalData | undefined) ?? empty();
        if (update) {
          value = update(value);
          store.put(value, "current");
        }
      } catch (error) {
        failure =
          error instanceof DOMException
            ? new Error(
                "This change was not saved. Enable browser storage or free some space and try again.",
              )
            : error;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onabort = () => {
      db.close();
      reject(
        failure instanceof Error
          ? failure
          : new Error(
              "This round was not saved. Free some device storage and try again.",
            ),
      );
    };
    tx.onerror = () => {
      failure = new Error(
        "This round was not saved. Enable browser storage or free some space and try again.",
      );
    };
  });
}

export async function saveEvent(event: PendingEvent) {
  return changeLocal((data) => {
    if (
      !data.state ||
      data.accountId !== event.accountId ||
      data.lease?.id !== event.leaseId
    )
      throw new Error(
        "Open this game online with the account recording its rounds first.",
      );
    const game = data.state.games.find((g) => g.id === event.gameId);
    if (game?.status !== "active") throw new Error("This game has finished.");
    const pending = data.events
      .filter(
        (e) =>
          e.gameId === game.id &&
          e.player === event.player &&
          e.status === "pending",
      )
      .reduce((sum, e) => sum + e.delta, 0);
    if (game[event.player] + pending + event.delta < 0)
      throw new Error("The score cannot go below zero.");
    const order = data.events.reduce((n, e) => Math.max(n, e.order), 0) + 1;
    return { ...data, events: [...data.events, { ...event, order }] };
  });
}

export function publicEvent(event: LocalEvent) {
  return {
    id: event.id,
    gameId: event.gameId,
    leaseId: event.leaseId,
    player: event.player,
    delta: event.delta,
    createdAt: event.createdAt,
    accountId: event.accountId,
  };
}
