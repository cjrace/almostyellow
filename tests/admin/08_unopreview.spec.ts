import { test, expect, type Page } from "../playwright";
import { expectNoUnexpectedAxeViolations, schemes, useScheme } from "../axe";
import { previewScenarios } from "../../src/unogame/preview";
import { signIn } from "./helpers";

// The hand never scrolls, and the top-left corner of every card is the
// frontmost thing at that spot, so no card is covered
async function expectWholeHandShowing(page: Page) {
  const result = await page.evaluate(() => {
    const list = document.querySelector('ul[aria-label^="Your hand"]');
    if (!list) return { error: "no hand" };
    const buttons = [...list.querySelectorAll("button")];
    const bounds = list.getBoundingClientRect();
    const covered: string[] = [];
    let outside = 0;
    for (const button of buttons) {
      // elementFromPoint only sees what is on screen
      button.scrollIntoView({ block: "nearest" });
      const box = button.getBoundingClientRect();
      if (box.left < bounds.left - 1 || box.right > bounds.right + 1) outside++;
      const x = box.left + box.width * 0.1;
      const y = box.top + box.height * 0.1;
      const top = document.elementFromPoint(x, y)?.closest("button");
      if (top !== button) covered.push(button.getAttribute("aria-label") ?? "");
    }
    return {
      scrolls: list.scrollWidth > list.clientWidth,
      outside,
      covered,
      cards: buttons.length,
    };
  });
  expect(result).toMatchObject({ scrolls: false, outside: 0, covered: [] });
}

// Cards overlap in the fan, so tap the corner strip that is always showing
const CORNER = { x: 8, y: 8 };

async function openPreview(page: Page, scenario: string) {
  await signIn(page);
  await page.goto("/admin/unopreview");
  await expect(
    page.getByRole("heading", { level: 1, name: "Uno table preview" }),
  ).toBeVisible();
  await page.getByLabel("Scenario").selectOption(scenario);
}

