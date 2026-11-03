import { test, expect, type Page } from "@playwright/test";

/* The layout tests set their own window size, so they check the same thing in
   every browser project. */
const phone = { width: 390, height: 844 };
const smallPhone = { width: 320, height: 640 };
const desktop = { width: 1280, height: 800 };

// Whether the page is taller than the window
function pageScrolls(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
}

async function startBoomBoomPirate(page: Page, ropes: number) {
  await page.goto("/games/boomboompirate");
  await page.getByLabel("Number of ropes").fill(ropes.toString());
  await page.getByRole("button", { name: "Start Game" }).click();
  const buttons = page.getByRole("button", { name: /^Rope \d+$/ });
  await expect(buttons).toHaveCount(ropes);
  return buttons;
}

test.describe("A visitor on a small phone", () => {
  test.use({ viewport: smallPhone });

  test("can read and tap all 50 ropes in Boom Boom Pirate", async ({
    page,
  }) => {
    const ropes = await startBoomBoomPirate(page, 50);

    // No label is cut short with an ellipsis, and every rope is big enough to
    // tap. With 50 the ropes may scroll within their grid, but the page doesn't
    const sizes = await ropes.evaluateAll((buttons) =>
      buttons.map((button) => {
        const label = button.querySelector(".mantine-Button-label");
        return {
          cut: !label || label.scrollWidth > label.clientWidth,
          height: button.getBoundingClientRect().height,
        };
      }),
    );
    expect(sizes.filter((size) => size.cut)).toHaveLength(0);
    expect(
      Math.min(...sizes.map((size) => size.height)),
    ).toBeGreaterThanOrEqual(44);
    expect(await pageScrolls(page)).toBe(false);
  });

  test("sees the Irish Bingo buttons at the bottom of the screen", async ({
    page,
  }) => {
    await page.goto("/games/irishbingo");
    const shuffle = await page
      .getByRole("button", { name: "Shuffle new deck" })
      .boundingBox();
    if (!shuffle) throw new Error("The shuffle button is missing");

    expect(await pageScrolls(page)).toBe(false);
    expect(shuffle.y + shuffle.height).toBeGreaterThan(smallPhone.height - 32);
  });

  test("sees the whole Uno tracker without scrolling", async ({ page }) => {
    await page.goto("/games/uno-tracker");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Uno tracker",
    );
    expect(await pageScrolls(page)).toBe(false);
  });
});

test.describe("A visitor on a phone", () => {
  test.use({ viewport: phone });

  test("sees a modal centred on the screen", async ({ page }) => {
    await page.goto("/games/irishbingo");
    await page
      .getByRole("button", { name: "Open game instructions modal" })
      .click();

    const dialog = page.locator("[data-modal-content]");
    await expect(dialog).toBeVisible();
    const screenWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    // Keep checking until the opening animation has finished
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox();
        if (!box) return Infinity;
        return Math.abs(box.x + box.width / 2 - screenWidth / 2);
      })
      .toBeLessThan(2);
  });

  test("does not see the Irish Bingo mascot", async ({ page }) => {
    await page.goto("/games/irishbingo");
    await expect(
      page.getByRole("button", { name: "Draw a Card" }),
    ).toBeVisible();
    await expect(page.locator('img[alt="Mr. Tayto"]')).toBeHidden();
  });

  test("sees a big Irish Bingo card with the buttons at the bottom", async ({
    page,
  }) => {
    await page.goto("/games/irishbingo");
    const card = await page.locator("#calling_card img").boundingBox();
    const shuffle = await page
      .getByRole("button", { name: "Shuffle new deck" })
      .boundingBox();
    if (!card || !shuffle) throw new Error("The card or buttons are missing");

    expect(await pageScrolls(page)).toBe(false);
    expect(card.height).toBeGreaterThan(phone.height * 0.4);
    expect(shuffle.y + shuffle.height).toBeGreaterThan(phone.height - 32);
  });

  test("sees the Boom Boom Pirate ropes fill the screen", async ({ page }) => {
    const ropes = await startBoomBoomPirate(page, 20);
    const restart = await page
      .getByRole("button", { name: "Restart Game" })
      .boundingBox();
    if (!restart) throw new Error("The restart button is missing");

    expect(await pageScrolls(page)).toBe(false);
    expect(restart.y + restart.height).toBeGreaterThan(phone.height - 40);
    const heights = await ropes.evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height),
    );
    expect(Math.min(...heights)).toBeGreaterThan(60);
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

  test("sees the whole Uno tracker without scrolling", async ({ page }) => {
    await page.goto("/games/uno-tracker");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Uno tracker",
    );
    expect(await pageScrolls(page)).toBe(false);
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

  test("sees the Boom Boom Pirate ropes fill the screen", async ({ page }) => {
    await startBoomBoomPirate(page, 5);
    const restart = await page
      .getByRole("button", { name: "Restart Game" })
      .boundingBox();
    if (!restart) throw new Error("The restart button is missing");

    expect(await pageScrolls(page)).toBe(false);
    expect(restart.y + restart.height).toBeGreaterThan(desktop.height - 40);
  });
});

