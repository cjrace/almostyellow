import { test, expect, type Page } from "../playwright";
import { expectGameFits } from "../gameplay";
import { confettiBadge, mockConfetti } from "../confetti";

// Sets up the race, then freezes time so the test decides how far it runs
async function startRace(
  page: Page,
  { cows, length }: { cows: number; length: "Short" | "Medium" | "Long" },
) {
  await page.goto("/games/cowrace");
  const slider = page.getByRole("slider", { name: "Number of cows" });
  await slider.focus();
  await slider.press("Home");
  for (let i = 2; i < cows; i++) await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", String(cows));
  await page.getByText(length, { exact: false }).first().click();
  await page.clock.install({ time: new Date("2026-11-07T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-07T12:01:00Z"));
  await page.getByRole("button", { name: "Start race" }).click();
  await expect(page.getByRole("button", { name: "Cancel race" })).toBeFocused();
}

// Mantine's dialog animates on timers, so let the frozen clock tick on until
// the dialog has appeared or gone
async function tickUntilDialog(page: Page, shown: boolean) {
  const dialog = page.getByRole("dialog", { name: "Race results" });
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return dialog.isVisible();
    })
    .toBe(shown);
}

// The right edge of a cow against the left edge of the finish line
async function gapToFinish(page: Page, cow: number) {
  return page.evaluate((number) => {
    const lane = document
      .querySelector(`[data-testid="cow-${String(number)}"]`)
      ?.closest("div[class*='lane']");
    const cowBox = lane
      ?.querySelector("[data-testid^='cow-']")
      ?.getBoundingClientRect();
    const finish = lane
      ?.querySelector("[data-testid='finish']")
      ?.getBoundingClientRect();
    if (!cowBox || !finish) throw new Error("The lane is missing");
    return finish.left - cowBox.right;
  }, cow);
}

test.describe("A spectator at the cow race", () => {
  test.beforeEach(async ({ page }) => {
    await mockConfetti(page);
  });

  test("can set up a race, watch it and see the full finishing order", async ({
    page,
  }) => {
    await test.step("Given a race of four cows over a short distance", async () => {
      await startRace(page, { cows: 4, length: "Short" });
      await expect(page.getByTestId("field")).toHaveCount(4);
      await expect(page.getByTestId("finish")).toHaveCount(4);
      await expect(page.getByTestId("winner")).toBeHidden();
    });

    await test.step("When the cows are halfway", async () => {
      await page.clock.runFor(3000);
      await expect(page.getByRole("status")).toContainText("is in the lead");
      await expect(page.getByTestId("winner")).toBeHidden();
    });

    await test.step("Then every cow finishes and the winner is shown", async () => {
      await page.clock.runFor(4000);
      await expect(page.getByTestId("winner")).toContainText(/Cow \d wins!/);
      await expect(page.getByRole("status")).toContainText("wins the race");
      for (let cow = 1; cow <= 4; cow++) {
        expect(Math.abs(await gapToFinish(page, cow))).toBeLessThanOrEqual(1);
      }
      await expect(confettiBadge(page)).toBeVisible();
    });

    await test.step("And the results list every cow once, in order", async () => {
      await tickUntilDialog(page, true);
      const results = page.getByRole("dialog", { name: "Race results" });
      await expect(results).toBeVisible();
      const order = results.getByRole("list", { name: "Finishing order" });
      await expect(order.getByRole("listitem")).toHaveCount(4);
      const names = await order.getByRole("listitem").allTextContents();
      expect(new Set(names).size).toBe(4);
      await expect(results).toContainText(
        (await page.getByTestId("winner").textContent()) ?? "",
      );
    });

    await test.step("And they can race again without reloading", async () => {
      await page
        .getByRole("dialog", { name: "Race results" })
        .getByRole("button", { name: "Race again" })
        .click();
      await expect(
        page.getByRole("button", { name: "Cancel race" }),
      ).toBeFocused();
      await expect(page.getByTestId("field")).toHaveCount(4);
      await expect(page.getByTestId("winner")).toBeHidden();
    });
  });

  test("can close the results with the keyboard and change the settings", async ({
    page,
  }) => {
    await startRace(page, { cows: 2, length: "Short" });
    await page.clock.runFor(8500);
    await expect(page.getByTestId("winner")).toBeVisible();
    await tickUntilDialog(page, true);
    const results = page.getByRole("dialog", { name: "Race results" });
    await expect(results).toBeVisible();

    await page.keyboard.press("Escape");
    await tickUntilDialog(page, false);
    await expect(results).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Race again" }),
    ).toBeFocused();

    await page.getByRole("button", { name: "Change settings" }).click();
    await expect(
      page.getByRole("button", { name: "Start race" }),
    ).toBeFocused();
    await expect(
      page.getByRole("slider", { name: "Number of cows" }),
    ).toHaveAttribute("aria-valuenow", "2");
  });

  test("can cancel a race and no result arrives afterwards", async ({
    page,
  }) => {
    await startRace(page, { cows: 6, length: "Medium" });
    await page.clock.runFor(3000);
    await page.getByRole("button", { name: "Cancel race" }).click();
    await expect(
      page.getByRole("button", { name: "Start race" }),
    ).toBeFocused();
    await page.clock.runFor(30000);
    await expect(page.getByTestId("winner")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("Race cancelled");
    // No lane is left highlighted as the leader
    await expect(
      page.getByTestId("lanes").locator("[class*='lead']"),
    ).toHaveCount(0);
  });

  test("sees each cow stay on the track and finish on the line at any width", async ({
    page,
  }) => {
    await startRace(page, { cows: 10, length: "Short" });
    for (const width of [360, 1000, 480]) {
      await page.setViewportSize({ width, height: 800 });
      await page.clock.runFor(1500);
      for (let cow = 1; cow <= 10; cow++) {
        // Never past the finish line while the race is on
        expect(await gapToFinish(page, cow)).toBeGreaterThanOrEqual(-1);
      }
    }
    await page.clock.runFor(8000);
    await expect(page.getByTestId("winner")).toBeVisible();
    for (let cow = 1; cow <= 10; cow++) {
      expect(Math.abs(await gapToFinish(page, cow))).toBeLessThanOrEqual(1);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false);
  });
});

