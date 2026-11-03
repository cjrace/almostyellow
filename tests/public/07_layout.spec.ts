import { test, expect } from "@playwright/test";

/* The layout tests set their own window size, so they check the same thing in
   every browser project. */
const phone = { width: 390, height: 844 };
const desktop = { width: 1280, height: 800 };

test.describe("A visitor on a phone", () => {
  test.use({ viewport: phone });

  test("sees a modal centred on the screen", async ({ page }) => {
    await page.goto("/games/irishbingo");
    await page
      .getByRole("button", { name: "Open game instructions modal" })
      .click();

    const dialog = page.locator("[data-modal-content]");
    await expect(dialog).toBeVisible();
    // Let the opening animation finish before measuring
    await page.waitForTimeout(500);

    const box = await dialog.boundingBox();
    const screenWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    if (!box) throw new Error("The modal has no size");
    expect(Math.abs(box.x + box.width / 2 - screenWidth / 2)).toBeLessThan(2);
  });

  test("does not see the Irish Bingo mascot", async ({ page }) => {
    await page.goto("/games/irishbingo");
    await expect(
      page.getByRole("button", { name: "Draw a Card" }),
    ).toBeVisible();
    await expect(page.locator('img[alt="Mr. Tayto"]')).toBeHidden();
  });

  test("sees the Cocktails cards in a single column", async ({ page }) => {
    await page.goto("/cocktails");
    const cards = page.getByRole("heading", { level: 2 });
    await expect(cards.first()).toBeVisible();

    const lefts = await cards.evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().left)),
    );
    expect(new Set(lefts).size).toBe(1);
  });
});

test.describe("A visitor on a desktop", () => {
  test.use({ viewport: desktop });

  test("sees the Irish Bingo mascot", async ({ page }) => {
    await page.goto("/games/irishbingo");
    await expect(page.locator('img[alt="Mr. Tayto"]')).toBeVisible();
  });

  test("sees the Cocktails cards side by side in columns", async ({ page }) => {
    await page.goto("/cocktails");
    const cards = page.getByRole("heading", { level: 2 });
    await expect(cards.first()).toBeVisible();

    const lefts = await cards.evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().left)),
    );
    expect(new Set(lefts).size).toBeGreaterThan(1);
  });
});

test.describe("A player of Snakes and Ladders", () => {
  async function startGame(page: import("@playwright/test").Page) {
    await page.goto("/games/snakesandladders");
    await page.getByLabel("Name of player 1:").fill("Al");
    await page.getByRole("button", { name: "Start game!" }).click();
    await expect(page.getByTestId("board")).toBeVisible();
  }

  test.describe("on a phone", () => {
    test.use({ viewport: phone });

    test("sees a square board above the controls that fits the screen", async ({
      page,
    }) => {
      await startGame(page);

      const board = await page.getByTestId("board").boundingBox();
      const roll = await page
        .getByRole("button", { name: /Roll Dice/ })
        .boundingBox();
      if (!board || !roll) throw new Error("The board or controls are missing");

      expect(Math.abs(board.width - board.height)).toBeLessThan(2);
      expect(board.x).toBeGreaterThanOrEqual(0);
      expect(board.x + board.width).toBeLessThanOrEqual(phone.width);
      expect(board.y + board.height).toBeLessThanOrEqual(roll.y);
    });

    test("can read a name on the board", async ({ page }) => {
      await startGame(page);
      await page.getByRole("button", { name: /Roll Dice/ }).click();
      await expect(page.getByText(/Al moves \d places!/)).toBeVisible();

      const cell = page.getByTestId("board").getByText("Al", { exact: true });
      await expect(cell).toBeVisible();
      // The name sits inside its square instead of spilling out of it
      const fits = await cell.evaluate((el) => {
        const square = el.parentElement;
        if (!square) return false;
        return (
          el.scrollWidth <= square.clientWidth &&
          parseFloat(getComputedStyle(el).fontSize) >= 11
        );
      });
      expect(fits).toBe(true);
    });
  });

  test.describe("on a desktop", () => {
    test.use({ viewport: desktop });

    test("sees a square board beside the controls", async ({ page }) => {
      await startGame(page);

      const board = await page.getByTestId("board").boundingBox();
      const roll = await page
        .getByRole("button", { name: /Roll Dice/ })
        .boundingBox();
      if (!board || !roll) throw new Error("The board or controls are missing");

      expect(Math.abs(board.width - board.height)).toBeLessThan(2);
      expect(roll.x + roll.width).toBeLessThanOrEqual(board.x);
      expect(board.y + board.height).toBeLessThanOrEqual(desktop.height);
    });
  });
});
