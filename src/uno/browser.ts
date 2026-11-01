import {
  addHistoricUnoGame,
  finishUnoGame,
  openUnoScoring,
  readUnoState,
  readUnoVersion,
  startUnoGame,
  syncUnoEvents,
} from "@/services/uno";
import { changeLocal, saveEvent } from "./storage";
import { createUnoController } from "./controller";

let channel: BroadcastChannel | undefined;
// Construction is side-effect free during server rendering. Browser resources
// are attached only when the first useSyncExternalStore subscriber mounts.
export const unoController = createUnoController(
  { read: () => changeLocal(), change: changeLocal, save: saveEvent },
  {
    account: async () => {
      const response = await fetch("/games/uno-tracker/session", {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          "Could not check your session. Saved rounds will retry automatically.",
        );
      return ((await response.json()) as { uid: string | null }).uid;
    },
    read: readUnoState,
    version: readUnoVersion,
    start: startUnoGame,
    finish: finishUnoGame,
    history: addHistoricUnoGame,
    open: openUnoScoring,
    sync: syncUnoEvents,
  },
  {
    now: () => Date.now(),
    id: () => crypto.randomUUID(),
    online: () => navigator.onLine,
    visible: () => document.visibilityState === "visible",
    lock: (operation) =>
      navigator.locks.request("almostyellow-uno-sync", operation),
    watch: (handlers) => {
      window.addEventListener("online", handlers.connection);
      window.addEventListener("offline", handlers.connection);
      window.addEventListener("focus", handlers.foreground);
      document.addEventListener("visibilitychange", handlers.foreground);
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("almostyellow-uno");
        channel.onmessage = handlers.remote;
      }
      return () => {
        window.removeEventListener("online", handlers.connection);
        window.removeEventListener("offline", handlers.connection);
        window.removeEventListener("focus", handlers.foreground);
        document.removeEventListener("visibilitychange", handlers.foreground);
        channel?.close();
        channel = undefined;
      };
    },
    interval: (callback, ms) => {
      const timer = setInterval(callback, ms);
      return () => {
        clearInterval(timer);
      };
    },
    broadcast: () => {
      channel?.postMessage("changed");
    },
    confirmDiscard: () =>
      window.confirm(
        "Discard this unsynchronised change? It will not affect shared scores.",
      ),
    persist: () => navigator.storage.persist(),
  },
);
