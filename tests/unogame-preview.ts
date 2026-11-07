// Synthetic table states for the card and table unit tests. They are real
// engine states, dealt with a fixed shuffle, so the views have exactly the
// shape the server publishes. Nothing here is used in play.
import { buildDeck } from "@/unogame/engine/cards";
import {
  playableCards,
  startRound,
  type RoundState,
  type Shuffle,
} from "@/unogame/engine/round";
import { privateView, publicView } from "@/unogame/engine/views";

export type PreviewScenario =
  | "two-players"
  | "ten-players"
  | "long-names"
  | "large-hand"
  | "wild-colour"
  | "catch-uno"
  | "two-cards"
  | "say-uno"
  | "round-over";

export const previewScenarios: { value: PreviewScenario; label: string }[] = [
  { value: "two-players", label: "Two players" },
  { value: "ten-players", label: "Ten players" },
  { value: "long-names", label: "Long names" },
  { value: "large-hand", label: "Large hand" },
  { value: "catch-uno", label: "Catch Uno" },
  { value: "two-cards", label: "Two cards left" },
  { value: "say-uno", label: "Say Uno" },
  { value: "round-over", label: "Round over" },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle: Shuffle = (items) => {
  const random = mulberry32(2026);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const friends = [
  "Cam",
  "Laura",
  "Ben",
  "Aoife",
  "Niamh",
  "Sean",
  "Ciara",
  "Tom",
  "Maeve",
  "Declan",
];
const longNames = [
  "Cam",
  "Bartholomew Montgomery-Featherstonehaugh",
  "Laura",
  "Wolfeschlegelsteinhausenbergerdorff",
  "Aoife",
];

export interface PreviewTable {
  me: string;
  names: Record<string, string>;
  scores: Record<string, number>;
  state: RoundState;
  view: ReturnType<typeof publicView>;
  mine: ReturnType<typeof privateView>;
  announcement: string;
}

export function buildPreview(scenario: PreviewScenario): PreviewTable {
  const count =
    scenario === "two-players" ||
    scenario === "round-over" ||
    scenario === "two-cards" ||
    scenario === "say-uno"
      ? 2
      : scenario === "ten-players"
        ? 10
        : scenario === "long-names"
          ? longNames.length
          : 4;
  const labels = scenario === "long-names" ? longNames : friends;
  const ids = Array.from({ length: count }, (_, i) => `player-${String(i)}`);
  const names = Object.fromEntries(ids.map((id, i) => [id, labels[i]]));
  const scores = Object.fromEntries(ids.map((id, i) => [id, (i * 3) % 5]));
  const state = startRound({ players: ids, startingIndex: 0, shuffle });
  const me = ids[0];

  if (scenario === "large-hand") {
    // Pulls the whole stock into one hand, as after many penalties
    state.hands[me].push(...state.stock.splice(0, state.stock.length - 30));
  }
  if (scenario === "catch-uno") {
    const other = ids[1];
    const spare = state.hands[other].splice(1);
    state.stock.push(...spare);
    state.uno = { player: other, protectedUntil: 0 };
    state.current = 0;
  }
  if (scenario === "two-cards" || scenario === "say-uno") {
    // Keeps a playable card first, so there is a move to make
    const hand = state.hands[me];
    const playable = playableCards(state, me)[0] ?? hand[0];
    const rest = hand.filter((c) => c.id !== playable.id);
    const keep = scenario === "two-cards" ? [playable, rest[0]] : [playable];
    state.stock.push(...hand.filter((c) => !keep.includes(c)));
    state.hands[me] = keep;
    if (scenario === "say-uno") {
      state.uno = { player: me, protectedUntil: 0 };
      state.current = 1;
    }
  }
  if (scenario === "round-over") {
    const spare = state.hands[ids[1]].splice(0);
    state.stock.push(...spare);
    state.phase = "finished";
    state.outcome = { type: "win", winner: ids[1] };
  }
  // Keeps every card somewhere, as the server would
  const total =
    state.stock.length +
    state.discard.length +
    Object.values(state.hands).reduce((sum, hand) => sum + hand.length, 0);
  if (total !== buildDeck().length) throw new Error("Preview lost a card");

  const view = publicView(state);
  return {
    me,
    names,
    scores,
    state,
    view,
    mine: privateView(state, me),
    announcement:
      scenario === "round-over"
        ? `${names[ids[1]]} won the round.`
        : "Your turn.",
  };
}
