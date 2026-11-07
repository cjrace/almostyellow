import { describe, expect, test } from "vitest";
import { secureShuffle } from "@/unogame/shuffle";

describe("The server shuffle", () => {
  test("keeps every item and leaves the input alone", () => {
    const input = Array.from({ length: 108 }, (_, i) => i);
    const copy = [...input];
    const result = secureShuffle(input);
    expect(input).toEqual(copy);
    expect([...result].sort((a, b) => a - b)).toEqual(copy);
  });

  test("does not return the same order twice", () => {
    const input = Array.from({ length: 108 }, (_, i) => i);
    expect(secureShuffle(input)).not.toEqual(secureShuffle(input));
  });

  test("handles empty and single item lists", () => {
    expect(secureShuffle([])).toEqual([]);
    expect(secureShuffle([1])).toEqual([1]);
  });
});
