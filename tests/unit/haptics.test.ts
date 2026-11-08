import { afterEach, describe, expect, test, vi } from "vitest";
import { vibrate } from "@/haptics";

function phone(options: { reduced?: boolean; vibrates?: boolean }) {
  const buzz = vi.fn();
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: !!options.reduced }),
    setTimeout,
  });
  vi.stubGlobal("navigator", options.vibrates ? { vibrate: buzz } : {});
  return buzz;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Buzzing a phone", () => {
  test("a browser that can vibrate is given the pattern", () => {
    const buzz = phone({ vibrates: true });
    vibrate([40, 60, 40]);
    expect(buzz).toHaveBeenCalledWith([40, 60, 40]);
  });

  test("nothing buzzes for someone who has asked for less motion", () => {
    const buzz = phone({ vibrates: true, reduced: true });
    vibrate(40);
    expect(buzz).not.toHaveBeenCalled();
  });

  test("it does nothing outside a browser", () => {
    vi.stubGlobal("navigator", undefined);
    expect(() => {
      vibrate(40);
    }).not.toThrow();
  });
});
