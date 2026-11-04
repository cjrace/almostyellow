import { test, expect } from "@playwright/test";
import { SuitNames, RankNames, getCardName } from "@/components/carddeck";

test.describe("A player of Irish Bingo", () => {
  test("sees no card drawn when the game opens", async ({ page }) => {
    await page.goto("/games/irishbingo");
    await expect(page.locator("#latest_card")).toContainText(
      "No cards drawn yet",
    );
    await expect(page.locator("#calling_card img")).toHaveAttribute(
      "src",
      "/images/cards/back.svg",
    );
  });

  test("can draw the whole deck once each, then shuffle and start again", async ({
    page,
  }) => {
    await page.goto("/games/irishbingo");

    // Test deck to compare against
    const allCardNames: string[] = [];
    SuitNames.forEach((suit) => {
      RankNames.forEach((rank) => {
        const cardName = getCardName(suit, rank);
        allCardNames.push(cardName);
      });
    });

    await test.step("When they draw all 52 cards, each card shows once with its picture and the count", async () => {
      const drawnCards: string[] = [];

      for (let buttonpress = 0; buttonpress < 52; buttonpress++) {
        const buttonpress_reindexed = buttonpress + 1; // adjusting for zero indexing...
        await page.getByRole("button", { name: "Draw a Card" }).click();

        const drawnCard =
          (await page.locator("#latest_card").textContent()) ?? "";
        drawnCards.push(drawnCard);

        // The picture matches the card called out
        const [rank, suit] = drawnCard.toLowerCase().split(" of ");
        await expect(page.locator("#calling_card img")).toHaveAttribute(
          "src",
          `/images/cards/${rank}-${suit}.svg`,
        );

        await expect(page.locator("#card_count")).toContainText(
          `${String(buttonpress_reindexed)} / 52 cards`,
        );
      }

      // Force both lists to alphabetical order to remove randomness
      expect(drawnCards.sort()).toEqual(allCardNames.sort());
    });

    await test.step("Then the deck is exhausted, and focus moves on to Shuffle", async () => {
      await expect(page.getByLabel("Deck Exhausted")).toContainText(
        "Deck Exhausted",
      );
      await expect(
        page.getByRole("button", { name: "Shuffle new deck" }),
      ).toBeFocused();
    });

    await test.step("When they shuffle a new deck, the count resets and they can draw again", async () => {
      await page.getByRole("button", { name: "Shuffle new deck" }).click();
      await expect(page.locator("#card_count")).toContainText("0 / 52 cards");
      // Shuffle disables itself, so focus moves back to the returning Draw button
      await expect(
        page.getByRole("button", { name: "Draw a Card" }),
      ).toBeFocused();

      // Can draw after reshuffle
      await page.getByRole("button", { name: "Draw a Card" }).click();
      await page.getByRole("button", { name: "Draw a Card" }).click();
      await page.getByRole("button", { name: "Draw a Card" }).click();
      await expect(page.locator("#card_count")).toContainText("3 / 52 cards");
    });

    await test.step("When they shuffle after a few cards, the count resets again", async () => {
      await page.getByRole("button", { name: "Shuffle new deck" }).click();
      await expect(page.locator("#card_count")).toContainText("0 / 52 cards");
    });
  });
});
