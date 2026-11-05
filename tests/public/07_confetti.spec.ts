import { test, expect } from "../playwright";
import {
  confettiBadge,
  expectClearOfBadge,
  mockConfetti,
  showConfetti,
} from "../confetti";
import { discoverRoutes } from "../../src/discover-routes";
import { films, whiskies } from "../firebase/fixtures";
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

  for (const viewport of [
    { width: 320, height: 640 },
    { width: 632, height: 352 },
    { width: 1280, height: 800 },
  ]) {
    for (const scheme of ["dark", "light"] as const) {
      test.describe(`${String(viewport.width)}px ${scheme}`, () => {
        test.use({ viewport });
        for (const admin of [false, true]) {
          test(`can reach every ${admin ? "admin" : "public"} page action above the badge`, async ({
            page,
          }) => {
            test.slow();
            await page.addInitScript((value) => {
              localStorage.setItem("mantine-color-scheme-value", value);
            }, scheme);
            await mockConfetti(page);
            const routes = discoverRoutes();
            if (admin) await signIn(page);
            const paths = admin
              ? routes.adminRoutes.filter((path) => path !== "/admin/login")
              : routes.publicRoutes
                  .map(({ path }) => path)
                  .concat("/admin/login");
            for (const template of paths) {
              const path = template
                .replace("films/[id]", `films/${films[0].id}`)
                .replace(
                  "whiskyjournal/[id]",
                  `whiskyjournal/${whiskies[0].id}`,
                );
              await test.step(`Given the badge is shown on ${path}`, async () => {
                await page.goto(path);
                await showConfetti(page);
                const actions = page.locator(
                  'main button:visible, main a:visible, main input:visible:not([type="hidden"]), main textarea:visible, main select:visible',
                );
                for (const action of await actions.all()) {
                  const box = await action.boundingBox();
                  // Hidden radio inputs have visible labels instead.
                  if (box && box.width >= 24 && box.height >= 24)
                    await expectClearOfBadge(action, page);
                }
                expect(
                  await page.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth,
                  ),
                ).toBe(true);
                const back = page.getByRole("button", {
                  name: "Back to top",
                  exact: true,
                });
                if (await back.isVisible())
                  await expectClearOfBadge(back, page);
              });
            }
          });
        }
      });
    }
  }

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
    for (const rope of await page
      .getByRole("button", { name: /^Rope \d+$/ })
      .all())
      await expectClearOfBadge(rope, page);
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
      await expectClearOfBadge(button, page);
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

  test("keeps every Red or Black draw and Suits turn clear of the badge", async ({
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
      await expectClearOfBadge(button, page);
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
      await expectClearOfBadge(reveal, page);
      await reveal.click();
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
