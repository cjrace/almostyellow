"use client";

import { useEffect, useRef, useState } from "react";
import {
  addHistoricUnoGame,
  finishUnoGame,
  openUnoScoring,
  readUnoState,
  startUnoGame,
  syncUnoEvents,
} from "@/services/uno";
import {
  names,
  type Game,
  type HistoricGameInput,
  type Player,
  type UnoState,
} from "./model";
import { changeLocal, publicEvent, saveEvent, type LocalData } from "./storage";

const initial: LocalData = {
  state: null,
  events: [],
  lease: null,
  accountId: null,
  checkedAt: 0,
};

export function useUno() {
  const [data, setData] = useState(initial);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [verified, setVerified] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const ref = useRef(data);
  const running = useRef(false);
  const failures = useRef(0);
  const retryAt = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const refresh = useRef<() => Promise<void>>(() => Promise.resolve());
  function show(next: LocalData) {
    ref.current = next;
    setData(next);
  }
  function announce() {
    channel.current?.postMessage("changed");
  }

  refresh.current = async () => {
    if (running.current || !navigator.onLine || Date.now() < retryAt.current)
      return;
    running.current = true;
    try {
      // Only one tab replays the shared durable queue at a time.
      await navigator.locks.request("almostyellow-uno-sync", async () => {
        let local: LocalData;
        const accountResponse = await fetch("/games/uno/session", {
          cache: "no-store",
        });
        if (!accountResponse.ok)
          throw new Error(
            "Could not check your session. Saved rounds will retry automatically.",
          );
        const account = (await accountResponse.json()) as {
          uid: string | null;
        };
        setVerified(true);
        local = await changeLocal((current) => ({
          ...current,
          accountId: account.uid,
          lease:
            current.lease?.accountId === account.uid ? current.lease : null,
        }));
        show(local);
        const wrongAccount = local.events.some(
          (e) => e.accountId !== account.uid,
        );
        if (wrongAccount)
          setError(
            "Saved rounds belong to another account. Sign in with that account to sync them; they are still on this device.",
          );
        const queue = local.events
          .filter((e) => e.accountId === account.uid)
          .sort((a, b) => a.order - b.order);
        if (queue.some((e) => e.status === "attention")) {
          setError(
            "A saved round needs attention. Review it below before syncing the remaining rounds.",
          );
          return;
        }
        let latest: UnoState;
        let amendedDuringSync = false;
        if (queue.length && account.uid) {
          setSyncing(true);
          for (let index = 0; index < queue.length; index += 25) {
            const response = await syncUnoEvents(
              queue.slice(index, index + 25).map(publicEvent),
            );
            amendedDuringSync ||= response.state.games.some(
              (game) =>
                game.amended &&
                ref.current.state?.games.some(
                  (old) => old.id === game.id && old.version < game.version,
                ),
            );
            local = await changeLocal((current) => ({
              ...current,
              state:
                !current.state ||
                response.state.board.version >= current.state.board.version
                  ? response.state
                  : current.state,
              checkedAt: Date.now(),
              events: current.events
                .filter((e) => !response.accepted.includes(e.id))
                .map((e) => {
                  const refused = response.rejected.find((r) => r.id === e.id);
                  return refused
                    ? { ...e, status: "attention", error: refused.message }
                    : e;
                }),
            }));
            show(local);
            announce();
            if (response.rejected.length) return;
          }
          setNotice(`All ${String(queue.length)} saved changes synced`);
          latest = local.state ?? (await readUnoState());
        } else latest = await readUnoState();
        const amended = latest.games.some(
          (game) =>
            game.amended &&
            ref.current.state?.games.some(
              (old) => old.id === game.id && old.version < game.version,
            ),
        );
        local = await changeLocal((current) => {
          // An event can have been recorded while this request was in flight.
          // Keep its old base until that event is acknowledged on the next pass.
          if (current.events.length) return current;
          return {
            ...current,
            state:
              !current.state ||
              latest.board.version >= current.state.board.version
                ? latest
                : current.state,
            checkedAt: Date.now(),
          };
        });
        show(local);
        if (amended || amendedDuringSync)
          setNotice(
            "A completed result was amended after offline rounds synced.",
          );
        const gameId = local.state?.board.activeGameId;
        if (account.uid && gameId && local.lease?.gameId !== gameId) {
          const lease = await openUnoScoring(gameId);
          local = await changeLocal((current) => ({ ...current, lease }));
          show(local);
        }
        if (!wrongAccount) setError("");
        failures.current = 0;
        retryAt.current = 0;
      });
    } catch (cause) {
      failures.current++;
      retryAt.current =
        Date.now() + Math.min(60000, 1000 * 2 ** Math.min(failures.current, 6));
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not connect. Saved rounds will retry automatically.",
      );
    } finally {
      running.current = false;
      setSyncing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void changeLocal()
      .then((local) => {
        if (!mounted) return;
        show(local);
        setStorageReady(true);
        setReady(true);
        return refresh.current();
      })
      .catch((cause: unknown) => {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Device storage is unavailable.",
          );
          setReady(true);
        }
      });
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("almostyellow-uno");
      channel.current.onmessage = () => {
        void changeLocal()
          .then(show)
          .catch(() => undefined);
      };
    }
    function connection() {
      setOnline(navigator.onLine);
      retryAt.current = 0;
      if (!navigator.onLine) setVerified(false);
      void refresh.current();
    }
    function foreground() {
      if (document.visibilityState === "visible") connection();
    }
    // Initial connectivity is checked asynchronously alongside IndexedDB.
    queueMicrotask(() => {
      if (mounted) setOnline(navigator.onLine);
    });
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    window.addEventListener("focus", connection);
    document.addEventListener("visibilitychange", foreground);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh.current();
    }, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
      channel.current?.close();
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      window.removeEventListener("focus", connection);
      document.removeEventListener("visibilitychange", foreground);
    };
  }, []);

  const state = data.state;
  const original = state?.games.find(
    (g) =>
      g.id === (state.board.activeGameId ?? state.board.lastFinishedGameId),
  );
  const game: Game | undefined = original ? { ...original } : undefined;
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
    !!game &&
    game.status === "active" &&
    !!data.accountId &&
    data.lease?.gameId === game.id &&
    data.lease.accountId === data.accountId &&
    !data.events.some(
      (e) => e.status === "attention" || e.accountId !== data.accountId,
    );

  async function score(player: Player, delta: 1 | -1) {
    if (!canScore || !data.lease || !data.accountId) return;
    try {
      const next = await saveEvent({
        id: crypto.randomUUID(),
        gameId: game.id,
        leaseId: data.lease.id,
        player,
        delta,
        createdAt: Date.now(),
        accountId: data.accountId,
        status: "pending",
      });
      show(next);
      announce();
      setNotice("");
      void refresh.current();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `${names[player]}'s change was not saved.`,
      );
    }
  }
  async function start() {
    const next = await startUnoGame();
    show(
      await changeLocal((current) => ({
        ...current,
        state: next,
        lease: null,
      })),
    );
    retryAt.current = 0;
    await refresh.current();
    announce();
  }
  async function finish(expected: Game) {
    // Re-read IndexedDB to include points saved by another tab since rendering.
    const local = await changeLocal();
    if (!navigator.onLine || local.events.length)
      throw new Error("Sync all saved rounds before finishing this game.");
    const response = await finishUnoGame(expected.id, expected.version);
    show(
      await changeLocal((current) => ({ ...current, state: response.state })),
    );
    announce();
    return response.finished;
  }
  async function addHistory(input: HistoricGameInput) {
    if (!navigator.onLine) throw new Error("Reconnect to add a historic game.");
    const latest = await addHistoricUnoGame(input);
    show(
      await changeLocal((current) =>
        current.events.length ? current : { ...current, state: latest },
      ),
    );
    announce();
    return latest;
  }
  async function retry(id: string) {
    show(
      await changeLocal((current) => ({
        ...current,
        events: current.events.map((e) =>
          e.id === id ? { ...e, status: "pending", error: undefined } : e,
        ),
      })),
    );
    retryAt.current = 0;
    void refresh.current();
  }
  async function discard(id: string) {
    if (
      !window.confirm(
        "Discard this unsynchronised change? It will not affect shared scores.",
      )
    )
      return;
    show(
      await changeLocal((current) => ({
        ...current,
        events: current.events.filter((e) => e.id !== id),
      })),
    );
    announce();
    retryAt.current = 0;
    void refresh.current();
  }
  async function enablePersistence() {
    const persistent = await navigator.storage.persist();
    setNotice(
      persistent
        ? "Persistent device storage enabled."
        : "Your browser controls storage retention. Keep this browser’s data to protect unsynced rounds.",
    );
  }
  return {
    data,
    state,
    game,
    totals,
    online,
    syncing,
    error,
    notice,
    ready,
    verified,
    canScore,
    score,
    start,
    finish,
    addHistory,
    retry,
    discard,
    enablePersistence,
  };
}
