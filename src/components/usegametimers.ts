"use client";

import { useCallback, useEffect, useRef } from "react";

// Restarting or leaving a game must cancel every pending turn callback.
export default function useGameTimers() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);
  useEffect(() => clear, [clear]);
  const after = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
  }, []);
  return { after, clear };
}
