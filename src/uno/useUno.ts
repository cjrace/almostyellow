"use client";

import { useSyncExternalStore } from "react";
import { unoController } from "./browser";
import { initialSnapshot, selectUno } from "./controller";

const serverSnapshot = () => initialSnapshot;
export function useUno() {
  const snapshot = useSyncExternalStore(
    unoController.subscribe,
    unoController.getSnapshot,
    serverSnapshot,
  );
  return {
    ...snapshot,
    ...selectUno(snapshot),
    score: unoController.score,
    start: unoController.start,
    finish: unoController.finish,
    addHistory: unoController.addHistory,
    editHistory: unoController.editHistory,
    deleteHistory: unoController.deleteHistory,
    retry: unoController.retry,
    discard: unoController.discard,
    enablePersistence: unoController.enablePersistence,
  };
}
