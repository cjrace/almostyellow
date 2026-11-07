export type CountingMethod = "unicode" | "whitespace" | "legacy";
export interface TextCounts {
  words: number;
  characters: number;
  charactersWithoutSpaces: number;
}

export function supportsSegmentation(): boolean {
  return typeof Intl.Segmenter === "function";
}

let wordSegmenter: Intl.Segmenter | undefined;
let characterSegmenter: Intl.Segmenter | undefined;

function requireSegmentation() {
  if (!supportsSegmentation()) {
    throw new Error(
      "This counting method needs a browser with Intl.Segmenter support.",
    );
  }
}

export function countUnicodeWords(text: string): number {
  requireSegmentation();
  wordSegmenter ??= new Intl.Segmenter("en-GB", { granularity: "word" });
  let words = 0;
  for (const segment of wordSegmenter.segment(text)) {
    if (segment.isWordLike) words++;
  }
  return words;
}

export function countWhitespaceWords(text: string): number {
  return text.match(/\S+/gu)?.length ?? 0;
}

export function countGraphemes(text: string): number {
  requireSegmentation();
  characterSegmenter ??= new Intl.Segmenter("en-GB", {
    granularity: "grapheme",
  });
  let characters = 0;
  for (const segment of characterSegmenter.segment(text)) {
    if (segment.segment) characters++;
  }
  return characters;
}

export function countCodeUnits(text: string): number {
  return text.length;
}

export const countingMethods = [
  {
    value: "unicode",
    label: "Unicode-aware",
    name: "Unicode-aware",
    needsSegmenter: true,
    words: countUnicodeWords,
    characters: countGraphemes,
  },
  {
    value: "whitespace",
    label: "Whitespace-separated",
    name: "Whitespace-separated",
    needsSegmenter: true,
    words: countWhitespaceWords,
    characters: countGraphemes,
  },
  {
    value: "legacy",
    label: "Legacy string counting",
    name: "Legacy string counting",
    needsSegmenter: false,
    words: countWhitespaceWords,
    characters: countCodeUnits,
  },
] as const;

export function countText(text: string, method: CountingMethod): TextCounts {
  const preset = countingMethods.find((preset) => preset.value === method);
  if (!preset) throw new Error("Unknown counting method.");
  return {
    words: preset.words(text),
    characters: preset.characters(text),
    // Spaces, tabs and line breaks are all left out.
    charactersWithoutSpaces: preset.characters(text.replace(/\s/gu, "")),
  };
}
