import type { PublicEvent } from "./engine/views";

export interface TableAlert {
  text: string;
  // "special" covers draw and skip cards; "uno" covers Uno calls. Both use the
  // same centred pop-up, and differ only in how long they stay.
  tone: "special" | "uno";
  // How long it stays on screen
  ms: number;
}

const SPECIAL_MS = 2500;
const SAID_UNO_MS = 4000;
const CAUGHT_MS = 5000;

/** A batch stays up for as long as its longest alert. */
export const alertDuration = (alerts: readonly TableAlert[]) =>
  Math.max(0, ...alerts.map((a) => a.ms));

const plural = (count: number) =>
  `${String(count)} card${count === 1 ? "" : "s"}`;

/**
 * What the latest command should flash up on the table for everyone: cards
 * picked up, missed goes and Uno calls. The screen reader text comes from
 * announceEvents, so this is only for the eyes.
 */
export function tableAlerts(
  events: readonly PublicEvent[],
  names: Record<string, string>,
  me: string,
): TableAlert[] {
  const name = (id: string) => (id === me ? "You" : (names[id] ?? "A player"));
  const alerts: TableAlert[] = [];
  const penalised = new Set<string>();
  for (const event of events)
    if (event.type === "penalty" && event.reason !== "uno")
      penalised.add(event.player);
  for (const event of events) {
    switch (event.type) {
      case "penalty":
        alerts.push(
          event.reason === "uno"
            ? {
                tone: "uno",
                ms: CAUGHT_MS,
                text: `${name(event.player)} ${event.player === me ? "pick" : "picks"} up ${plural(event.count)} for not saying Uno`,
              }
            : {
                tone: "special",
                ms: SPECIAL_MS,
                text: `${name(event.player)} ${event.player === me ? "pick" : "picks"} up ${plural(event.count)}${
                  events.some(
                    (e) => e.type === "skipped" && e.player === event.player,
                  )
                    ? ` and ${event.player === me ? "miss" : "misses"} a go`
                    : ""
                }`,
              },
        );
        break;
      case "skipped":
        // A draw card already says the player misses a go
        if (!penalised.has(event.player))
          alerts.push({
            tone: "special",
            ms: SPECIAL_MS,
            text: `${name(event.player)} ${event.player === me ? "miss" : "misses"} a go`,
          });
        break;
      case "uno-declared":
        if (event.player !== me)
          alerts.push({
            tone: "uno",
            ms: SAID_UNO_MS,
            text: `${name(event.player)} said Uno!`,
          });
        break;
      case "uno-caught":
        alerts.push({
          tone: "uno",
          ms: CAUGHT_MS,
          text: `${name(event.catcher)} caught ${name(event.player)} for not saying Uno`,
        });
        break;
    }
  }
  return alerts;
}
