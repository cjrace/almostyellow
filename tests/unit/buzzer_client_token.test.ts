import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("firebase/app", () => ({ getApps: () => [], initializeApp: vi.fn() }));
vi.mock("firebase/auth", () => ({
  browserLocalPersistence: {},
  connectAuthEmulator: vi.fn(),
  getAuth: vi.fn(),
  initializeAuth: vi.fn(),
  signInWithCustomToken: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({}));

const { NetworkError, TOKEN_WAIT_MS, send, warmToken } =
  await import("@/buzzer/client");

const fetchMock = vi.fn();
const clientWith = (getIdToken: () => Promise<string>) =>
  ({ auth: { currentUser: { getIdToken } } }) as unknown as Parameters<
    typeof send
  >[0];

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("The sign-in token when sending a command", () => {
  test("a ready token is sent with the command", async () => {
    await send(
      clientWith(() => Promise.resolve("tok")),
      "draw",
      { code: "A" },
    );
    const init = fetchMock.mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  test("a refresh that stalls counts as no answer, so the command can be resent", async () => {
    const stalled = clientWith(() => new Promise<string>(() => undefined));
    const result = expect(
      send(stalled, "draw", { code: "A" }),
    ).rejects.toBeInstanceOf(NetworkError);
    await vi.advanceTimersByTimeAsync(TOKEN_WAIT_MS);
    await result;
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a refresh that fails counts as no answer too", async () => {
    const failing = clientWith(() => Promise.reject(new Error("offline")));
    await expect(send(failing, "draw", { code: "A" })).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  test("warming the token never throws", async () => {
    await expect(
      warmToken(clientWith(() => Promise.reject(new Error("offline")))),
    ).resolves.toBeUndefined();
  });
});
