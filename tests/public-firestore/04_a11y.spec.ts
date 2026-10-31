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
