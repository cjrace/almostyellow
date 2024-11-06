import { test, expect } from "@playwright/test";
import { SuitNames, RankNames, getCardName } from "@/components/carddeck";

test("No card drawn on load", async ({ page }) => {
  await page.goto("/games/irishbingo");
  await expect(page.locator("#latest_card")).toContainText(
    "No cards drawn yet",
  );
});

test("Gameplay works", async ({ page }) => {
  await page.goto("/games/irishbingo");

  // Test deck to compare against
  const allCardNames: string[] = [];
  SuitNames.forEach((suit) => {
    RankNames.forEach((rank) => {
      const cardName = getCardName(suit, rank);
      allCardNames.push(cardName);
    });
  });

  // Cycle through a full 52 clicks and...
  // 1. Check it draws an accurate full deck (no dupes or missing cards)
  // 2. Check that the counter shows the right text for number of button presses
  const drawnCards: string[] = [];

  for (let buttonpress = 0; buttonpress < 52; buttonpress++) {
    const buttonpress_reindexed = buttonpress + 1; // adjusting for zero indexing...
    await page.getByRole("button", { name: "Draw a Card" }).click();

    const drawnCard = (await page.locator("#latest_card").textContent()) ?? "";
    drawnCards.push(drawnCard);

    await expect(page.locator("#card_count")).toContainText(
      `${buttonpress_reindexed} / 52 cards`,
    );
  }

  // Force both lists to alphabetical order to remove randomness
  expect(drawnCards.sort()).toEqual(allCardNames.sort());

  // Button disables after full deck is drawn
  await expect(page.getByLabel("Deck Exhausted")).toContainText(
    "Deck Exhausted",
  );

  // Shuffle a new deck resets
  await page.getByRole("button", { name: "Shuffle new deck" }).click();
  await expect(page.locator("#card_count")).toContainText("0 / 52 cards");

  // Can draw after reshuffle
  await page.getByRole("button", { name: "Draw a Card" }).click();
  await page.getByRole("button", { name: "Draw a Card" }).click();
  await page.getByRole("button", { name: "Draw a Card" }).click();
  await expect(page.locator("#card_count")).toContainText("3 / 52 cards");

  // Reset works after just a handful of cards
  await page.getByRole("button", { name: "Shuffle new deck" }).click();
  await expect(page.locator("#card_count")).toContainText("0 / 52 cards");
});
