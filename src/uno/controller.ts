import type {
  Game,
  HistoricGameInput,
  Lease,
  PendingEvent,
  Player,
  ScoreEvent,
  UnoState,
} from "./model";
import { emptyLocal, publicEvent, type LocalData } from "./storage";
import { reconcile, validLease, type Reconciliation } from "./reconcile";

export interface UnoTransport {
  account: () => Promise<string | null>;
  read: () => Promise<UnoState>;
  start: () => Promise<UnoState>;
  finish: (
    id: string,
    version: number,
  ) => Promise<{ finished: boolean; state: UnoState }>;
  history: (input: HistoricGameInput) => Promise<UnoState>;
  open: (id: string) => Promise<Lease>;
  sync: (events: ScoreEvent[]) => Promise<{
    accepted: string[];
    rejected: { id: string; message: string }[];
    state: UnoState;
  }>;
}
export interface UnoStorage {
  read: () => Promise<LocalData>;
  change: (update: (data: LocalData) => LocalData) => Promise<LocalData>;
  save: (event: PendingEvent) => Promise<LocalData>;
}
export interface UnoRuntime {
  now: () => number;
  id: () => string;
  online: () => boolean;
  visible: () => boolean;
  lock: <T>(operation: () => Promise<T>) => Promise<T>;
  watch: (handlers: {
    connection: () => void;
    foreground: () => void;
    remote: () => void;
  }) => () => void;
  interval: (callback: () => void, ms: number) => () => void;
  broadcast: () => void;
  confirmDiscard: () => boolean;
  persist: () => Promise<boolean>;
}
export interface UnoSnapshot {
  data: LocalData;
  online: boolean;
  syncing: boolean;
  error: string;
  ready: boolean;
  verified: boolean;
  notice: string;
  storageReady: boolean;
}
export const initialSnapshot: UnoSnapshot = {
  data: emptyLocal(),
  online: true,
  syncing: false,
  error: "",
  ready: false,
  verified: false,
  notice: "",
  storageReady: false,
};

export function selectUno(snapshot: UnoSnapshot) {
  const { data, storageReady } = snapshot;
  const state = data.state;
  const original = state?.games.find(
    (game) =>
      game.id === (state.board.activeGameId ?? state.board.lastFinishedGameId),
  );
  const game = original ? { ...original } : undefined;
  const totals = state
    ? { cam: state.board.cam, laura: state.board.laura }
    : { cam: 0, laura: 0 };
  for (const event of data.events) {
    if (event.status !== "pending") continue;
    totals[event.player] += event.delta;
    if (game?.id === event.gameId) game[event.player] += event.delta;
  }
  const canScore =
    storageReady &&
    game?.status === "active" &&
    validLease(data, data.lease) &&
    !data.events.some(
      (event) =>
        event.status === "attention" || event.accountId !== data.accountId,
    );
  return { state, game, totals, canScore };
}

const WRONG_ACCOUNT =
  "Saved rounds belong to another account. Sign in with that account to sync them; they are still on this device.";
const ATTENTION =
  "A saved round needs attention. Review it below before syncing the remaining rounds.";