test.describe("A player of Snakes and Ladders", () => {
  async function startGame(page: Page, players = 2) {
    await page.goto("/games/snakesandladders");
    await page.getByLabel("Number of Players").fill(players.toString());
    await page.getByLabel("Name of player 1:").fill("Al");
    await page.getByRole("button", { name: "Start game!" }).click();
    await expect(page.getByTestId("board")).toBeVisible();
  }

  // The board and the Roll button, which should be fully on screen
  async function boardAndRoll(page: Page) {
    const board = await page.getByTestId("board").boundingBox();
    const roll = await page
      .getByRole("button", { name: /Roll Dice/ })
      .boundingBox();
    if (!board || !roll) throw new Error("The board or controls are missing");
    return { board, roll };
  }

  for (const [where, viewport] of [
    ["a phone", phone],
    ["a small phone", smallPhone],
    ["a desktop", desktop],
  ] as const) {
    test.describe(`on ${where}`, () => {
      test.use({ viewport });

      test("sees the whole game without scrolling, even with 10 players", async ({
        page,
      }) => {
        await startGame(page, 10);
        const { board, roll } = await boardAndRoll(page);

        expect(await pageScrolls(page)).toBe(false);
        expect(Math.abs(board.width - board.height)).toBeLessThan(2);
        expect(board.y + board.height).toBeLessThanOrEqual(viewport.height);
        expect(roll.y + roll.height).toBeLessThanOrEqual(viewport.height);
      });

      test("sees how far they move without the game moving about", async ({
        page,
      }) => {
        await startGame(page);
        const before = await boardAndRoll(page);
        await page.getByRole("button", { name: /Roll Dice/ }).click();
        await expect(page.getByRole("status")).toHaveText(
          /^Al moves \d places?$/,
        );

        const after = await boardAndRoll(page);
        expect(after.board).toEqual(before.board);
        expect(after.roll.y).toBe(before.roll.y);
      });
    });
  }

  test.describe("on a phone", () => {
    test.use({ viewport: phone });

    test("sees a square board above the controls that fits the screen", async ({
      page,
    }) => {
      await startGame(page);
      const { board, roll } = await boardAndRoll(page);

      expect(board.x).toBeGreaterThanOrEqual(0);
      expect(board.x + board.width).toBeLessThanOrEqual(phone.width);
      expect(board.y + board.height).toBeLessThanOrEqual(roll.y);
    });

    test("can open the list of every player", async ({ page }) => {
      await startGame(page, 10);
      await expect(page.getByTestId("turn")).toContainText("Al's turn");

      await page.getByRole("button", { name: "Players" }).click();
      const drawer = page.getByRole("dialog", { name: "Players" });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByText(/^Player \d+$/)).toHaveCount(9);
      await expect(drawer.getByText("Al", { exact: true })).toBeVisible();
      await expect(
        drawer.getByRole("button", { name: "Restart Game" }),
      ).toBeVisible();
    });

    test("can read a name on the board", async ({ page }) => {
      await startGame(page);
      await page.getByRole("button", { name: /Roll Dice/ }).click();
      await expect(page.getByRole("status")).toHaveText(/^Al moves/);

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
      const { board, roll } = await boardAndRoll(page);

      expect(Math.abs(board.width - board.height)).toBeLessThan(2);
      expect(roll.x + roll.width).toBeLessThanOrEqual(board.x);
    });
  });
});
