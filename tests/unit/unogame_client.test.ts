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
const { send, NetworkError } = vi.hoisted(() => ({
  send: vi.fn(),
  NetworkError: class NetworkError extends Error {},
}));
vi.mock("@/buzzer/client", () => ({ send, NetworkError }));

const { RESEND_MS, sendUno, watchUnoHand } = await import("@/unogame/client");
const db = {} as Firestore;
const ignore = vi.fn();

beforeEach(() => {
  listeners.length = 0;
  send.mockReset();
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

describe("Sending an Uno command", () => {
  const client = {} as Parameters<typeof sendUno>[0];
  const input = { code: "ABCD", round: "r1" };
  const bodies = () =>
    send.mock.calls.map(
      (call) => (call as unknown[])[2] as { commandId: string },
    );

  test("an answer within the wait sends nothing more", async () => {
    send.mockResolvedValue({ ok: true });
    await sendUno(client, "draw", input);
    await vi.advanceTimersByTimeAsync(RESEND_MS * 2);
    expect(send).toHaveBeenCalledOnce();
  });

  test("no answer after the wait sends the same command again, and the first answer wins", async () => {
    let answerFirst: () => void = ignore;
    send.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          answerFirst = resolve;
        }),
    );
    send.mockImplementationOnce(() => Promise.resolve());
    const result = sendUno(client, "play", input);
    await vi.advanceTimersByTimeAsync(RESEND_MS - 1);
    expect(send).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(2);
    await result;
    expect(bodies()[0].commandId).toBe(bodies()[1].commandId);
    // The slow first copy answering later changes nothing
    answerFirst();
    await vi.advanceTimersByTimeAsync(RESEND_MS * 4);
    expect(send).toHaveBeenCalledTimes(2);
  });

  test("a failure to connect is retried at once with the same command id", async () => {
    send.mockRejectedValueOnce(new NetworkError("offline"));
    send.mockResolvedValueOnce({ ok: true });
    await sendUno(client, "keep", input);
    expect(send).toHaveBeenCalledTimes(2);
    expect(bodies()[0].commandId).toBe(bodies()[1].commandId);
  });

  test("it only fails, with the same message as before, when both attempts get no answer", async () => {
    send.mockRejectedValue(new NetworkError("offline"));
    await expect(sendUno(client, "draw", input)).rejects.toThrow(
      "Could not reach the table. Check your connection, then look at the table before trying again.",
    );
    expect(send).toHaveBeenCalledTimes(2);
  });

  test("a slow first attempt that fails still waits for the second", async () => {
    let failFirst: (error: Error) => void = ignore;
    send.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          failFirst = reject;
        }),
    );
    send.mockImplementationOnce(() => Promise.resolve());
    const result = sendUno(client, "draw", input);
    await vi.advanceTimersByTimeAsync(RESEND_MS);
    failFirst(new NetworkError("timed out"));
    await expect(result).resolves.toBeUndefined();
  });

  test("an answer from the server, such as a refusal, is passed on and never repeated", async () => {
    send.mockRejectedValue(new Error("It is not your turn."));
    await expect(sendUno(client, "play", input)).rejects.toThrow(
      "It is not your turn.",
    );
    await vi.advanceTimersByTimeAsync(RESEND_MS * 2);
    expect(send).toHaveBeenCalledOnce();
  });
});