export function createUnoController(
  storage: UnoStorage,
  transport: UnoTransport,
  runtime: UnoRuntime,
) {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  let stopWatching: (() => void) | undefined;
  let stopTimer: (() => void) | undefined;
  let loading: Promise<void> | undefined;
  let refreshing: Promise<void> | undefined;
  let refreshAgain = false;
  let failures = 0;
  let retryAt = 0;

  function patch(change: Partial<UnoSnapshot>) {
    snapshot = { ...snapshot, ...change };
    for (const listener of listeners) listener();
  }
  function publish(data: LocalData) {
    if (data.revision < snapshot.data.revision) return false;
    patch({ data });
    return true;
  }
  function message(error: unknown) {
    return error instanceof Error
      ? error.message
      : "Could not connect. Saved rounds will retry automatically.";
  }
  async function change(update: (data: LocalData) => LocalData) {
    const data = await storage.change(update);
    publish(data);
    return data;
  }
  async function apply(response: Omit<Reconciliation, "checkedAt">) {
    const outcome = { changed: false, amended: false };
    const local = await change((current) => {
      const next = reconcile(current, {
        ...response,
        checkedAt: runtime.now(),
      });
      outcome.changed =
        next.state?.board.version !== current.state?.board.version;
      outcome.amended =
        outcome.changed &&
        !!next.state?.games.some(
          (game) =>
            game.amended &&
            current.state?.games.some(
              (old) => old.id === game.id && old.version < game.version,
            ),
        );
      return next;
    });
    if (outcome.changed) runtime.broadcast();
    if (outcome.amended)
      patch({
        notice: "A completed result was amended after offline rounds synced.",
      });
    return local;
  }
  async function account() {
    const uid = await transport.account();
    await change((current) => {
      const data = { ...current, accountId: uid };
      return {
        ...data,
        lease: validLease(data, current.lease) ? current.lease : null,
      };
    });
    patch({ verified: true });
    return uid;
  }
  async function replay(uid: string | null) {
    const local = await storage.read();
    if (local.events.some((event) => event.accountId !== uid)) {
      patch({ error: WRONG_ACCOUNT });
      return false;
    }
    if (local.events.some((event) => event.status === "attention")) {
      patch({ error: ATTENTION });
      return false;
    }
    const queue = [...local.events].sort((a, b) => a.order - b.order);
    if (!queue.length) return true;
    patch({ syncing: true });
    try {
      for (let index = 0; index < queue.length; index += 25) {
        const response = await transport.sync(
          queue.slice(index, index + 25).map(publicEvent),
        );
        await apply({ ...response, pendingAtRequest: [], replay: true });
        if (response.rejected.length) {
          patch({ error: ATTENTION });
          return false;
        }
      }
      if (!snapshot.notice.includes("amended"))
        patch({ notice: `All ${String(queue.length)} saved changes synced` });
      return true;
    } finally {
      patch({ syncing: false });
    }
  }
  async function lease(uid: string | null) {
    const current = await storage.read();
    const gameId = current.state?.board.activeGameId;
    if (!uid || !gameId || validLease(current, current.lease)) return;
    const permission = await transport.open(gameId);
    await change((latest) => ({
      ...latest,
      lease: validLease(latest, permission) ? permission : latest.lease,
    }));
    runtime.broadcast();
  }
  async function refreshLocked() {
    const uid = await account();
    if (!(await replay(uid))) return;
    const before = await storage.read();
    const state = await transport.read();
    await apply({
      state,
      pendingAtRequest: before.events.map((event) => event.id),
    });
    await lease(uid);
    failures = 0;
    retryAt = 0;
    patch({ error: "" });
  }
  function shouldRefreshAgain() {
    return (
      refreshAgain &&
      runtime.online() &&
      runtime.now() >= retryAt &&
      listeners.size > 0
    );
  }
  function refresh(): Promise<void> {
    if (
      !listeners.size ||
      !runtime.online() ||
      runtime.now() < retryAt ||
      !snapshot.storageReady
    )
      return Promise.resolve();
    if (refreshing) {
      refreshAgain = true;
      return refreshing;
    }
    refreshing = (async () => {
      do {
        refreshAgain = false;
        try {
          await runtime.lock(async () => {
            if (runtime.online() && listeners.size) await refreshLocked();
          });
        } catch (error) {
          failures++;
          retryAt =
            runtime.now() + Math.min(60000, 1000 * 2 ** Math.min(failures, 6));
          patch({ error: message(error) });
        }
      } while (shouldRefreshAgain());
    })().finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  }
  function connection() {
    const online = runtime.online();
    patch({ online, verified: online && snapshot.verified });
    retryAt = 0;
    void refresh();
  }
  async function load() {
    try {
      publish(await storage.read());
      patch({ storageReady: true, ready: true });
      if (listeners.size) await refresh();
    } catch (error) {
      patch({ ready: true, error: message(error) });
    }
  }
  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) {
      patch({ online: runtime.online() });
      stopWatching = runtime.watch({
        connection,
        foreground: () => {
          if (runtime.visible()) connection();
        },
        remote: () => {
          void storage
            .read()
            .then(publish)
            .catch((error: unknown) => {
              patch({ error: message(error) });
            });
        },
      });
      stopTimer = runtime.interval(() => {
        if (runtime.visible()) void refresh();
      }, 5000);
      loading ??= load().finally(() => {
        loading = undefined;
      });
    }
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        stopWatching?.();
        stopTimer?.();
      }
    };
  }
  async function cleanQueue() {
    const uid = await account();
    if (!uid) throw new Error("Sign in to change this game.");
    if (!(await replay(uid))) throw new Error(snapshot.error);
    const local = await storage.read();
    if (local.events.length)
      throw new Error("Sync all saved rounds before changing this game.");
    return uid;
  }
  // Public commands acquire the lock once. Private helpers above never acquire it.
  // Local score writes deliberately remain independent of a slow server request.
  async function start() {
    await runtime.lock(async () => {
      if (!runtime.online()) throw new Error("Reconnect to start a game.");
      const uid = await cleanQueue();
      const state = await transport.start();
      await apply({ state, pendingAtRequest: [] });
      if (runtime.online()) await lease(uid);
    });
    retryAt = 0;
    void refresh();
  }
  async function finish(expected: Game) {
    const finished = await runtime.lock(async () => {
      if (!runtime.online()) throw new Error("Reconnect to finish this game.");
      await cleanQueue();
      const response = await transport.finish(expected.id, expected.version);
      await apply({ state: response.state, pendingAtRequest: [] });
      return response.finished;
    });
    retryAt = 0;
    void refresh();
    return finished;
  }
  async function addHistory(input: HistoricGameInput) {
    const state = await runtime.lock(async () => {
      if (!runtime.online())
        throw new Error("Reconnect to add a historic game.");
      if (!(await account()))
        throw new Error("Sign in to add a historic game.");
      const before = await storage.read();
      const result = await transport.history(input);
      const local = await apply({
        state: result,
        pendingAtRequest: before.events.map((event) => event.id),
      });
      if (
        local.events.some((event) =>
          before.events.some((pending) => pending.id === event.id),
        ) &&
        (local.state?.board.version ?? -1) < result.board.version
      )
        patch({
          notice:
            "Historic game saved. Totals will refresh after pending changes sync.",
        });
      return result;
    });
    retryAt = 0;
    void refresh();
    return state;
  }
  async function score(player: Player, delta: 1 | -1) {
    const { game, canScore } = selectUno(snapshot);
    const { lease: permission, accountId } = snapshot.data;
    if (!canScore || !game || !permission || !accountId) return;
    try {
      publish(
        await storage.save({
          id: runtime.id(),
          gameId: game.id,
          leaseId: permission.id,
          player,
          delta,
          createdAt: runtime.now(),
          accountId,
          status: "pending",
        }),
      );
      runtime.broadcast();
      patch({ notice: "" });
      void refresh();
    } catch (error) {
      patch({ error: message(error) });
    }
  }
  async function retry(id: string) {
    await change((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.id === id
          ? { ...event, status: "pending", error: undefined }
          : event,
      ),
    }));
    runtime.broadcast();
    retryAt = 0;
    void refresh();
  }
  async function discard(id: string) {
    if (!runtime.confirmDiscard()) return;
    await change((current) => ({
      ...current,
      events: current.events.filter((event) => event.id !== id),
    }));
    runtime.broadcast();
    retryAt = 0;
    void refresh();
  }
  async function enablePersistence() {
    const persistent = await runtime.persist();
    patch({
      notice: persistent
        ? "Persistent device storage enabled."
        : "Your browser controls storage retention. Keep this browser’s data to protect unsynced rounds.",
    });
  }
  return {
    subscribe,
    getSnapshot: () => snapshot,
    refresh,
    start,
    finish,
    addHistory,
    score,
    retry,
    discard,
    enablePersistence,
  };
}
