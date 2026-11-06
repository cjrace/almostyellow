import { test, expect, type Page } from "../playwright";

const desktop = { width: 1280, height: 800 };

for (const viewport of [desktop, { width: 1366, height: 650 }]) {
  test.describe(
    `A visitor with a ${viewport.width.toString()} by ${viewport.height.toString()} desktop window`,
    { tag: "@desktop" },
    () => {
      test.use({ viewport });

      test("sees all seven games and their Play buttons without scrolling", async ({
        page,
      }) => {
        await page.goto("/games");
        const play = page.getByRole("link", { name: /^Play / });
        await expect(play).toHaveCount(7);
        for (const button of await play.all()) {
          await expect(button).toBeInViewport({ ratio: 1 });
        }
        expect(await pageScrolls(page)).toBe(false);
      });

      test("sees the Irish Bingo mascot and controls together in the centre", async ({
        page,
      }) => {
        await page.goto("/games/irishbingo");
        const mascot = await page.locator('img[alt="Mr. Tayto"]').boundingBox();
        const card = await page.locator("#calling_card img").boundingBox();
        const draw = await page
          .getByRole("button", { name: "Draw a card" })
          .boundingBox();
        if (!mascot || !card || !draw)
          throw new Error("The mascot, card or controls are missing");

        // The visible game forms one centred group, rather than sitting at
        // opposite sides of a wide screen with an empty column between them.
        const left = Math.min(mascot.x, draw.x);
        const right = Math.max(mascot.x + mascot.width, draw.x + draw.width);
        expect(Math.abs((left + right) / 2 - viewport.width / 2)).toBeLessThan(
          40,
        );
        expect(card.x - (mascot.x + mascot.width)).toBeLessThan(160);
        expect(right - left).toBeLessThan(900);
        await expect(
          page.getByRole("button", { name: "Shuffle new deck" }),
        ).toBeInViewport({ ratio: 1 });
        expect(await pageScrolls(page)).toBe(false);
      });
    },
  );
}

// Whether the page is taller than the window
function pageScrolls(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
}

async function expectAtContentBottom(
  page: Page,
  control: { y: number; height: number },
) {
  // Screen-filling controls sit above the permanent confetti gap.
  const bottom = await page
    .locator(".site-frame")
    .evaluate(
      (element) =>
        innerHeight -
        Number.parseFloat(getComputedStyle(element).paddingBottom),
    );
  expect(control.y + control.height).toBeGreaterThan(bottom - 24);
  expect(control.y + control.height).toBeLessThanOrEqual(bottom + 1);
}

async function expectMatchingCocktailRows(page: Page) {
  const cards = page.getByTestId("cocktail-card");
  await expect(cards.first()).toBeVisible();
  const boxes = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return {
        top: Math.round(box.top),
        bottom: box.bottom,
        height: box.height,
      };
    }),
  );
  const rows = Map.groupBy(boxes, (box) => box.top);
  expect([...rows.values()].some((row) => row.length > 1)).toBe(true);
  for (const row of rows.values()) {
    expect(
      Math.max(...row.map((box) => box.bottom)) -
        Math.min(...row.map((box) => box.bottom)),
    ).toBeLessThan(2);
    expect(
      Math.max(...row.map((box) => box.height)) -
        Math.min(...row.map((box) => box.height)),
    ).toBeLessThan(2);
  }
  // Different recipes can make different rows taller; only a row's own
  // cards need to match each other.
  expect(
    new Set(boxes.map((box) => Math.round(box.height))).size,
  ).toBeGreaterThan(1);
}

async function startBoomBoomPirate(page: Page, ropes: number) {
  await page.goto("/games/boomboompirate");
  await page.getByLabel("Number of ropes").fill(ropes.toString());
  await page.getByRole("button", { name: "Start Game" }).click();
  const buttons = page.getByRole("button", { name: /^Rope \d+$/ });
  await expect(buttons).toHaveCount(ropes);
  return buttons;
}

