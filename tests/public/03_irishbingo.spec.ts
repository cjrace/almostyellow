import { test, expect } from "../playwright";
import { SuitNames, RankNames, getCardName } from "@/components/carddeck";
import { expectGameFits, expectInstructions } from "../gameplay";

test.describe("A player on a phone", { tag: "@phone" }, () => {
  test.describe("A player of Irish Bingo", () => {
    test("sees no card drawn when the game opens", async ({ page }) => {
      await page.goto("/games/irishbingo");
      await expectInstructions(page, "Irish Bingo instructions");
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

      await expectGameFits(page);
      const drawnCards: string[] = [];

      // Test deck to compare against
      const allCardNames: string[] = [];
      SuitNames.forEach((suit) => {
        RankNames.forEach((rank) => {
          const cardName = getCardName(suit, rank);
          allCardNames.push(cardName);
        });
      });

      await test.step("When they draw all 52 cards, each card shows once with its picture and the count", async () => {
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
          if ([1, 10, 36, 52].includes(buttonpress_reindexed))
            await expectGameFits(page);
        }

        // Force both lists to alphabetical order to remove randomness
        expect([...drawnCards].sort()).toEqual(allCardNames.sort());
      });

      await test.step("Then the deck is exhausted, and focus moves on to Shuffle", async () => {
        await expect(page.getByLabel("Deck Exhausted")).toContainText(
          "Deck Exhausted",
        );
        await expect(
          page.getByRole("button", { name: "Shuffle new deck" }),
        ).toBeFocused();
      });

      await test.step("Then the card history retains the order drawn", async () => {
        await expect(
          page.getByRole("button", { name: "Has someone won?" }),
        ).toBeInViewport({ ratio: 1 });
        await page
          .getByRole("button", { name: "View all called cards" })
          .click();
        const dialog = page.getByRole("dialog", { name: "All called cards" });
        await expect(dialog.getByRole("listitem")).toHaveText(drawnCards);
        await dialog.getByRole("button", { name: "Close modal" }).click();
        await expect(dialog).toBeHidden();
      });

      await test.step("When they shuffle a new deck, the count resets and they can draw again", async () => {
        await page.getByRole("button", { name: "Shuffle new deck" }).click();
        await expect(page.locator("#card_count")).toContainText("0 / 52 cards");
        await expectGameFits(page);
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
});
