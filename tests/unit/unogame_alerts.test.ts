import { describe, expect, test } from "vitest";
import { alertDuration, tableAlerts } from "@/unogame/alerts";
import type { PublicEvent } from "@/unogame/engine/views";

const names = { a: "Cam", b: "Laura" };

describe("Table alerts", () => {
  test("a draw card says who picks up, and the skip is not repeated", () => {
    const events: PublicEvent[] = [
      { type: "penalty", player: "b", reason: "draw2", count: 2 },
      { type: "skipped", player: "b" },
    ];
    expect(tableAlerts(events, names, "a")).toEqual([
      {
        tone: "special",
        ms: 2500,
        text: "Laura picks up 2 cards and misses a go",
      },
    ]);
  });

  test("speaks to you in the second person", () => {
    const events: PublicEvent[] = [
      { type: "penalty", player: "a", reason: "wild4", count: 4 },
    ];
    expect(tableAlerts(events, names, "a")[0].text).toBe("You pick up 4 cards");
  });

  test("a skip on its own and Uno calls are shown", () => {
    expect(
      tableAlerts([{ type: "skipped", player: "a" }], names, "a")[0].text,
    ).toBe("You miss a go");
    expect(
      tableAlerts([{ type: "uno-declared", player: "b" }], names, "a"),
    ).toEqual([{ tone: "uno", ms: 4000, text: "Laura said Uno!" }]);
    expect(
      tableAlerts([{ type: "uno-declared", player: "a" }], names, "a"),
    ).toEqual([]);
  });

  test("Uno calls stay up longer than other pop-ups, and a batch uses its longest", () => {
    const caught = tableAlerts(
      [{ type: "uno-caught", catcher: "a", player: "b" }],
      names,
      "a",
    );
    expect(alertDuration(caught)).toBe(5000);
    const mixed = tableAlerts(
      [
        { type: "uno-declared", player: "b" },
        { type: "skipped", player: "a" },
      ],
      names,
      "a",
    );
    expect(alertDuration(mixed)).toBe(4000);
    expect(alertDuration([])).toBe(0);
  });
});
