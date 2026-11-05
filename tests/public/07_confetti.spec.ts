import { test, expect, type Route, devices } from "../playwright";
import {
  confettiBadge,
  expectClearOfBadge,
  mockConfetti,
  showConfetti,
} from "../confetti";
import { whiskies } from "../firebase/fixtures";
import { signIn } from "../admin/helpers";

test.describe("Confetti on a phone", { tag: "@phone" }, () => {
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
  });

  test.describe("A visitor using confetti", () => {
    test("honours reduced motion enabled while the script downloads", async ({
      page,
    }) => {
      const requested = Promise.withResolvers<Route>();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.route("https://run.confettipage.com/**", (route) => {
        requested.resolve(route);
      });
      await page.goto("/games");
      await page.getByRole("button", { name: "Unleash confetti" }).click();
      const route = await requested.promise;

      await page.emulateMedia({ reducedMotion: "reduce" });
      // Wait for the browser to apply the preference before completing the
      // download; emulateMedia can return before WebKit updates media queries.
      await expect
        .poll(() =>
          page.evaluate(
            () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          ),
        )
        .toBe(true);
      await page.evaluate(() => {
        const script = document.querySelector(
          'script[src="https://run.confettipage.com/here.js"]',
        );
        if (!script) throw new Error("The confetti download did not start.");
        // Wait past the load handler and its promises before checking playback.
        script.addEventListener("load", () => {
          requestAnimationFrame(() => {
            document.documentElement.dataset.confettiLoaded = "true";
          });
        });
      });
      await route.fulfill({
        contentType: "application/javascript",
        body: `window.ConfettiPage = { play() {
        document.documentElement.dataset.confettiPlayed = 'true';
      }};`,
      });
      await expect(page.locator("html")).toHaveAttribute(
        "data-confetti-loaded",
        "true",
      );
      await expect(page.locator("html")).not.toHaveAttribute(
        "data-confetti-played",
      );

      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect
        .poll(() =>
          page.evaluate(
            () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          ),
        )
        .toBe(false);
      await page.getByRole("button", { name: "Unleash confetti" }).click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-confetti-played",
        "true",
      );
    });

    test("keeps a permanent bottom gap through confetti, navigation and resizing", async ({
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
      expect(Number.parseFloat(original)).toBeGreaterThan(0);
      await showConfetti(page);
      expect(await padding()).toBe(original);
      const badge = await confettiBadge(page).boundingBox();
      expect(badge).not.toBeNull();
      expect(Number.parseFloat(original)).toBeGreaterThan(
        (badge?.height ?? 0) + 4,
      );
      await page
        .getByRole("link", { name: "Play Irish Bingo!", exact: true })
        .click();
      await expect(confettiBadge(page)).toBeVisible();
      await expectClearOfBadge(
        page.getByRole("button", { name: "Shuffle new deck" }),
        page,
      );
      await page.setViewportSize(
        devices[
          test.info().project.name === "Mobile Safari" ? "Pixel 9" : "iPhone 17"
        ].viewport,
      );
      await expectClearOfBadge(
        page.getByRole("button", { name: "Draw a card", exact: true }),
        page,
      );
      await confettiBadge(page).evaluate((badge) => {
        badge.remove();
      });
      await expect.poll(padding).toBe(original);
    });

    test("does not request confetti with reduced motion", async ({ page }) => {
      const requests: string[] = [];
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.route("https://run.confettipage.com/**", (route) => {
        requests.push(route.request().url());
        return route.abort();
      });
      await page.goto("/games");
      await page.getByRole("button", { name: "Unleash confetti" }).click();
      expect(requests).toEqual([]);
    });

    test("keeps a newly focused field clear without needing a manual scroll", async ({
      page,
    }) => {
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
        const dialog = page.getByRole("dialog", {
          name: "Whisky rating scales",
        });
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
      const draw = page.getByRole("button", {
        name: "Draw a card",
        exact: true,
      });
      await expectClearOfBadge(draw, page);
      await draw.click();
      await draw.click();
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

    test("keeps Red or Black and Suits controls clear of the badge", async ({
      page,
    }) => {
      await mockConfetti(page);
      await page.goto("/games/redorblack");
      await showConfetti(page);
      const draw = page.getByRole("button", {
        name: "Draw a card",
        exact: true,
      });
      await expectClearOfBadge(draw, page);
      await draw.click();
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
      await page
        .getByRole("button", { name: "Start game", exact: true })
        .click();
      await page.getByText("Hearts", { exact: true }).last().click();
      const reveal = page.getByRole("button", { name: "Reveal four cards" });
      await expectClearOfBadge(reveal, page);
      await reveal.click();
      await expectClearOfBadge(
        page.getByRole("button", { name: "Change players" }),
        page,
      );
    });
  });
});