test.describe("A spectator who requests reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("sees the cows jump in steps and no confetti", async ({ page }) => {
    const requests: string[] = [];
    await page.route("https://run.confettipage.com/**", (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    await startRace(page, { cows: 3, length: "Short" });

    const position = () =>
      page
        .getByTestId("cow-1")
        .evaluate((element) => element.style.getPropertyValue("--p"));
    await page.clock.runFor(1600);
    const first = Number(await position());
    expect(first * 8).toBe(Math.round(first * 8));
    await page.clock.runFor(1000);
    const second = Number(await position());
    expect(second * 8).toBe(Math.round(second * 8));

    await page.clock.runFor(8000);
    await expect(page.getByTestId("winner")).toBeVisible();
    expect(requests).toEqual([]);
  });
});

// The race fills the screen and never scrolls on a phone, either way up. The
// controls sit above the track when upright and beside it when sideways.
for (const [view, viewport] of [
  ["upright", undefined],
  ["sideways", { width: 852, height: 393 }],
] as const) {
  test.describe(
    `A spectator on a phone held ${view}`,
    { tag: "@phone" },
    () => {
      if (viewport) test.use({ viewport });

      test("sees the whole race without scrolling, even with ten cows", async ({
        page,
      }) => {
        await mockConfetti(page);
        await page.goto("/games/cowrace");
        await page.getByRole("slider", { name: "Number of cows" }).press("End");
        await expectGameFits(page);

        await startRace(page, { cows: 10, length: "Short" });
        await expect(page.getByTestId("finish")).toHaveCount(10);
        await expectGameFits(page);

        await page.clock.runFor(8000);
        await expect(page.getByTestId("winner")).toBeVisible();
        await tickUntilDialog(page, true);
        const dialog = page.getByRole("dialog", { name: "Race results" });
        // Measure it once it has stopped popping in
        await expect
          .poll(async () => {
            await page.clock.runFor(100);
            return dialog.evaluate((el) => getComputedStyle(el).opacity);
          })
          .toBe("1");
        const box = await dialog.boundingBox();
        const size = page.viewportSize();
        if (!box || !size) throw new Error("The results dialog is missing");
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(size.height);

        await page.keyboard.press("Escape");
        await tickUntilDialog(page, false);
        await expectGameFits(page);
      });
    },
  );
}
