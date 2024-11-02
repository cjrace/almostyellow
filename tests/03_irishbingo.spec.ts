import { test, expect } from "@playwright/test";
import { SuitNames, RankNames, getCardName } from "../components/games/card";

test("No card drawn on load", async ({ page }) => {
  await page.goto("/games/irishbingo");
  await expect(page.getByRole("paragraph")).toContainText(
    "0 out of 52 Cards Drawn",
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

  // Check if you click the button 52 times it draws an accurate full deck
  // Bonus check that the counter shows the right text for number of button presses
  for (let buttonpress = 0; buttonpress < 52; buttonpress++) {
    const buttonpress_reindexed = buttonpress + 1; // adjusting for zero indexing...
    await page.getByRole("button", { name: "Draw a Card" }).click();
    await expect(page.getByRole("paragraph")).toContainText(
      `${buttonpress_reindexed} out of 52 Cards Drawn`,
    );
  }

  for (let i = 0; i < allCardNames.length; i++) {
    const card = allCardNames[i];
    const cardElement = await page.waitForSelector(`text=${card}`);
    const cardText = await cardElement.textContent();
    expect(cardText).toBe(card);
  }

  // Button disables after full deck is drawn
  await expect(page.getByLabel("Deck Exhausted")).toContainText(
    "Deck Exhausted",
  );

  // Shuffle a new deck resets
  await page.getByRole("button", { name: "Shuffle new deck" }).click();
  await expect(page.getByRole("paragraph")).toContainText(
    "0 out of 52 Cards Drawn",
  );

  // Can draw after reshuffle
  await page.getByRole("button", { name: "Draw a Card" }).click();
  await page.getByRole("button", { name: "Draw a Card" }).click();
  await page.getByRole("button", { name: "Draw a Card" }).click();
  await expect(page.getByRole("paragraph")).toContainText(
    "3 out of 52 Cards Drawn",
  );

  // Reset works after just a handful of cards
  await page.getByRole("button", { name: "Shuffle new deck" }).click();
  await expect(page.getByRole("paragraph")).toContainText(
    "0 out of 52 Cards Drawn",
  );
});
