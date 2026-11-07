import { colourNames, getUnoCardName } from "./cards";
import type { PublicEvent, PublicView } from "./engine/views";

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
      case "left":
        sentences.push(`${who(event.player)} left the game.`);
        break;
      case "abandoned":
        sentences.push("The host ended the round.");
        break;
    }
  }
  return sentences.join(" ");
}

/**
 * The live region's text for the table: what the latest command did, then
 * whose turn it is. Starting a round clears the events and every later
 * command adds some, so a playing table with none has just been dealt.
 */
export function announceTable(
  table: {
    view: PublicView;
    events: readonly PublicEvent[];
    names: Record<string, string>;
  },
  me: string,
): string {
  const { view, events, names } = table;
  const playing = view.phase === "playing";
  const happened =
    playing && events.length === 0
      ? "The round has started."
      : announceEvents(events, names, me);
  const turn = !playing
    ? ""
    : view.currentPlayer === me
      ? "It is your turn."
      : `It is ${names[view.currentPlayer] ?? "another player"}'s turn.`;
  return [happened, turn].filter(Boolean).join(" ");
}
