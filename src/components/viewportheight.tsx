"use client";

import { useEffect } from "react";

// Installed Android apps can keep a stale `100dvh` after the phone is turned
// from landscape back to portrait, so the page stays too short and scrolls
// with plenty of room. This publishes the window's real height as
// --app-height, re-measured after every rotation, which cardgame.module.css
// prefers over 100dvh while it is set.
export default function ViewportHeight() {
  useEffect(() => {
    const root = document.documentElement;
    let later: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      root.style.setProperty("--app-height", `${String(window.innerHeight)}px`);
    };
    // The browser reports the new size a little after it rotates
    const settle = () => {
      measure();
      clearTimeout(later);
      later = setTimeout(() => {
        measure();
        later = setTimeout(measure, 500);
      }, 200);
    };
    measure();
    window.addEventListener("resize", settle);
    window.addEventListener("orientationchange", settle);
    window.addEventListener("pageshow", settle);
    document.addEventListener("visibilitychange", settle);
    window.visualViewport?.addEventListener("resize", settle);
    return () => {
      clearTimeout(later);
      window.removeEventListener("resize", settle);
      window.removeEventListener("orientationchange", settle);
      window.removeEventListener("pageshow", settle);
      document.removeEventListener("visibilitychange", settle);
      window.visualViewport?.removeEventListener("resize", settle);
      root.style.removeProperty("--app-height");
    };
  }, []);
  return null;
}
