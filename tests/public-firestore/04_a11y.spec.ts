import { test, expect } from "@playwright/test";
import { expectNoAxeViolations, schemes, useScheme } from "../axe";
import { publicRoutes } from "../../src/routes";

// axe finds the same problems in every browser, so Chrome and Mobile Chrome
// are enough, and cover both the desktop and mobile layouts
test.skip(({ browserName }) => browserName !== "chromium");

for (const scheme of schemes) {
  test.describe(`${scheme} scheme`, () => {
    test.beforeEach(async ({ page }) => {
      await useScheme(page, scheme);
    });

    for (const { path } of publicRoutes) {
      test(`${path} meets WCAG 2.2 AA`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("h1")).toBeVisible();
        await expectNoAxeViolations(page);
      });
    }

    test("Decision maker meets WCAG 2.2 AA with an error and a decision", async ({
      page,
    }) => {
      await page.goto("/decisionmaker");
      await page.getByRole("button", { name: "Make a decision" }).click();
      await expect(
        page.getByText("Please enter at least 2 options."),
      ).toBeVisible();
      await expectNoAxeViolations(page, { soft: true });

      await page
        .getByLabel("List out your options")
        .fill("Pizza\nCurry\nFish and chips");
      await page.getByRole("button", { name: "Make a decision" }).click();
      await expect(page.getByTestId("choice_made")).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test("Cocktails meet WCAG 2.2 AA with no search results", async ({
      page,
    }) => {
      await page.goto("/cocktails");
      await page
        .getByPlaceholder("Search cocktail names...")
        .fill("Nothing is called this");
      await expect(page.getByText(/Showing 0 of \d+ cocktails/)).toBeVisible();
      await expectNoAxeViolations(page);
    });

    for (const { path, button, dialog } of [
      {
        path: "/games/irishbingo",
        button: "Open game instructions modal",
        dialog: "Irish Bingo instructions",
      },
      {
        path: "/whiskyjournal",
        button: "Open modal detailing whisky rating scales",
        dialog: "Whisky rating scales",
      },
    ]) {
      test(`${dialog} dialog meets WCAG 2.2 AA`, async ({ page }) => {
        await page.goto(path);
        await page.getByRole("button", { name: button }).click();
        await expect(page.getByRole("dialog", { name: dialog })).toBeVisible();
        await expectNoAxeViolations(page);
      });
    }

    test("Boom Boom Pirate meets WCAG 2.2 AA mid-game", async ({ page }) => {
      await page.goto("/games/boomboompirate");
      await page.getByRole("button", { name: "Start Game" }).click();
      await page.getByRole("button", { name: "Rope 1", exact: true }).click();
      // The result is announced, and shown in words as well as colour
      await expect(page.getByRole("status")).toContainText("Rope 1", {
        timeout: 5_000,
      });
      await expect(
        page.getByRole("button", { name: /^Rope 1, (safe|boom!)$/ }),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test("Snakes and Ladders meets WCAG 2.2 AA mid-game", async ({ page }) => {
      await page.goto("/games/snakesandladders");
      await page.getByRole("button", { name: "Start game!" }).click();
      await expect(
        page.getByText(/not on the board yet \(your turn\)/),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
}

test("Game results are announced to screen readers", async ({ page }) => {
  await page.goto("/games/irishbingo");
  await page.getByRole("button", { name: "Draw a card" }).click();
  await expect(page.getByRole("status")).toContainText(/ of /);

  await page.goto("/decisionmaker");
  await page.getByLabel("List out your options").fill("Tea\nCoffee");
  await page.getByRole("button", { name: "Make a decision" }).click();
  await expect(page.getByRole("status")).toContainText(/Tea|Coffee/);
});

// Buttons that are disabled or replaced lose keyboard focus, so the games put
// it back where the player can carry on
test("Keyboard focus follows the Boom Boom Pirate game", async ({ page }) => {
  await useScheme(page, "dark");
  await page.goto("/games/boomboompirate");
  await page.getByLabel("Number of ropes").fill("5");
  await page.getByRole("button", { name: "Start Game" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Rope 1" })).toBeFocused();

  // Pull each rope by keyboard until one is the trap
  for (let rope = 1; rope <= 5; rope++) {
    await page.getByRole("button", { name: `Rope ${rope.toString()}` }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText(
      `Rope ${rope.toString()} `,
      { timeout: 5_000 },
    );
    if ((await page.getByRole("status").textContent())?.includes("trap")) {
      break;
    }
    await expect(
      page.getByRole("button", { name: `Rope ${rope.toString()}, safe` }),
    ).toBeFocused();
  }

  const dialog = page.getByRole("dialog", { name: "Boom!" });
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: /, boom!$/ })).toBeFocused();

  await page.getByRole("button", { name: "Restart Game" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Number of ropes")).toBeFocused();
});

test("Keyboard focus follows the Snakes and Ladders game", async ({ page }) => {
  await useScheme(page, "dark");
  await page.goto("/games/snakesandladders");
  await page.getByRole("button", { name: "Start game!" }).focus();
  await page.keyboard.press("Enter");
  const roll = page.getByRole("button", { name: /^Roll Dice/ });
  await expect(roll).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("moves", {
    timeout: 5_000,
  });
  // The move ends with focus back on the dice, or with a dialog when a
  // ladder or snake is hit, which hands focus back when closed
  const dialog = page.getByRole("dialog", { name: "Game Update" });
  await expect
    .poll(
      async () =>
        (await dialog.isVisible()) ||
        (await roll.evaluate((el) => el === document.activeElement)),
      { timeout: 10_000 },
    )
    .toBe(true);
  if (await dialog.isVisible()) {
    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await expect(roll).toBeFocused({ timeout: 5_000 });

  await page.getByRole("button", { name: "Restart Game" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Number of Players")).toBeFocused();
});

test("Keyboard focus stays on the decision maker button", async ({ page }) => {
  await page.goto("/decisionmaker");
  await page.getByLabel("List out your options").fill("Tea\nCoffee");
  const button = page.getByRole("button", {
    name: /Make a decision|Pondering/,
  });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText(/Tea|Coffee/, {
    timeout: 5_000,
  });
  await expect(button).toBeFocused();
});
