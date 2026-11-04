import { test, expect, type Page } from "../playwright";

/* The layout tests set their own window size, so they check the same thing in
   every browser project. */
const phone = { width: 390, height: 844 };
const smallPhone = { width: 320, height: 640 };
const desktop = { width: 1280, height: 800 };

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1366, height: 650 },
  { width: 1920, height: 900 },
]) {
  test.describe(`A visitor with a ${viewport.width.toString()} by ${viewport.height.toString()} desktop window`, () => {
    test.use({ viewport });

    test("sees all six games and their Play buttons without scrolling", async ({
      page,
    }) => {
      await page.goto("/games");
      const play = page.getByRole("link", { name: /^Play / });
      await expect(play).toHaveCount(6);
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
  });
}

test.describe("A visitor with a short desktop window", () => {
  test.use({ viewport: { width: 1280, height: 480 } });

  test("can scroll to every game without its text or Play button being cut off", async ({
    page,
  }) => {
    await page.goto("/games");
    expect(await pageScrolls(page)).toBe(true);
    const play = page.getByRole("link", { name: /^Play / });
    await expect(play).toHaveCount(6);
    for (const button of await play.all()) {
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport({ ratio: 1 });
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false);
  });
});

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

// The card games gain buttons and alerts as the deck runs down (Irish Bingo's
// "Has someone won?" after 10 cards, and "Deck Exhausted" after 52), so the
// page is checked after every draw or turn
for (const [where, viewport] of [
  ["a small phone", smallPhone],
  ["a phone", phone],
  ["a laptop", { width: 1366, height: 650 }],
] as const) {
  test.describe(`A visitor on ${where}`, () => {
    test.use({ viewport });

    test("can draw the whole Irish Bingo deck without the page scrolling", async ({
      page,
    }) => {
      await page.goto("/games/irishbingo");
      const draw = page.getByRole("button", { name: "Draw a card" });
      const card = page.locator("#calling_card img");
      expect(await pageScrolls(page), "before drawing").toBe(false);

      for (let drawn = 1; drawn <= 52; drawn++) {
        await draw.click();
        await expect(page.locator("#card_count")).toHaveText(
          `${drawn.toString()} / 52 cards`,
        );
        expect(await pageScrolls(page), `after ${drawn.toString()}`).toBe(
          false,
        );
        await expect(card, `after ${drawn.toString()}`).toBeInViewport({
          ratio: 1,
        });
      }

      // Both extras showed up along the way, and the page still fits. The
      // alert takes the Draw button's place
      await expect(
        page.getByRole("button", { name: "Has someone won?" }),
      ).toBeInViewport({ ratio: 1 });
      await expect(page.getByText("Deck Exhausted")).toBeInViewport({
        ratio: 1,
      });
      await expect(draw).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Shuffle new deck" }),
      ).toBeInViewport({ ratio: 1 });
    });

    // Red or Black shows the same "Deck Exhausted" alert after 52 cards
    test("can draw the whole Red or Black deck without the page scrolling", async ({
      page,
    }) => {
      await page.goto("/games/redorblack");
      const draw = page.getByRole("button", { name: "Draw a card" });
      const card = page.locator("main img");
      expect(await pageScrolls(page), "before drawing").toBe(false);

      for (let drawn = 1; drawn <= 52; drawn++) {
        await draw.click();
        await expect(page.locator("#cards_remaining")).toContainText(
          `${(52 - drawn).toString()} cards remaining`,
        );
        expect(await pageScrolls(page), `after ${drawn.toString()}`).toBe(
          false,
        );
        await expect(card, `after ${drawn.toString()}`).toBeInViewport({
          ratio: 1,
        });
      }

      await expect(page.getByText("Deck Exhausted")).toBeInViewport({
        ratio: 1,
      });
      await expect(
        page.getByRole("button", { name: "Shuffle new deck" }),
      ).toBeInViewport({ ratio: 1 });
    });
  });
}

// Suits stacks its buttons on phones, except short ones, where they share a
// row at 720px tall or less. A Pixel 8 or 9 in Chrome is 412 wide and 830 to 915 tall
for (const [where, viewport, buttons] of [
  ["a small phone", smallPhone, "side by side"],
  ["a phone", phone, "stacked"],
  ["a Pixel phone", { width: 412, height: 830 }, "stacked"],
  ["a tall Pixel phone", { width: 412, height: 915 }, "stacked"],
] as const) {
  test.describe(`A visitor on ${where}`, () => {
    test.use({ viewport });

    // Suits gains the "Final turn" alert on the last turn, a "Safe round" alert
    // whenever the cards are one of each suit, and "Play again" at the end
    test(`can play a whole game of Suits without the page scrolling, with the buttons ${buttons}`, async ({
      page,
    }) => {
      // Checks every card and button on all 13 turns, which can take Safari
      // longer than the default allows
      test.slow();
      await page.goto("/games/suits");
      await page.getByRole("button", { name: "Add player" }).click();
      await page.getByLabel("Player 1 name").fill("Ben");
      await page.getByLabel("Player 3 name").fill("Cam");
      // A fixed shuffle with safe rounds on turns 4, 12 and 13, so the tallest
      // screens come up: the final turn after a safe round, and a safe round
      // at the end. The seeded generator is mulberry32. The seed is set as the
      // Start button is clicked, before the game shuffles, as the page may
      // use Math.random itself before then
      await page.evaluate(() => {
        let seed = 0;
        window.addEventListener(
          "click",
          (event) => {
            const button =
              event.target instanceof Element && event.target.closest("button");
            if (button && button.textContent === "Start game") seed = 74;
          },
          { capture: true },
        );
        Math.random = () => {
          seed = (seed + 0x6d2b79f5) | 0;
          let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      });
      await page.getByRole("button", { name: "Start game" }).click();

      const reveal = page.getByRole("button", { name: "Reveal four cards" });
      const cards = page.locator("main img");

      // Everything a player needs is on screen, and big enough to tap
      async function expectAllOnScreen(when: string) {
        expect(await pageScrolls(page), when).toBe(false);
        for (const card of await cards.all()) {
          await expect(card, when).toBeInViewport({ ratio: 1 });
        }
        // The game's buttons and suits, though not the instructions button
        const targets = page.locator(
          "main .mantine-Button-root:visible, main .mantine-SegmentedControl-label:visible",
        );
        for (const target of await targets.all()) {
          await expect(target, when).toBeInViewport({ ratio: 1 });
          const box = await target.boundingBox();
          expect(box?.height, when).toBeGreaterThanOrEqual(44);
        }
      }

      // Reveal and Change players are side by side on short phones, and one
      // above the other, full width, on taller ones
      const revealBox = await reveal.boundingBox();
      const changeBox = await page
        .getByRole("button", { name: "Change players" })
        .boundingBox();
      if (buttons === "side by side") {
        expect(changeBox?.y).toBe(revealBox?.y);
      } else {
        expect(changeBox?.y).toBeGreaterThan(
          (revealBox?.y ?? 0) + (revealBox?.height ?? 0),
        );
        expect(changeBox?.width).toBe(revealBox?.width);
      }

      for (let turn = 1; turn <= 13; turn++) {
        const when = `on turn ${turn.toString()}`;
        await page.locator("label").filter({ hasText: "Hearts" }).click();
        await expect(reveal).toBeEnabled();
        if (turn === 13) {
          await expect(page.getByText("Final turn")).toBeInViewport({
            ratio: 1,
          });
        }
        await expectAllOnScreen(when);
        await reveal.click();
        // Wait for the turn to move on
        await expect(page.locator("#suits_turn_count"), when).toHaveText(
          turn === 13
            ? "All 13 turns played"
            : `Turn ${(turn + 1).toString()} of 13`,
        );
        if ([4, 12, 13].includes(turn)) {
          await expect(page.locator("#suits_result"), when).toContainText(
            "Safe round",
          );
        }
        await expectAllOnScreen(`after ${when}`);
      }

      await expect(page.locator("#suits_turn")).toHaveText("Game over");
      await expect(
        page.getByRole("button", { name: "Play again with same players" }),
      ).toBeInViewport({ ratio: 1 });
      await expectAllOnScreen("at the end");
    });
  });
}

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
