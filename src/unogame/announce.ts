import { colourNames, getUnoCardName } from "./cards";
import type { PublicEvent } from "./engine/views";

const plural = (count: number, word: string) =>
  `${String(count)} ${word}${count === 1 ? "" : "s"}`;

/**
 * Plain sentences for screen readers about what the latest command did.
 * Only public events are given, so nothing here can reveal a hand.
 */
export function announceEvents(
  events: readonly PublicEvent[],
  names: Record<string, string>,
  me: string,
): string {
  const who = (id: string) => (id === me ? "You" : (names[id] ?? "A player"));
  const sentences: string[] = [];
  for (const event of events) {
    switch (event.type) {
      case "played":
        sentences.push(
          `${who(event.player)} played ${getUnoCardName(event.card)}${
            event.card.kind === "wild" || event.card.kind === "wild4"
              ? `, and chose ${colourNames[event.colour].toLowerCase()}`
              : ""
          }.`,
        );
        break;
      case "drew":
        sentences.push(
          `${who(event.player)} drew ${event.count === 1 ? "a card" : plural(event.count, "card")}.`,
        );
        break;
      case "penalty":
        sentences.push(
          event.reason === "uno"
            ? `${who(event.player)} drew ${plural(event.count, "card")} for not saying Uno.`
            : `${who(event.player)} had to draw ${plural(event.count, "card")}.`,
        );
        break;
      case "skipped":
        sentences.push(
          `${who(event.player)} ${event.player === me ? "were" : "was"} skipped.`,
        );
        break;
      case "reversed":
        sentences.push("The direction was reversed.");
        break;
      case "kept":
        sentences.push(`${who(event.player)} kept the card they drew.`);
        break;
      case "nothing-to-draw":
        sentences.push("There was nothing left to draw.");
        break;
      case "uno-declared":
        sentences.push(`${who(event.player)} said Uno.`);
        break;
      case "uno-exposed":
        sentences.push(`${who(event.player)} did not say Uno.`);
        break;
      case "uno-caught":
        sentences.push(
          `${who(event.catcher)} caught ${event.player === me ? "you" : who(event.player)} for Uno.`,
        );
        break;
      case "recycled":
        sentences.push(
          "The discard pile was shuffled back into the draw pile.",
        );
        break;
      case "won":
        sentences.push(`${who(event.player)} won the round.`);
        break;
      case "blocked":
        sentences.push("Nobody can move, so the round ends with no winner.");
        break;
    }
  }
  return sentences.join(" ");
}
