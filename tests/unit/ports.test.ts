import { describe, expect, test } from "vitest";
import {
  DEFAULT_PORTS,
  MAX_OFFSET,
  OFFSET_STEP,
  findFreeOffset,
  offsetFromEnv,
  portsAt,
} from "../ports.mts";

describe("Ports for a test run or a preview", () => {
  test("start at the usual ones and move together", () => {
    expect(portsAt(0)).toEqual(DEFAULT_PORTS);
    expect(portsAt(20)).toEqual({
      app: 3020,
      firestore: 8100,
      auth: 9119,
      hub: 4420,
      logging: 4520,
    });
  });

  test("come from E2E_PORT_OFFSET, which is 0 when unset or empty", () => {
    expect(offsetFromEnv({})).toBe(0);
    expect(offsetFromEnv({ E2E_PORT_OFFSET: "" })).toBe(0);
    expect(offsetFromEnv({ E2E_PORT_OFFSET: "30" })).toBe(30);
  });

  test.each(["-10", "1.5", "abc", String(MAX_OFFSET + 1)])(
    "refuse an offset of %s",
    (value) => {
      expect(() => offsetFromEnv({ E2E_PORT_OFFSET: value })).toThrow(
        "E2E_PORT_OFFSET",
      );
    },
  );

  test("use the usual ports when nothing is on them", async () => {
    expect(await findFreeOffset(() => Promise.resolve(false))).toBe(0);
  });

  test("move up a step for every busy set, whichever port is taken", async () => {
    const busy = new Set([
      DEFAULT_PORTS.app, // the first set
      portsAt(OFFSET_STEP).firestore, // the second
    ]);
    expect(
      await findFreeOffset((port) => Promise.resolve(busy.has(port))),
    ).toBe(2 * OFFSET_STEP);
  });

  test("give up when every set is taken", async () => {
    expect(await findFreeOffset(() => Promise.resolve(true))).toBeUndefined();
  });
});