test.describe("Admin looking at the Uno table preview", () => {
  test("Can choose a card and then a colour for a wild card", async ({
    page,
  }) => {
    await openPreview(page, "large-hand");
    const hand = page.getByRole("list", { name: /^Your hand, \d+ cards$/ });

    await test.step("Given it is my turn", async () => {
      await expect(
        page.getByRole("heading", { level: 2, name: "Your turn" }),
      ).toBeVisible();
    });

    await test.step("When I pick a wild card", async () => {
      const wild = hand
        .getByRole("button", { name: "Wild Draw Four, play" })
        .first();
      await wild.scrollIntoViewIfNeeded();
      await wild.focus();
      await page.keyboard.press("Enter");
    });

    await test.step("Then I am asked for a colour, starting on the first", async () => {
      const picker = page.getByRole("group", {
        name: "Choose a colour for your wild card",
      });
      await expect(picker).toBeVisible();
      await expect(picker.getByRole("button", { name: "Red" })).toBeFocused();
      await expect(
        picker.getByRole("button", { name: "Yellow" }),
      ).toBeVisible();
      await expect(picker.getByRole("button", { name: "Green" })).toBeVisible();
    });

    await test.step("When I choose blue, focus returns to the heading and the choice is announced", async () => {
      await page
        .getByRole("group", { name: "Choose a colour for your wild card" })
        .getByRole("button", { name: "Blue" })
        .click();
      await expect(
        page.getByRole("heading", { level: 2, name: "Your turn" }),
      ).toBeFocused();
      await expect(
        page.getByRole("status").filter({ hasText: "You chose" }),
      ).toHaveText("You chose Wild Draw Four and blue.");
    });
  });

  test("Cards that cannot be played say why and ignore clicks", async ({
    page,
  }) => {
    await openPreview(page, "two-players");
    const blocked = page
      .getByRole("list", { name: /^Your hand/ })
      .getByRole("button", { name: /does not match the top card$/ })
      .first();
    await expect(blocked).toHaveAttribute("aria-disabled", "true");
    // Playwright waits for aria-disabled buttons to be enabled, so force it
    await blocked.click({ force: true, position: CORNER });
    await expect(
      page.getByRole("status").filter({ hasText: "You chose" }),
    ).toHaveCount(0);

    await page
      .getByRole("button", { name: /^Draw pile, \d+ cards, draw/ })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "You chose to draw a card." }),
    ).toHaveCount(1);
  });

  test("Uno is a button, pressed before the play or right after it", async ({
    page,
  }) => {
    await openPreview(page, "two-players");
    await expect(
      page.getByRole("button", { name: "Say Uno!" }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      page.getByRole("button", { name: "Say Uno!" }),
    ).toHaveAccessibleDescription(
      "Saying Uno only matters when you play down to one card.",
    );

    await test.step("Given two cards left, when I say Uno before playing", async () => {
      await page.getByLabel("Scenario").selectOption("two-cards");
      const say = page.getByRole("button", { name: "Say Uno!" });
      await expect(say).toHaveAttribute("aria-disabled", "false");
      await say.click();
      await expect(
        page.getByRole("button", { name: "Uno said" }),
      ).toHaveAttribute("aria-disabled", "true");
      await page
        .getByRole("list", { name: /^Your hand/ })
        .getByRole("button", { name: /, play$/ })
        .first()
        .click({ position: CORNER });
      const picker = page.getByRole("group", { name: /Choose a colour/ });
      if (await picker.isVisible())
        await picker.getByRole("button", { name: "Red" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "You chose" }),
      ).toHaveText(/, saying Uno\.$/);
    });

    await test.step("Given I forgot, when I say Uno right after playing", async () => {
      await page.getByLabel("Scenario").selectOption("say-uno");
      await page.getByRole("button", { name: "Say Uno!" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "You said Uno." }),
      ).toHaveCount(1);
    });
  });

  test("Players, piles and turn are named for screen readers", async ({
    page,
  }) => {
    await openPreview(page, "catch-uno");
    await expect(
      page.getByRole("listitem", {
        name: "Laura, 1 card, can be caught for Uno",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Catch Laura for Uno" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "caught" }),
    ).toHaveText("You caught a player for Uno.");

    await page.getByLabel("Scenario").selectOption("round-over");
    await expect(
      page.getByRole("heading", { level: 2, name: "Laura won the round" }),
    ).toBeVisible();
    await expect(page.getByText("Waiting for")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^Draw pile, \d+ cards$/ }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  test("A large hand fans out to fit, with every corner showing", async ({
    page,
  }) => {
    await openPreview(page, "large-hand");
    for (const { value } of previewScenarios) {
      await page.getByLabel("Scenario").selectOption(value);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(
        overflow,
        `${value} overflows the page sideways`,
      ).toBeLessThanOrEqual(0);
    }
    await page.getByLabel("Scenario").selectOption("large-hand");
    const hand = page.getByRole("list", { name: /^Your hand, 5\d cards$/ });
    await expect(hand).toBeVisible();
    await expectWholeHandShowing(page);
  });

  test("Stays inside a 320 pixel wide screen and at 200% zoom", async ({
    page,
  }) => {
    await openPreview(page, "long-names");
    for (const width of [320, 640]) {
      await page.setViewportSize({ width, height: 700 });
      for (const { value } of previewScenarios) {
        await page.getByLabel("Scenario").selectOption(value);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(
          overflow,
          `${value} overflows at ${String(width)} pixels`,
        ).toBeLessThanOrEqual(0);
        await expectWholeHandShowing(page);
      }
    }
  });
});

for (const scheme of schemes) {
  test.describe(
    `Uno table preview, ${scheme} scheme`,
    { tag: "@desktop" },
    () => {
      test.beforeEach(async ({ page }) => {
        await useScheme(page, scheme);
      });

      test("Every layout and state passes accessibility checks", async ({
        page,
      }) => {
        test.setTimeout(240_000);
        await openPreview(page, "two-players");
        for (const { value, label } of previewScenarios) {
          await test.step(label, async () => {
            await page.getByLabel("Scenario").selectOption(value);
            await expectNoUnexpectedAxeViolations(page);
          });
        }

        await test.step("Colour picker", async () => {
          await page.getByLabel("Scenario").selectOption("large-hand");
          await page
            .getByRole("button", { name: "Wild Draw Four, play" })
            .first()
            .click({ position: CORNER });
          await expect(
            page.getByRole("group", {
              name: "Choose a colour for your wild card",
            }),
          ).toBeVisible();
          await expectNoUnexpectedAxeViolations(page);
        });
      });

      test("Scores open in a dialog and return focus when closed", async ({
        page,
      }) => {
        await openPreview(page, "ten-players");
        const trigger = page.getByRole("button", { name: "Scores" });
        await trigger.click();
        const dialog = page.getByRole("dialog", { name: "Scores" });
        await expect(dialog).toBeVisible();
        await expect(
          dialog.getByRole("table", { name: "Rounds won this session" }),
        ).toBeVisible();
        await expectNoUnexpectedAxeViolations(page);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
      });
    },
  );
}
