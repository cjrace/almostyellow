import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Firestore } from "firebase/firestore";

interface Listener {
  next: (snapshot: { exists: () => boolean; data: () => unknown }) => void;
  error: () => void;
  stop: ReturnType<typeof vi.fn>;
}
const listeners: Listener[] = [];

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => path.join("/"),
  onSnapshot: (
    _ref: string,
    next: Listener["next"],
    error: Listener["error"],
  ) => {
    const stop = vi.fn();
    listeners.push({ next, error, stop });
    return stop;
  },
}));
vi.mock("@/buzzer/client", () => ({ send: vi.fn(), NetworkError: Error }));

const { watchUnoHand } = await import("@/unogame/client");
const db = {} as Firestore;
const ignore = vi.fn();

beforeEach(() => {
  listeners.length = 0;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Watching a player's Uno hand", () => {
  test("a missing hand is null, and an arriving one is passed on", () => {
    const hands: unknown[] = [];
    watchUnoHand(db, "ABCD", "p1", (hand) => hands.push(hand));
    listeners[0].next({ exists: () => false, data: () => undefined });
    listeners[0].next({ exists: () => true, data: () => ({ round: "r1" }) });
    expect(hands).toEqual([null, { round: "r1" }]);
  });

  test("a failed listener starts again, waiting longer each time", () => {
    watchUnoHand(db, "ABCD", "p1", ignore);
    listeners[0].error();
    vi.advanceTimersByTime(999);
    expect(listeners).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(listeners).toHaveLength(2);
    listeners[1].error();
    vi.advanceTimersByTime(1999);
    expect(listeners).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(listeners).toHaveLength(3);
  });

  test("a hand arriving resets the wait", () => {
    watchUnoHand(db, "ABCD", "p1", ignore);
    listeners[0].error();
    vi.advanceTimersByTime(1000);
    listeners[1].next({ exists: () => false, data: () => undefined });
    listeners[1].error();
    vi.advanceTimersByTime(1000);
    expect(listeners).toHaveLength(3);
  });

  test("stopping cancels a pending retry and the live listener", () => {
    const stop = watchUnoHand(db, "ABCD", "p1", ignore);
    listeners[0].error();
    stop();
    vi.advanceTimersByTime(60_000);
    expect(listeners).toHaveLength(1);

    const again = watchUnoHand(db, "ABCD", "p1", ignore);
    again();
    expect(listeners[1].stop).toHaveBeenCalledOnce();
  });
});
