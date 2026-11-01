import { describe, expect, it, vi } from "vitest";
import {
  createUnoController,
  selectUno,
  type UnoRuntime,
  type UnoStorage,
  type UnoTransport,
} from "@/uno/controller";
import {
  appendEvent,
  emptyLocal,
  normaliseLocal,
  type LocalData,
} from "@/uno/storage";
import { reconcile } from "@/uno/reconcile";
import {
  emptyBoard,
  result,
  type Game,
  type Lease,
  type PendingEvent,
  type UnoState,
} from "@/uno/model";

const GAME = "dbeb9180-6337-4257-8cca-97bf1bb0a151";
const LEASE: Lease = {
  id: "dbeb9180-6337-4257-8cca-97bf1bb0a152",
  gameId: GAME,
  accountId: "alice",
};
const game = (cam = 0): Game => ({
  id: GAME,
  cam,
  laura: 0,
  status: "active",
  startedAt: 1,
  finishedAt: null,
  playedOn: null,
  notes: "",
  source: "live",
  version: cam + 1,
  amended: false,
  ...result({ cam, laura: 0 }),
});
const state = (version = 1, cam = 0): UnoState => ({
  board: { ...emptyBoard(), cam, activeGameId: GAME, version },
  games: [game(cam)],
});
const event = (id = "round-1"): PendingEvent => ({
  id,
  gameId: GAME,
  leaseId: LEASE.id,
  accountId: "alice",
  player: "cam",
  delta: 1,
  createdAt: 1,
  status: "pending",
});
const local = (): LocalData => ({
  ...emptyLocal(),
  state: state(),
  lease: LEASE,
  accountId: "alice",
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function setup(data = local()) {
  let stored = structuredClone(data);
  let online = false;
  let clock = 10000;
  let remote: (() => void) | undefined;
  let connection: (() => void) | undefined;
  const stop = vi.fn();
  const stopTimer = vi.fn();
  let tail = Promise.resolve();
  const storage: UnoStorage = {
    read: vi.fn(() => Promise.resolve(structuredClone(stored))),
    change: vi.fn((update: Parameters<UnoStorage["change"]>[0]) => {
      stored = {
        ...update(structuredClone(stored)),
        revision: stored.revision + 1,
      };
      return Promise.resolve(structuredClone(stored));
    }),
    save: vi.fn((item: PendingEvent) => {
      stored = { ...appendEvent(stored, item), revision: stored.revision + 1 };
      return Promise.resolve(structuredClone(stored));
    }),
  };
  const transport = {
    account: vi.fn(() => Promise.resolve("alice" as string | null)),
    read: vi.fn(() => Promise.resolve(state())),
    version: vi.fn(() => Promise.resolve(state().board.version)),
    start: vi.fn(() => Promise.resolve(state(2))),
    finish: vi.fn<UnoTransport["finish"]>(() =>
      Promise.resolve({
        finished: true,
        state: {
          ...state(2),
          board: { ...state(2).board, activeGameId: null },
          games: [{ ...game(), status: "completed" as const }],
        },
      }),
    ),
    history: vi.fn(() => Promise.resolve(state(3, 2))),
    open: vi.fn(() => Promise.resolve(LEASE)),
    sync: vi.fn((events: Parameters<UnoTransport["sync"]>[0]) =>
      Promise.resolve({
        accepted: events.map((e) => e.id),
        rejected: [],
        state: state(
          2,
          events.reduce((n, e) => n + e.delta, 0),
        ),
      }),
    ),
  } satisfies UnoTransport;
  const runtime = {
    now: () => clock,
    id: () => "new-round",
    online: () => online,
    visible: () => true,
    lock: <T>(operation: () => Promise<T>) => {
      const task = tail.then(operation);
      tail = task.then(
        () => undefined,
        () => undefined,
      );
      return task;
    },
    watch: vi.fn((handlers: Parameters<UnoRuntime["watch"]>[0]) => {
      remote = handlers.remote;
      connection = handlers.connection;
      return stop;
    }),
    interval: vi.fn(() => stopTimer),
    broadcast: vi.fn(),
    confirmDiscard: () => true,
    persist: () => Promise.resolve(true),
  } satisfies UnoRuntime;
  const controller = createUnoController(storage, transport, runtime);
  const unsubscribe = controller.subscribe(vi.fn());
  return {
    controller,
    transport,
    storage,
    runtime,
    stop,
    stopTimer,
    unsubscribe,
    stored: () => stored,
    replace: (next: LocalData) => {
      stored = next;
    },
    online: (value = true) => {
      online = value;
    },
    advance: (ms: number) => {
      clock += ms;
    },
    remote: () => remote?.(),
    connection: () => connection?.(),
    ready: () =>
      vi.waitFor(() => {
        expect(controller.getSnapshot().ready).toBe(true);
      }),
  };
}

describe("atomic reconciliation", () => {
  it.each([1, 2, 3])(
    "compares incoming board version %s without losing a valid lease",
    (version) => {
      const current = { ...local(), state: state(2, 1) };
      const next = reconcile(current, {
        state: state(version, 2),
        pendingAtRequest: [],
        checkedAt: 10,
      });
      expect(next.state?.board.cam).toBe(version < 2 ? 1 : 2);
      expect(next.lease).toEqual(LEASE);
    },
  );
  it("removes only acknowledged IDs, even when the response is older", () => {
    const current = {
      ...local(),
      state: state(4, 2),
      events: [
        { ...event(), order: 1 },
        { ...event("round-2"), order: 2 },
      ],
    };
    const next = reconcile(current, {
      state: state(2, 1),
      accepted: ["round-1"],
      pendingAtRequest: [],
      replay: true,
      checkedAt: 10,
    });
    expect(next.state?.board.version).toBe(4);
    expect(next.events.map((e) => e.id)).toEqual(["round-2"]);
    expect(
      reconcile(next, {
        state: state(2, 1),
        accepted: ["round-1"],
        pendingAtRequest: [],
        replay: true,
        checkedAt: 11,
      }),
    ).toEqual(next);
  });
  it("defers uncertain events but merges alongside points recorded after the request started", () => {
    const current = { ...local(), events: [{ ...event(), order: 1 }] };
    expect(
      reconcile(current, {
        state: state(2, 1),
        pendingAtRequest: ["round-1"],
        checkedAt: 10,
      }).state,
    ).toEqual(current.state);
    const next = reconcile(current, {
      state: state(2),
      pendingAtRequest: [],
      checkedAt: 10,
    });
    expect(next.state?.board.version).toBe(2);
    expect(next.events).toEqual(current.events);
  });
  it("preserves rejected entries for attention and invalidates leases only for the retained state", () => {
    const current = { ...local(), events: [{ ...event(), order: 1 }] };
    const next = reconcile(current, {
      state: { ...state(2), board: { ...state(2).board, activeGameId: null } },
      pendingAtRequest: [],
      replay: true,
      rejected: [{ id: "round-1", message: "Review this correction" }],
      checkedAt: 10,
    });
    expect(next.events[0]).toMatchObject({
      status: "attention",
      error: "Review this correction",
    });
    expect(next.lease).toBeNull();
    expect(
      reconcile(
        { ...local(), state: state(3) },
        {
          state: { ...state(), board: emptyBoard() },
          pendingAtRequest: [],
          checkedAt: 10,
        },
      ).lease,
    ).toEqual(LEASE);
  });
  it("normalises existing version-1 storage without changing its queue", () => {
    const legacy = {
      state: state(),
      events: [{ ...event(), order: 1 }],
      lease: LEASE,
      accountId: "alice",
      checkedAt: 5,
    };
    expect(normaliseLocal(legacy)).toEqual({ ...legacy, revision: 0 });
  });
});

describe("per-tab coordinator", () => {
  it("starts one set of resources and stops them after the last subscriber leaves", async () => {
    const h = setup();
    await h.ready();
    const off = h.controller.subscribe(vi.fn());
    expect(h.runtime.watch).toHaveBeenCalledOnce();
    expect(h.runtime.interval).toHaveBeenCalledWith(expect.any(Function), 5000);
    h.unsubscribe();
    expect(h.stop).not.toHaveBeenCalled();
    off();
    expect(h.stop).toHaveBeenCalledOnce();
    expect(h.stopTimer).toHaveBeenCalledOnce();
  });
  it("ignores an older local publication when the server version has not changed", async () => {
    const h = setup({ ...local(), revision: 5 });
    await h.ready();
    h.replace({ ...local(), revision: 4, events: [{ ...event(), order: 1 }] });
    h.remote();
    await Promise.resolve();
    expect(h.controller.getSnapshot().data.revision).toBe(5);
    expect(h.controller.getSnapshot().data.events).toEqual([]);
    h.unsubscribe();
  });
  it("keeps a newer snapshot and lease when a delayed start response arrives offline", async () => {
    const h = setup();
    await h.ready();
    const response = deferred<UnoState>();
    h.transport.start.mockReturnValue(response.promise);
    h.online();
    const starting = h.controller.start();
    await vi.waitFor(() => {
      expect(h.transport.start).toHaveBeenCalledOnce();
    });
    h.replace({ ...local(), state: state(3, 1), revision: 10 });
    h.online(false);
    response.resolve(state(2));
    await starting;
    expect(h.stored().state?.board.cam).toBe(1);
    expect(h.stored().lease).toEqual(LEASE);
    h.unsubscribe();
  });
  it("records durably while the network lock is occupied and replays exactly once", async () => {
    const h = setup();
    await h.ready();
    h.transport.version.mockResolvedValue(99);
    const response = deferred<UnoState>();
    h.transport.read.mockReturnValueOnce(response.promise);
    h.online();
    const refreshing = h.controller.refresh();
    await vi.waitFor(() => {
      expect(h.transport.read).toHaveBeenCalledOnce();
    });
    await h.controller.score("cam", 1);
    expect(h.stored().events).toHaveLength(1);
    expect(selectUno(h.controller.getSnapshot()).totals.cam).toBe(1);
    response.resolve(state());
    await refreshing;
    expect(h.transport.sync).toHaveBeenCalledOnce();
    expect(h.stored().events).toEqual([]);
    expect(selectUno(h.controller.getSnapshot()).totals.cam).toBe(1);
    h.unsubscribe();
  });
  it("skips the full read while the shared scoreboard version is unchanged", async () => {
    const h = setup();
    await h.ready();
    h.online();
    await h.controller.refresh();
    expect(h.transport.version).toHaveBeenCalled();
    expect(h.transport.read).not.toHaveBeenCalled();
    h.transport.version.mockResolvedValue(2);
    await h.controller.refresh();
    expect(h.transport.read).toHaveBeenCalledOnce();
    h.unsubscribe();
  });
  it("coalesces repeated triggers into one follow-up refresh", async () => {
    const h = setup();
    await h.ready();
    h.transport.version.mockResolvedValue(99);
    const response = deferred<UnoState>();
    h.transport.read.mockReturnValueOnce(response.promise);
    h.online();
    const refreshing = h.controller.refresh();
    await vi.waitFor(() => {
      expect(h.transport.read).toHaveBeenCalledOnce();
    });
    void h.controller.refresh();
    void h.controller.refresh();
    void h.controller.refresh();
    response.resolve(state());
    await refreshing;
    expect(h.transport.read).toHaveBeenCalledTimes(2);
    h.unsubscribe();
  });
  it("releases a failed request's lock, backs off and retries on reconnection", async () => {
    const h = setup();
    await h.ready();
    h.transport.version.mockResolvedValue(99);
    h.transport.read.mockRejectedValueOnce(new Error("Connection lost"));
    h.online();
    await h.controller.refresh();
    await h.controller.refresh();
    expect(h.transport.read).toHaveBeenCalledOnce();
    h.connection();
    await vi.waitFor(() => {
      expect(h.transport.read).toHaveBeenCalledTimes(2);
    });
    expect(h.controller.getSnapshot().error).toBe("");
    h.unsubscribe();
  });
  it("checks a clean queue after taking the lock and retains points recorded during finish", async () => {
    const h = setup();
    await h.ready();
    const response = deferred<Awaited<ReturnType<UnoTransport["finish"]>>>();
    h.transport.finish.mockReturnValue(response.promise);
    h.online();
    const finishing = h.controller.finish(game());
    await vi.waitFor(() => {
      expect(h.transport.finish).toHaveBeenCalledOnce();
    });
    await h.controller.score("cam", 1);
    h.online(false);
    response.resolve({
      finished: true,
      state: {
        ...state(2),
        board: {
          ...state(2).board,
          activeGameId: null,
          lastFinishedGameId: GAME,
        },
        games: [{ ...game(), status: "completed" }],
      },
    });
    await finishing;
    expect(h.stored().events).toHaveLength(1);
    expect(h.stored().lease).toBeNull();
    expect(selectUno(h.controller.getSnapshot()).canScore).toBe(false);
    h.unsubscribe();
  });
  it("saves history with pending changes, defers its snapshot and reports success", async () => {
    const h = setup({
      ...local(),
      events: [{ ...event(), order: 1, status: "attention" }],
    });
    await h.ready();
    h.online();
    await h.controller.addHistory({
      id: GAME,
      cam: 2,
      laura: 0,
      playedOn: "2020-01-15",
      notes: "Holiday",
    });
    expect(h.transport.history).toHaveBeenCalledOnce();
    expect(h.stored().state?.board.version).toBe(1);
    expect(h.stored().events).toHaveLength(1);
    expect(h.controller.getSnapshot().notice).toBe(
      "Historic game saved. Totals will refresh after pending changes sync.",
    );
    h.unsubscribe();
  });
  it("does not replay another account's events or change their IDs", async () => {
    const h = setup({ ...local(), events: [{ ...event(), order: 1 }] });
    await h.ready();
    h.transport.account.mockResolvedValue("bob");
    h.online();
    await h.controller.refresh();
    expect(h.transport.sync).not.toHaveBeenCalled();
    expect(h.stored().events[0].id).toBe("round-1");
    expect(h.controller.getSnapshot().error).toContain("another account");
    h.unsubscribe();
  });
  it("leaves the visible score unchanged if the durable save fails", async () => {
    const h = setup();
    await h.ready();
    vi.mocked(h.storage.save).mockRejectedValue(new Error("Storage full"));
    await h.controller.score("cam", 1);
    expect(selectUno(h.controller.getSnapshot()).totals.cam).toBe(0);
    expect(h.controller.getSnapshot().error).toBe("Storage full");
    h.unsubscribe();
  });
});

it("replays ordered batches of at most 25 and retains an event until its acknowledgement", async () => {
  const data = {
    ...local(),
    events: Array.from({ length: 30 }, (_, index) => ({
      ...event(`round-${String(index)}`),
      order: index + 1,
    })),
  };
  const h = setup(data);
  await h.ready();
  let total = 0;
  let version = 1;
  h.transport.sync.mockImplementation((events) => {
    total += events.length;
    version++;
    return Promise.resolve({
      accepted: events.map((item) => item.id),
      rejected: [],
      state: state(version, total),
    });
  });
  h.online();
  await h.controller.refresh();
  expect(h.transport.sync.mock.calls.map(([events]) => events.length)).toEqual([
    25, 5,
  ]);
  expect(
    h.transport.sync.mock.calls.flatMap(([events]) =>
      events.map((item) => item.id),
    ),
  ).toEqual(data.events.map((item) => item.id));
  expect(h.stored().events).toEqual([]);
  expect(h.stored().state?.board.cam).toBe(30);
  h.unsubscribe();
});
it("retains queued IDs when a sync response is lost and retries them after backoff", async () => {
  const h = setup({ ...local(), events: [{ ...event(), order: 1 }] });
  await h.ready();
  h.transport.sync.mockRejectedValueOnce(new Error("Response lost"));
  h.online();
  await h.controller.refresh();
  expect(h.stored().events[0].id).toBe("round-1");
  expect(h.stored().state?.board.cam).toBe(0);
  await h.controller.refresh();
  expect(h.transport.sync).toHaveBeenCalledOnce();
  h.advance(2000);
  await h.controller.refresh();
  expect(h.transport.sync).toHaveBeenCalledTimes(2);
  expect(h.stored().events).toEqual([]);
  expect(h.stored().state?.board.cam).toBe(1);
  h.unsubscribe();
});
it("ignores a lease response whose game no longer matches the retained snapshot", async () => {
  const h = setup({ ...local(), lease: null });
  await h.ready();
  const permission = deferred<Lease>();
  h.transport.open.mockReturnValueOnce(permission.promise);
  h.online();
  const refreshing = h.controller.refresh();
  await vi.waitFor(() => {
    expect(h.transport.open).toHaveBeenCalledOnce();
  });
  const completed = {
    ...state(5),
    board: { ...state(5).board, activeGameId: null },
    games: [{ ...game(), status: "completed" as const }],
  };
  h.replace({ ...local(), state: completed, lease: null, revision: 20 });
  permission.resolve(LEASE);
  await refreshing;
  expect(h.stored().lease).toBeNull();
  expect(h.stored().state?.board.version).toBe(5);
  h.unsubscribe();
});
