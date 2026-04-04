import { test, expect } from "@playwright/test";

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
