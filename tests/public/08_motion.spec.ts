import { test, expect } from "../playwright";

test.describe("A player who requests reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("cannot roll again after the first player wins and can reach restart by keyboard", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/games/snakesandladders");
    await page.evaluate(() => {
      window.addEventListener(
        "click",
        (event) => {
          if (
            !(event.target instanceof Element) ||
            event.target.closest("button")?.textContent !== "Start game!"
          )
            return;
          let calls = 0;
          let seed = 74;
          Math.random = () => {
            calls++;
            if (calls === 1) return 0;
            if (calls === 2) return 96.1 / 97;
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
          };
        },
        { capture: true },
      );
    });
    await page.getByRole("button", { name: "Start game!" }).click();
    await page.clock.install({ time: new Date("2026-11-05T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-05T12:01:00Z"));
    const update = page.getByRole("dialog", { name: "Game Update" });
    for (const [turn, result] of [2, 1, 1].entries()) {
      await page.evaluate((roll) => {
        Math.random = () => (roll - 1 + 0.1) / 6;
      }, result);
      await page.getByRole("button", { name: /^Roll Dice/ }).click();
      await page.clock.runFor(2000 + result * 300);
      if (turn === 0 || turn === 2) {
        await expect(update).toContainText(
          turn === 0 ? "climbed up 97 spaces" : "Player 1 won the game",
        );
        await page.keyboard.press("Escape");
        await page.clock.runFor(100);
        await expect(update).toBeHidden();
      } else {
        await expect(
          page.getByRole("button", { name: /^Roll Dice/ }),
        ).toBeEnabled();
      }
    }
    await expect(
      page.getByRole("button", { name: /^Roll Dice/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", {
        name: isMobile ? "Players" : "Restart Game",
        exact: true,
      }),
    ).toBeFocused();
  });

  test("gets a static rope suspense period and can dismiss the explosion once", async ({
    page,
  }) => {
    await page.goto("/games/boomboompirate");
    await page.evaluate(() => {
      Math.random = () => 0;
    });
    await page.getByLabel("Number of ropes").fill("5");
    await page.getByRole("button", { name: "Start Game", exact: true }).click();
    await page.clock.install({ time: new Date("2026-11-05T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-05T12:01:00Z"));
    await page.getByRole("button", { name: "Rope 1", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Rope 1", exact: true }),
    ).toHaveText("Loading...");
    await page.clock.runFor(1900);
    await expect(page.getByRole("status")).toBeEmpty();
    await expect(
      page.getByRole("button", { name: "Rope 1", exact: true }),
    ).toHaveText("Loading...");
    await page.clock.runFor(100);
    const dialog = page.getByRole("dialog", { name: "Boom!" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await page.clock.runFor(1600);
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Rope 1, boom!" }),
    ).toBeFocused();
  });

  test("can restart during a rope pull without an old result arriving", async ({
    page,
  }) => {
    await page.goto("/games/boomboompirate");
    await page.evaluate(() => {
      Math.random = () => 0;
    });
    await page.getByRole("button", { name: "Start Game", exact: true }).click();
    await page.clock.install({ time: new Date("2026-11-05T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-05T12:01:00Z"));
    await page.getByRole("button", { name: "Rope 1", exact: true }).click();
    await page.clock.runFor(500);
    await page
      .getByRole("button", { name: "Restart Game", exact: true })
      .click();
    await page.getByRole("button", { name: "Start Game", exact: true }).click();
    await page.clock.runFor(4000);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status")).toBeEmpty();
    await expect(
      page.getByRole("button", { name: "Rope 1", exact: true }),
    ).toBeEnabled();
  });

  test("waits for the normal dice and movement timings without cycling or stepping", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/games/snakesandladders");
    await page.evaluate(() => {
      // Keep square 6 clear of snakes and ladders on every restart. A random
      // Game Update can appear after an isVisible check and block Players.
      window.addEventListener(
        "click",
        (event) => {
          if (!(event.target instanceof Element)) return;
          const button = event.target.closest("button");
          if (button?.textContent === "Start game!") {
            let seed = 2;
            Math.random = () => {
              seed = (seed * 1664525 + 1013904223) >>> 0;
              return seed / 4294967296;
            };
          } else if (button?.textContent.startsWith("Roll Dice")) {
            Math.random = () => 0.99;
          }
        },
        { capture: true },
      );
    });
    await page.getByRole("button", { name: "Start game!" }).click();
    await page.clock.install({ time: new Date("2026-11-05T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-05T12:01:00Z"));
    await page.getByRole("button", { name: /^Roll Dice/ }).click();
    const rolling = page.getByRole("button", {
      name: "Rolling...",
      exact: true,
    });
    await expect(rolling).toBeVisible();
    await expect(rolling.locator("svg")).toHaveCount(0);
    await page.clock.runFor(1000);
    await expect(page.getByRole("status")).toContainText("moves 6 places");
    await page.clock.runFor(2799);
    // The player remains at Start, rather than hopping through six squares.
    await expect(page.getByTestId("board")).not.toContainText("Player 1");
    await page.clock.runFor(1);
    await expect(page.getByTestId("board")).toContainText("Player 1");
    await expect(page.getByRole("dialog", { name: "Game Update" })).toHaveCount(
      0,
    );
    if (isMobile)
      await page.getByRole("button", { name: "Players", exact: true }).click();
    await page
      .getByRole("button", { name: "Restart Game", exact: true })
      .click();
    await page.getByRole("button", { name: "Start game!" }).click();
    await page.getByRole("button", { name: /^Roll Dice/ }).click();
    if (isMobile)
      await page.getByRole("button", { name: "Players", exact: true }).click();
    await page
      .getByRole("button", { name: "Restart Game", exact: true })
      .click();
    await page.getByRole("button", { name: "Start game!" }).click();
    await page.clock.runFor(5000);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("board")).not.toContainText("Player 1");
    await expect(
      page.getByRole("button", { name: /^Roll Dice/ }),
    ).toBeEnabled();
  });
});
