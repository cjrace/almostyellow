import { test, expect, type Page } from "@playwright/test";

// Sets up the sliders and starts a race. Defaults to 2 cows and shortest
// duration for the fastest possible race.
async function startFastRace(page: Page, numCows = 2) {
  await page.goto("/games/cowrace");

  const cowSlider = page.getByRole("slider", { name: "Number of cows" });
  const durationSlider = page.getByRole("slider", { name: "Race duration" });

  // Default is 4 cows — adjust left/right to reach numCows
  const defaultCows = 4;
  const cowPresses = numCows - defaultCows;
  for (let i = 0; i < Math.abs(cowPresses); i++) {
    await cowSlider.press(cowPresses < 0 ? "ArrowLeft" : "ArrowRight");
  }

  // Default duration is 3 (Medium) — press left twice to reach 1 (Short/fastest)
  await durationSlider.press("ArrowLeft");
  await durationSlider.press("ArrowLeft");

  await page.getByRole("button", { name: "Start Race" }).click();
}

test("Cow race page loads with sliders", async ({ page }) => {
  await page.goto("/games/cowrace");

  await expect(
    page.getByRole("slider", { name: "Number of cows" }),
  ).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Race duration" }),
  ).toBeVisible();
});

test("Race duration slider can be used", async ({ page }) => {
  await page.goto("/games/cowrace");

  await expect(page.getByText("Race duration: Medium")).toBeVisible();

  const durationSlider = page.getByRole("slider", { name: "Race duration" });
  await expect(durationSlider).toBeVisible();
  await expect(durationSlider).toHaveAttribute("aria-valuenow", "3");

  // Move slider left to set a shorter race
  await durationSlider.press("ArrowLeft");
  await expect(durationSlider).toHaveAttribute("aria-valuenow", "2");
  await expect(page.getByText("Race duration: Short-Medium")).toBeVisible();

  // Move slider right past start to set a longer race
  await durationSlider.press("ArrowRight");
  await durationSlider.press("ArrowRight");
  await expect(durationSlider).toHaveAttribute("aria-valuenow", "4");
  await expect(page.getByText("Race duration: Medium-Long")).toBeVisible();
});

test("Number of cows slider can be used", async ({ page }) => {
  await page.goto("/games/cowrace");

  await expect(page.getByText("Number of racing cows: 4")).toBeVisible();

  const cowSlider = page.getByRole("slider", { name: "Number of cows" });
  await expect(cowSlider).toBeVisible();
  await expect(cowSlider).toHaveAttribute("aria-valuenow", "4");

  await cowSlider.press("ArrowRight");
  await expect(cowSlider).toHaveAttribute("aria-valuenow", "5");
  await expect(page.getByText("Number of racing cows: 5")).toBeVisible();
});

test("Final leaderboard appears once all cows finish", async ({ page }) => {
  await startFastRace(page, 2);

  // Leaderboard should not be visible during the race
  await expect(page.getByText("Final Leaderboard:")).not.toBeVisible();

  // Wait for the leaderboard — only renders when every cow has crossed
  await expect(page.getByText("Final Leaderboard:")).toBeVisible({
    timeout: 30000,
  });

  // Both cows must have individual place entries
  await expect(page.getByText(/^1st:/)).toBeVisible();
  await expect(page.getByText(/^2nd:/)).toBeVisible();
});

test("Every cow gets an individual entry in the leaderboard", async ({
  page,
}) => {
  // Use 4 cows so we exceed the old top-3 limit and catch regressions
  await startFastRace(page, 4);

  await expect(page.getByText("Final Leaderboard:")).toBeVisible({
    timeout: 30000,
  });

  // All four positions must appear individually
  await expect(page.getByText(/^1st:/)).toBeVisible();
  await expect(page.getByText(/^2nd:/)).toBeVisible();
  await expect(page.getByText(/^3rd:/)).toBeVisible();
  await expect(page.getByText(/^4th:/)).toBeVisible();

  // Old code showed a collapsed "Other finishers:" line — ensure that's gone
  await expect(page.getByText(/Other finishers/)).not.toBeVisible();
});

test("Button changes to 'Start new race' only after all cows finish", async ({
  page,
}) => {
  await startFastRace(page, 2);

  // While the race is running the button should read "Cancel Race"
  await expect(page.getByRole("button", { name: "Cancel Race" })).toBeVisible();

  // After all cows cross the finish line, it flips to "Start new race"
  await expect(page.getByText("Final Leaderboard:")).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "Start new race" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancel Race" }),
  ).not.toBeVisible();
});

test("All cows are at the finish line when the race ends", async ({ page }) => {
  await startFastRace(page, 2);

  await expect(page.getByText("Final Leaderboard:")).toBeVisible({
    timeout: 30000,
  });

  // Read each cow's x translation from the computed CSS transform.
  // If a cow stopped early (old behaviour: race ends on first finisher) its
  // x value would be less than the lead cow's, so the spread would be large.
  // With correct behaviour every cow reaches the finish line, so all x values
  // should be equal (within a small rounding tolerance).
  const xPositions = await page.evaluate(() => {
    const cows = document.querySelectorAll('img[alt^="Cow "]');
    return Array.from(cows).map((cow) => {
      const matrix = new DOMMatrix(getComputedStyle(cow).transform);
      return matrix.m41; // x component of the 4×4 transform matrix
    });
  });

  expect(xPositions.length).toBe(2);

  // Every cow must have moved forward
  xPositions.forEach((x) => {
    expect(x).toBeGreaterThan(0);
  });

  // All cows must be at the same x position (the finish line)
  const maxX = Math.max(...xPositions);
  xPositions.forEach((x) => {
    expect(Math.abs(x - maxX)).toBeLessThan(5);
  });
});

test("Can start a new race after the previous one finishes", async ({
  page,
}) => {
  await startFastRace(page, 2);

  await expect(page.getByText("Final Leaderboard:")).toBeVisible({
    timeout: 30000,
  });

  await page.getByRole("button", { name: "Start new race" }).click();

  // Should be back on the setup screen
  await expect(
    page.getByRole("slider", { name: "Number of cows" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Race" })).toBeVisible();
  await expect(page.getByText("Final Leaderboard:")).not.toBeVisible();
});
