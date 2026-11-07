import { test, expect, type Page } from "../playwright";
import { expectGameFits } from "../gameplay";
import { expectNoUnexpectedAxeViolations, schemes, useScheme } from "../axe";

// Phones held sideways: short and wide. The last size is a small phone.
const viewports = [
  { width: 874, height: 402 },
  { width: 960, height: 448 },
  { width: 667, height: 320 },
];

for (const viewport of viewports) {
  test.describe(`A player holding a phone sideways (${String(viewport.width)} by ${String(viewport.height)})`, () => {
    test.use({ viewport });

    test("sees all of Irish Bingo, with the controls in reach", async ({
      page,
    }) => {
      await page.goto("/games/irishbingo");
      await expectGameFits(page);
      await expect(
        page.getByRole("button", { name: "Draw a card" }),
      ).toBeInViewport({ ratio: 1 });
    });

    test("sees all of Red or Black without scrolling", async ({ page }) => {
      await page.goto("/games/redorblack");
      await expectGameFits(page);
      await page.getByRole("button", { name: "Draw a card" }).click();
      await expectGameFits(page);
    });

    test("sees all of Boom Boom Pirate without scrolling", async ({ page }) => {
      await page.goto("/games/boomboompirate");
      await expectGameFits(page);
      await page.getByRole("button", { name: "Start Game" }).click();
      await expectGameFits(page);
    });

    test("sees the Suits table without scrolling", async ({ page }) => {
      await page.goto("/games/suits");
      await page.getByRole("button", { name: "Start game" }).click();
      await expectGameFits(page);
    });

    test("sees the Snakes and Ladders board and dice without scrolling", async ({
      page,
    }) => {
      await page.goto("/games/snakesandladders");
      await page.getByRole("button", { name: "Start game!" }).click();
      await expect(
        page.getByRole("button", { name: /Roll Dice/ }),
      ).toBeVisible();
      await expectGameFits(page);
    });

    test("can reach the Decision Maker button without scrolling", async ({
      page,
    }) => {
      test.skip(viewport.height < 400, "Too short to fit without scrolling");
      await page.goto("/decisionmaker");
      await expect(
        page.getByRole("button", { name: "Make a decision" }),
      ).toBeInViewport({ ratio: 1 });
    });

    test("has no sideways scroll on any public page", async ({ page }) => {
      for (const path of [
        "/",
        "/games",
        "/tools",
        "/tools/word-counter",
        "/films",
        "/whiskyjournal",
        "/cocktails",
        "/games/buzzer",
        "/games/uno-tracker",
        "/games/uno-tracker/stats",
        "/games/uno-tracker/history",
        "/admin/login",
      ]) {
        await page.goto(path);
        expect(await scrollsSideways(page), path).toBe(false);
      }
    });
  });
}

// Axe runs in desktop Chrome only, as everywhere else
for (const scheme of schemes) {
  test.describe(
    `A player holding a phone sideways, in the ${scheme} scheme`,
    { tag: "@desktop" },
    () => {
      test.use({ viewport: { width: 667, height: 320 } });

      test("sees game screens that pass accessibility checks", async ({
        page,
      }) => {
        await useScheme(page, scheme);
        await page.goto("/games/irishbingo");
        await expectNoUnexpectedAxeViolations(page);
        await page.goto("/games/suits");
        await page.getByRole("button", { name: "Start game" }).click();
        await expectNoUnexpectedAxeViolations(page);
        await page.goto("/games/snakesandladders");
        await page.getByRole("button", { name: "Start game!" }).click();
        await expectNoUnexpectedAxeViolations(page);
        await page.goto("/games/boomboompirate");
        await page.getByRole("button", { name: "Start Game" }).click();
        await expectNoUnexpectedAxeViolations(page);
      });
    },
  );
}

function scrollsSideways(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
}