test.describe("A visitor on a phone", { tag: "@phone" }, () => {
  test("sees full-width Play buttons of the same size below each card's content", async ({
    page,
  }) => {
    await page.goto("/games");
    const cards = page.locator("main article");
    await expect(cards).toHaveCount(7);
    await expect(cards.getByRole("heading", { level: 2 })).toHaveText([
      "Irish Bingo",
      "Snakes and Ladders",
      "Suits",
      "Uno tracker",
      "Red or Black v1",
      "Boom Boom Pirate",
      "Quiz buzzer",
    ]);

    for (const scheme of ["dark", "light"]) {
      await page.evaluate((colourScheme) => {
        document.documentElement.setAttribute(
          "data-mantine-color-scheme",
          colourScheme,
        );
      }, scheme);
      const sizes = [];
      for (const card of await cards.all()) {
        const button = card.getByRole("link", { name: /^Play / });
        const cardBox = await card.boundingBox();
        const buttonBox = await button.boundingBox();
        const imageBox = await card.locator("img").boundingBox();
        const textBox = await card.locator("p").boundingBox();
        if (!cardBox || !buttonBox || !imageBox || !textBox)
          throw new Error("A game card's content is missing");
        expect(buttonBox.y).toBeGreaterThanOrEqual(
          Math.max(imageBox.y + imageBox.height, textBox.y + textBox.height),
        );
        expect(cardBox.width - buttonBox.width).toBeLessThanOrEqual(32);
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
        sizes.push({ width: buttonBox.width, height: buttonBox.height });
      }
      expect(new Set(sizes.map((size) => size.width)).size).toBe(1);
      expect(new Set(sizes.map((size) => size.height)).size).toBe(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
      ).toBe(false);
    }
  });

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
    await expectAtContentBottom(page, shuffle);
  });

  // A heading that wraps takes height the game needs
  for (const game of [
    "boomboompirate",
    "irishbingo",
    "redorblack",
    "snakesandladders",
    "suits",
    "uno-tracker",
  ]) {
    test(`sees the ${game} heading on one line`, async ({ page }) => {
      await page.goto(`/games/${game}`);
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible();
      const lines = await heading.evaluate(
        (el) =>
          el.getBoundingClientRect().height /
          parseFloat(getComputedStyle(el).lineHeight),
      );
      expect(Math.round(lines)).toBe(1);
    });
  }
});

