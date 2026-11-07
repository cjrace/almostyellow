"use client";

import { useEffect } from "react";

// While a game is being played: asks before the page is closed or refreshed,
// so a stray swipe doesn't lose it, and keeps the screen awake where the
// browser allows
export default function useGameInProgress(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);

    let lock: WakeLockSentinel | null = null;
    let leaving = false;
    const keepAwake = () => {
      if (leaving || document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (leaving) {
            // The game ended while the browser was still deciding
            sentinel.release().catch(() => undefined);
          } else {
            lock = sentinel;
          }
        })
        .catch(() => undefined); // Unsupported, or the battery is low
    };
    if ("wakeLock" in navigator) {
      keepAwake();
      // The browser lets go of it when the page is hidden
      document.addEventListener("visibilitychange", keepAwake);
    }

    return () => {
      leaving = true;
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", keepAwake);
      lock?.release().catch(() => undefined);
    };
  }, [active]);
}
