import { afterEach, describe, expect, it, vi } from "vitest";
import {
  countText,
  supportsSegmentation,
  type CountingMethod,
} from "../../src/lib/text-count";

afterEach(() => vi.unstubAllGlobals());

describe("Text counting presets", () => {
  const cases: [string, number, number, number, number][] = [
    ["", 0, 0, 0, 0],
    [" \t\n", 0, 0, 3, 3],
    ["Hello, world!", 2, 2, 13, 13],
    ["one  two\tthree\nfour", 4, 4, 19, 19],
    ["My mother-in-law 👩‍💻", 4, 3, 18, 22],
    ["don't stop", 2, 2, 10, 10],
    ["… !!!", 0, 2, 5, 5],
    ["👨‍👩‍👧‍👦 👍🏽", 0, 2, 3, 16],
    ["e\u0301 café", 2, 2, 6, 7],
    ["你好世界", 2, 1, 4, 4],
    ["a\nb", 2, 2, 3, 3],
    ["a\r\nb", 2, 2, 3, 4],
    ["\r\n", 0, 0, 1, 2],
  ];

  it.each(cases)(
    "counts %j with each method",
    (text, unicodeWords, whitespaceWords, graphemes, codeUnits) => {
      expect(countText(text, "unicode")).toEqual({
        words: unicodeWords,
        characters: graphemes,
      });
      expect(countText(text, "whitespace")).toEqual({
        words: whitespaceWords,
        characters: graphemes,
      });
      expect(countText(text, "legacy")).toEqual({
        words: whitespaceWords,
        characters: codeUnits,
      });
    },
  );

  it("counts a large passage without changing it", () => {
    const text = "café 👩‍💻\n".repeat(10_000);
    expect(countText(text, "unicode")).toEqual({
      words: 10_000,
      characters: 70_000,
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
      expect(countText("👩‍💻", "legacy")).toEqual({ words: 1, characters: 5 });
    },
  );
});