test.describe("A visitor on a phone", { tag: "@phone" }, () => {
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

  test("sees Mr. Tayto calling the Irish Bingo cards beside the card name", async ({
    page,
  }) => {
    await page.goto("/games/irishbingo");
    const caller = page.getByTestId("caller-mascot");
    await expect(caller).toBeVisible();
    // The big Mr. Tayto from wider screens stays hidden
    await expect(page.locator('img[alt="Mr. Tayto"]')).toBeHidden();

    // He stands to the left of the card name, in the same row
    const mascot = await caller.boundingBox();
    const name = await page.locator("#latest_card").boundingBox();
    if (!mascot || !name) throw new Error("Mr. Tayto or the name is missing");
    expect(mascot.x + mascot.width).toBeLessThan(name.x);
    expect(name.y).toBeGreaterThan(mascot.y);
    expect(name.y).toBeLessThan(mascot.y + mascot.height);
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
    const table = await page.locator("#calling_card").boundingBox();
    if (!table) throw new Error("The card area is missing");
    // The card fills the available height or width while preserving its shape.
    expect(
      Math.max(card.height / table.height, card.width / table.width),
    ).toBeGreaterThan(0.9);
    await expectAtContentBottom(page, shuffle);
  });

  test("sees the Boom Boom Pirate ropes fill the screen", async ({ page }) => {
    const ropes = await startBoomBoomPirate(page, 20);
    const restart = await page
      .getByRole("button", { name: "Restart Game" })
      .boundingBox();
    if (!restart) throw new Error("The restart button is missing");

    expect(await pageScrolls(page)).toBe(false);
    await expectAtContentBottom(page, restart);
    const heights = await ropes.evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height),
    );
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
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

test.describe("A visitor on a desktop", { tag: "@desktop" }, () => {
  test.use({ viewport: desktop });

  for (const game of ["redorblack", "suits"]) {
    test(`can start ${game} with cards and controls on screen`, async ({
      page,
    }) => {
      await page.goto(`/games/${game}`);
      if (game === "suits")
        await page
          .getByRole("button", { name: "Start game", exact: true })
          .click();
      const cards = page.locator("main img:visible");
      await expect(cards).toHaveCount(game === "suits" ? 4 : 1);
      for (const card of await cards.all())
        await expect(card).toBeInViewport({ ratio: 1 });
      await expect(
        page.getByRole("button", {
          name: game === "suits" ? "Reveal four cards" : "Draw a card",
        }),
      ).toBeInViewport({ ratio: 1 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }

  test("sees the big Irish Bingo mascot beside the card", async ({ page }) => {
    await page.goto("/games/irishbingo");
    await expect(page.locator('img[alt="Mr. Tayto"]')).toBeVisible();
    await expect(page.getByTestId("caller-mascot")).toBeHidden();
  });

  test("sees the Cocktails cards side by side in columns", async ({ page }) => {
    await page.goto("/cocktails");
    const cards = page.getByRole("heading", { level: 2 });
    await expect(cards.first()).toBeVisible();

    const lefts = await cards.evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().left)),
    );
    expect(new Set(lefts).size).toBeGreaterThan(1);
    await expectMatchingCocktailRows(page);
  });

  test("sees the Boom Boom Pirate ropes fill the screen", async ({ page }) => {
    await startBoomBoomPirate(page, 5);
    const restart = await page
      .getByRole("button", { name: "Restart Game" })
      .boundingBox();
    if (!restart) throw new Error("The restart button is missing");

    expect(await pageScrolls(page)).toBe(false);
    await expectAtContentBottom(page, restart);
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

  async function expectCentredGame(page: Page, width: number) {
    const { board, roll } = await boardAndRoll(page);
    const left = Math.min(board.x, roll.x);
    const right = Math.max(board.x + board.width, roll.x + roll.width);
    expect(Math.abs((left + right) / 2 - width / 2)).toBeLessThan(24);
    expect(Math.abs(board.width - board.height)).toBeLessThan(2);
    expect(roll.height).toBeGreaterThanOrEqual(36);
  }

  for (const [where, viewport] of [
    ["a phone", undefined],
    ["a desktop", desktop],
  ] as const) {
    test.describe(
      `on ${where}`,
      { tag: viewport ? "@desktop" : "@phone" },
      () => {
        if (viewport) test.use({ viewport });

        test("sees the whole game without scrolling, even with 10 players", async ({
          page,
        }) => {
          await startGame(page, 10);
          const { board, roll } = await boardAndRoll(page);

          expect(await pageScrolls(page)).toBe(false);
          expect(Math.abs(board.width - board.height)).toBeLessThan(2);
          expect(board.y + board.height).toBeLessThanOrEqual(
            page.viewportSize()?.height ?? 0,
          );
          expect(roll.y + roll.height).toBeLessThanOrEqual(
            page.viewportSize()?.height ?? 0,
          );
          if (where === "a desktop")
            await expectCentredGame(page, viewport.width);
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
      },
    );
  }

  test.describe("on a phone", { tag: "@phone" }, () => {
    test("sees a square board above the controls that fits the screen", async ({
      page,
    }) => {
      await startGame(page);
      const { board, roll } = await boardAndRoll(page);

      expect(board.x).toBeGreaterThanOrEqual(0);
      expect(board.x + board.width).toBeLessThanOrEqual(
        page.viewportSize()?.width ?? 0,
      );
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
      await expect(drawer.locator('[aria-current="step"]')).toContainText("Al");
      await expect(
        drawer.getByRole("button", { name: "Restart Game" }),
      ).toBeVisible();
    });

    test("can read a name on the board", async ({ page }) => {
      await startGame(page);
      await page.getByRole("button", { name: /Roll Dice/ }).click();
      await expect(page.getByRole("status")).toHaveText(/^Al moves/);

      // Al moves a square at a time, so wait until it's the next player's turn
      // before measuring. Landing on a snake or ladder pops up a message first
      await expect(async () => {
        const update = page.getByRole("dialog", { name: "Game Update" });
        if (await update.isVisible()) await page.keyboard.press("Escape");
        await expect(
          page.getByRole("button", { name: "Roll Dice (Player 2)" }),
        ).toBeEnabled({ timeout: 1_000 });
      }).toPass({ timeout: 15_000 });

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

  test.describe("on a desktop", { tag: "@desktop" }, () => {
    test.use({ viewport: desktop });

    test("sees a square board beside the controls", async ({ page }) => {
      await startGame(page);
      const { board, roll } = await boardAndRoll(page);

      expect(Math.abs(board.width - board.height)).toBeLessThan(2);
      expect(roll.x + roll.width).toBeLessThanOrEqual(board.x);
      await expectCentredGame(page, desktop.width);
    });
  });
});
