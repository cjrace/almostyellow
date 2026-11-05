import { test, expect } from "../playwright";
import {
  confettiBadge,
  expectClearOfBadge,
  mockConfetti,
  showConfetti,
} from "../confetti";
import { whiskies } from "../firebase/fixtures";
import { signIn } from "../admin/helpers";

// WebKit can send a worker-controlled request outside page.route.
test.use({ serviceWorkers: "block" });

// The confetti script is large, so it should only be fetched when someone
// asks for confetti. The request is blocked so tests never reach the site.
test("Confetti only loads when asked for", async ({ page }) => {
  const requests: string[] = [];
  await page.route("https://run.confettipage.com/**", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });

  await page.goto("/games");
  await page.waitForLoadState("load");
  expect(requests).toEqual([]);

  await page.getByRole("button", { name: "Unleash confetti" }).click();
  await expect.poll(() => requests.length).toBe(1);
  await expect(page.locator("html")).not.toHaveAttribute("data-confetti-badge");
});

test.describe("A visitor using confetti", () => {
  test("only gets clearance while a badge exists, including after resizing and navigation", async ({
    page,
  }) => {
    await mockConfetti(page);
    await page.goto("/games");
    const padding = () =>
      page
        .locator(".site-frame")
        .evaluate((element) => getComputedStyle(element).paddingBottom);
    const original = await padding();
    await expect(confettiBadge(page)).toHaveCount(0);
    await showConfetti(page);
    expect(await padding()).not.toBe(original);
    await page
      .getByRole("link", { name: "Play Irish Bingo!", exact: true })
      .click();
    await expect(confettiBadge(page)).toBeVisible();
    await expectClearOfBadge(
      page.getByRole("button", { name: "Shuffle new deck" }),
      page,
    );
    await page.setViewportSize({ width: 320, height: 640 });
    await confettiBadge(page).evaluate((badge) => {
      badge.style.setProperty("font-size", "28px", "important");
    });
    await expectClearOfBadge(
      page.getByRole("button", { name: "Draw a card", exact: true }),
      page,
    );
    await expect
      .poll(() =>
        page
          .locator("html")
          .evaluate((root) =>
            Number.parseFloat(
              root.style.getPropertyValue("--confetti-clearance"),
            ),
          ),
      )
      .toBeGreaterThan(50);
    await confettiBadge(page).evaluate((badge) => {
      badge.remove();
    });
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-confetti-badge",
    );
    await expect.poll(padding).toBe("10px");
  });

  test("does not request confetti or reserve space with reduced motion", async ({
    page,
  }) => {
    const requests: string[] = [];
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("https://run.confettipage.com/**", (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    await page.goto("/games");
    await page.getByRole("button", { name: "Unleash confetti" }).click();
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-confetti-badge",
    );
    expect(requests).toEqual([]);
  });

  test("keeps a newly focused field clear without needing a manual scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await mockConfetti(page);
    await signIn(page);
    await page.goto(`/admin/whiskyjournal/${whiskies[0].id}/edit`);
    await showConfetti(page);
    await page.getByPlaceholder("Enter ABV").focus();
    for (let tab = 0; tab < 12; tab++) {
      await page.keyboard.press("Tab");
      await expect
        .poll(() =>
          page.evaluate(() => {
            const field = document.activeElement?.getBoundingClientRect();
            const badgeElement = document.querySelector(
              "a[data-test-confetti]",
            );
            const badge = badgeElement?.getBoundingClientRect();
            if (
              !field ||
              !badge ||
              document.activeElement === document.body ||
              document.activeElement === badgeElement
            )
              return true;
            return (
              field.right <= badge.left ||
              field.left >= badge.right ||
              field.bottom <= badge.top ||
              field.top >= badge.bottom
            );
          }),
        )
        .toBe(true);
    }
  });

  // Check each spacing mechanism on a representative page. Repeating every
  // control on every route adds little coverage of this shared behaviour.
  test("keeps a scrolling page, Back to top and a dialog clear of the badge", async ({
    page,
  }) => {
    await test.step("Given the badge is shown on a narrow, light-scheme journal", async () => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.addInitScript(() => {
        localStorage.setItem("mantine-color-scheme-value", "light");
      });
      await mockConfetti(page);
      await page.goto("/whiskyjournal");
      await showConfetti(page);
    });

    await test.step("When they scroll to the last entry, its action and Back to top clear the badge", async () => {
      await expectClearOfBadge(
        page.getByRole("link", { name: /^Edit / }).last(),
        page,
      );
      await expectClearOfBadge(
        page.getByRole("button", { name: "Back to top", exact: true }),
        page,
      );
    });

    await test.step("Then they can also reach the rating dialog's close button above the badge", async () => {
      await page
        .getByRole("button", {
          name: "Open modal detailing whisky rating scales",
        })
        .click();
      const dialog = page.getByRole("dialog", { name: "Whisky rating scales" });
      await expect(dialog).toBeVisible();
      await expectClearOfBadge(
        dialog.getByRole("button", { name: "Close modal" }),
        page,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  });

  test("keeps game controls and the Players drawer clear at their limits", async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 320, height: 640 });
    await mockConfetti(page);
    await page.goto("/games/snakesandladders");
    await page.getByLabel("Number of Players").fill("10");
    await page.getByRole("button", { name: "Start game!" }).click();
    await showConfetti(page);
    await expectClearOfBadge(
      page.getByRole("button", { name: /^Roll Dice/ }),
      page,
    );
    await page.getByRole("button", { name: "Players", exact: true }).click();
    await expectClearOfBadge(
      page
        .getByRole("dialog", { name: "Players" })
        .getByRole("button", { name: "Restart Game" }),
      page,
    );
    await page.keyboard.press("Escape");
    await page.goto("/games/boomboompirate");
    await page.getByLabel("Number of ropes").fill("50");
    await page.getByRole("button", { name: "Start Game" }).click();
    await showConfetti(page);
    for (const name of ["Rope 1", "Rope 50"])
      await expectClearOfBadge(
        page.getByRole("button", { name, exact: true }),
        page,
      );
    await expectClearOfBadge(
      page.getByRole("button", { name: "Restart Game" }),
      page,
    );
    await page.goto("/games/irishbingo");
    await showConfetti(page);
    for (let draw = 0; draw < 52; draw++) {
      const button = page.getByRole("button", {
        name: "Draw a card",
        exact: true,
      });
      if (draw === 0 || draw === 51) await expectClearOfBadge(button, page);
      await button.click();
    }
    await expectClearOfBadge(
      page.getByRole("button", { name: "Shuffle new deck" }),
      page,
    );
    await page.getByRole("button", { name: "View all called cards" }).click();
    await expectClearOfBadge(
      page.getByRole("dialog").getByRole("button", { name: "Close modal" }),
      page,
    );
  });

  test("keeps the first and final Red or Black draws and Suits turns clear of the badge", async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 320, height: 640 });
    await mockConfetti(page);
    await page.goto("/games/redorblack");
    await showConfetti(page);
    for (let draw = 0; draw < 52; draw++) {
      const button = page.getByRole("button", {
        name: "Draw a card",
        exact: true,
      });
      if (draw === 0 || draw === 51) await expectClearOfBadge(button, page);
      await button.click();
    }
    await expectClearOfBadge(
      page.getByRole("button", { name: "Shuffle new deck" }),
      page,
    );
    await page.getByRole("button", { name: "View all drawn cards" }).click();
    await expectClearOfBadge(
      page
        .getByRole("dialog", { name: "All drawn cards" })
        .getByRole("button", { name: "Close modal" }),
      page,
    );
    await page.goto("/games/suits");
    await showConfetti(page);
    await page.evaluate(() => {
      window.addEventListener(
        "click",
        (event) => {
          if (
            !(event.target instanceof Element) ||
            event.target.closest("button")?.textContent !== "Start game"
          )
            return;
          let seed = 74;
          Math.random = () => {
            seed = (seed + 0x6d2b79f5) | 0;
            let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            value =
              (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
          };
        },
        { capture: true },
      );
    });
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    for (let turn = 0; turn < 13; turn++) {
      await page.getByText("Hearts", { exact: true }).last().click();
      const reveal = page.getByRole("button", { name: "Reveal four cards" });
      if (turn === 0 || turn === 12) await expectClearOfBadge(reveal, page);
      await reveal.click();
      if (turn === 0 || turn === 12)
        await expectClearOfBadge(
          page.getByRole("button", { name: "Change players" }),
          page,
        );
    }
    await expectClearOfBadge(
      page.getByRole("button", { name: "Play again with same players" }),
      page,
    );
  });
});
