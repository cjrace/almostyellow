import { afterEach, describe, expect, it, vi } from "vitest";
import { excludeCounterEvent } from "../../src/components/telemetry";

afterEach(() => vi.unstubAllGlobals());

describe("Counter telemetry exclusion", () => {
  it.each(["/tools/word-counter", "/tools/word-counter/"])(
    "drops events while visiting %s",
    (pathname) => {
      vi.stubGlobal("window", {
        location: { pathname, origin: "https://almostyellow.co.uk" },
      });
      expect(
        excludeCounterEvent({ url: "https://almostyellow.co.uk/" }),
      ).toBeNull();
    },
  );

  it("drops delayed counter events after navigating away", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/", origin: "https://almostyellow.co.uk" },
    });
    expect(
      excludeCounterEvent({ url: "/tools/word-counter?method=unicode" }),
    ).toBeNull();
    const event = { url: "/tools", type: "pageview" };
    expect(excludeCounterEvent(event)).toBe(event);
  });
});
