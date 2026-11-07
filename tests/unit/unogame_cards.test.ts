import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDeck, isWild } from "@/unogame/engine/cards";
import {
  getUnoCardImagePath,
  getUnoCardName,
  unoCardBackImagePath,
} from "@/unogame/cards";
import { buildPreview, previewScenarios } from "../unogame-preview";
import { allCardIds } from "@/unogame/engine/round";

const publicDir = join(import.meta.dirname, "..", "..", "public");
const read = (path: string) => readFileSync(join(publicDir, path), "utf8");

describe("Uno card images", () => {
  const deck = buildDeck();
  const paths = [...new Set(deck.map(getUnoCardImagePath))];

  it("has one image for every distinct face, and no strays", () => {
    expect(paths).toHaveLength(54);
    for (const path of paths)
      expect(existsSync(join(publicDir, path))).toBe(true);
    const files = readdirSync(join(publicDir, "images", "uno"));
    expect(files.map((f) => `/images/uno/${f}`).sort()).toEqual(
      [...paths].sort(),
    );
    expect(existsSync(join(publicDir, unoCardBackImagePath))).toBe(true);
  });

  it("titles every image with the card's name, in the 5:7 shape", () => {
    for (const card of deck) {
      const svg = read(getUnoCardImagePath(card));
      expect(svg).toContain(`<title>${getUnoCardName(card)}</title>`);
      expect(svg).toContain('viewBox="0 0 250 350"');
      expect(svg).toContain('role="img"');
    }
  });

  it("spells the colour out on coloured faces, so colour is not the only clue", () => {
    for (const card of deck) {
      if (isWild(card)) continue;
      const svg = read(getUnoCardImagePath(card));
      expect(svg).toContain(`>${card.colour.toUpperCase()}</text>`);
    }
  });

  it("gives every distinct face a distinct name", () => {
    const names = deck.map(getUnoCardName);
    const distinct = new Set(names);
    expect(distinct.size).toBe(54);
    expect(distinct.size).toBe(paths.length);
  });
});

describe("Synthetic table states", () => {
  it.each(previewScenarios.map((s) => s.value))(
    "%s is a real engine state with every card accounted for",
    (scenario) => {
      const preview = buildPreview(scenario);
      expect(allCardIds(preview.state)).toHaveLength(108);
      expect(preview.view.players.map((p) => p.id)).toEqual(
        preview.state.players,
      );
      for (const id of preview.state.players)
        expect(preview.names[id].length).toBeGreaterThan(0);
    },
  );
});
