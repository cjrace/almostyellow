import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Runs the hook's effect directly, as there is no page to render it in
let cleanup: (() => void) | undefined;
vi.mock("react", () => ({
  useEffect: (effect: () => (() => void) | undefined) => {
    cleanup = effect();
  },
}));

import useWakeLock from "@/components/usewakelock";

const release = vi.fn(() => Promise.resolve());
const request = vi.fn(() => Promise.resolve({ release }));

beforeEach(() => {
  cleanup = undefined;
  request.mockClear();
  release.mockClear();
  vi.stubGlobal("navigator", { wakeLock: { request } });
  vi.stubGlobal("document", {
    visibilityState: "visible",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Keeping the screen awake", () => {
  test("asks for a screen lock while active, and lets go when it ends", async () => {
    useWakeLock(true);
    expect(request).toHaveBeenCalledWith("screen");
    await Promise.resolve();
    cleanup?.();
    expect(release).toHaveBeenCalled();
  });

  test("does not ask while inactive", () => {
    useWakeLock(false);
    expect(request).not.toHaveBeenCalled();
  });

  test("does not ask while the page is hidden", () => {
    vi.stubGlobal("document", {
      visibilityState: "hidden",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    useWakeLock(true);
    expect(request).not.toHaveBeenCalled();
  });

  test("a lock granted after the game ended is released at once", async () => {
    useWakeLock(true);
    cleanup?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(release).toHaveBeenCalled();
  });
});
