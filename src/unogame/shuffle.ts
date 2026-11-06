import { randomInt } from "node:crypto";
import type { Shuffle } from "./engine/round";

// Fisher-Yates with the operating system's randomness
export const secureShuffle: Shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
