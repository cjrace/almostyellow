import { test, expect } from "../playwright";
import { SuitNames, RankNames, getCardName } from "@/components/carddeck";
import { expectGameFits, expectInstructions } from "../gameplay";

test.describe("A player on a phone", { tag: "@phone" }, () => {
  test("Credits Ben and shows the instructions", async ({ page }) => {
    await page.goto("/games/redorblack");

    await expect(
      page.getByRole("link", { name: "A Ben Palmer original" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/BenjaminJPalmer/red-or-black-v1",
    );

    await expectInstructions(page, "Red or Black v1 instructions", [
      "encourage drinking",
    ]);
  });

  test("Draws the whole deck one card at a time", async ({ page }) => {
    await page.goto("/games/redorblack");

    const card = page.locator("main img");
    const remaining = page.locator("#cards_remaining");
    await expect(card).toHaveAttribute("alt", "Face-down card");
    await expect(remaining).toContainText("52 cards remaining");
    await expect(
      page.getByRole("button", { name: "View all drawn cards" }),
    ).toBeDisabled();

    const allCardNames: string[] = [];
    SuitNames.forEach((suit) => {
      RankNames.forEach((rank) => {
        allCardNames.push(getCardName(suit, rank));
      });
    });

    await expectGameFits(page);
    const drawnCards: string[] = [];
    for (let draw = 1; draw <= 52; draw++) {
      await page.getByRole("button", { name: "Draw a card" }).click();
      await expect(remaining).toContainText(
        `${String(52 - draw)} cards remaining`,
      );
      // Only the newest card is shown
      await expect(card).toHaveCount(1);
      drawnCards.push((await card.getAttribute("alt")) ?? "");
      if ([1, 10, 52].includes(draw)) await expectGameFits(page);
    }

    // The alert takes the Draw button's place, and focus moves on to Shuffle
    await expect(
      page.getByRole("button", { name: "Draw a card" }),
    ).toBeHidden();
    await expect(page.getByText("Deck Exhausted")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Shuffle new deck" }),
    ).toBeFocused();

    // The list of drawn cards is in the order they came out
    const viewDrawn = page.getByRole("button", {
      name: "View all drawn cards",
    });
    await viewDrawn.click();
    const drawnList = page.getByRole("dialog", { name: "All drawn cards" });
    await expect(drawnList.getByRole("listitem")).toHaveText(drawnCards);
    await drawnList.getByRole("button", { name: "Close modal" }).click();
    await expect(drawnList).toBeHidden();

    expect(drawnCards.sort()).toEqual(allCardNames.sort());

    await page.getByRole("button", { name: "Shuffle new deck" }).click();
    await expect(remaining).toContainText("52 cards remaining");
    await expect(card).toHaveAttribute("alt", "Face-down card");
    await expect(viewDrawn).toBeDisabled();
    await expectGameFits(page);
    // Shuffle disables itself, so focus moves back to the returning Draw button
    await expect(
      page.getByRole("button", { name: "Draw a card" }),
    ).toBeFocused();

    await page.getByRole("button", { name: "Draw a card" }).click();
    await expect(remaining).toContainText("51 cards remaining");
  });
});
