"use client";

import { useEffect } from "react";

// Keeps the screen awake while `active`, where the browser allows, so a phone
// does not dim and lock while the player waits for their turn
export default function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    let lock: WakeLockSentinel | null = null;
    let leaving = false;
    const keepAwake = () => {
      if (leaving || document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (leaving) {
            // It ended while the browser was still deciding
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
      document.removeEventListener("visibilitychange", keepAwake);
      lock?.release().catch(() => undefined);
    };
  }, [active]);
}
