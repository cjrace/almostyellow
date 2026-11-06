import { afterEach, describe, expect, it, vi } from "vitest";
import {
  countText,
  supportsSegmentation,
  type CountingMethod,
} from "../../src/components/textcount";

afterEach(() => vi.unstubAllGlobals());

describe("Text counting presets", () => {
  // text, unicode words, whitespace words, graphemes, code units, then the
  // graphemes and code units left once spaces, tabs and line breaks go
  const cases: [string, number, number, number, number, number, number][] = [
    ["", 0, 0, 0, 0, 0, 0],
    [" \t\n", 0, 0, 3, 3, 0, 0],
    ["Hello, world!", 2, 2, 13, 13, 12, 12],
    ["one  two\tthree\nfour", 4, 4, 19, 19, 15, 15],
    ["My mother-in-law 👩‍💻", 4, 3, 18, 22, 16, 20],
    ["don't stop", 2, 2, 10, 10, 9, 9],
    ["… !!!", 0, 2, 5, 5, 4, 4],
    ["👨‍👩‍👧‍👦 👍🏽", 0, 2, 3, 16, 2, 15],
    ["e\u0301 café", 2, 2, 6, 7, 5, 6],
    ["你好世界", 2, 1, 4, 4, 4, 4],
    ["a\nb", 2, 2, 3, 3, 2, 2],
    ["a\r\nb", 2, 2, 3, 4, 2, 2],
    ["\r\n", 0, 0, 1, 2, 0, 0],
  ];

  it.each(cases)(
    "counts %j with each method",
    (
      text,
      unicodeWords,
      whitespaceWords,
      graphemes,
      codeUnits,
      graphemesWithoutSpaces,
      codeUnitsWithoutSpaces,
    ) => {
      expect(countText(text, "unicode")).toEqual({
        words: unicodeWords,
        characters: graphemes,
        charactersWithoutSpaces: graphemesWithoutSpaces,
      });
      expect(countText(text, "whitespace")).toEqual({
        words: whitespaceWords,
        characters: graphemes,
        charactersWithoutSpaces: graphemesWithoutSpaces,
      });
      expect(countText(text, "legacy")).toEqual({
        words: whitespaceWords,
        characters: codeUnits,
        charactersWithoutSpaces: codeUnitsWithoutSpaces,
      });
    },
  );

  it("counts a large passage without changing it", () => {
    const text = "café 👩‍💻\n".repeat(10_000);
    expect(countText(text, "unicode")).toEqual({
      words: 10_000,
      characters: 70_000,
      charactersWithoutSpaces: 50_000,
    });
    expect(text.startsWith("café 👩‍💻\n")).toBe(true);
  });

  it.each(["unicode", "whitespace"] as CountingMethod[])(
    "rejects unsupported %s counting without falling back",
    (method) => {
      vi.stubGlobal("Intl", { Segmenter: undefined });
      expect(supportsSegmentation()).toBe(false);
      expect(() => countText("👩‍💻", method)).toThrow(/Intl.Segmenter/);
      expect(() => countText("", method)).toThrow(/Intl.Segmenter/);
      expect(countText("👩‍💻", "legacy")).toEqual({
        words: 1,
        characters: 5,
        charactersWithoutSpaces: 5,
      });
    },
  );
});
