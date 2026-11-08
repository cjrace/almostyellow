"use client";

import { useEffect } from "react";
import useWakeLock from "@/components/usewakelock";

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

    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [active]);

  useWakeLock(active);
}
