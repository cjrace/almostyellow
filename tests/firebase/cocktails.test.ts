import { beforeEach, expect, test } from "vitest";
import { readCocktails } from "@/services/cocktails";
import { cocktaildata, cocktailDocuments } from "./cocktails";
import { resetAndSeed } from "./seed";

// The catalogue moved from the code to Firestore, so check the page gets
// back exactly what was in the code

beforeEach(async () => {
  await resetAndSeed();
});

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);

test("reads back every cocktail exactly as it was in the code", async () => {
  const cocktails = await readCocktails();
  expect([...cocktails].sort(byName)).toEqual([...cocktaildata].sort(byName));
});

test("gives every cocktail its own ID", () => {
  const ids = cocktailDocuments.map((cocktail) => cocktail.id);
  expect(new Set(ids).size).toBe(cocktaildata.length);
});
