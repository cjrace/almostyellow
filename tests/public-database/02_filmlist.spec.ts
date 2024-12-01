import { test, expect } from "@playwright/test";

test("Films Page Test", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Cam's film list" }).click();

  await expect(page).toHaveTitle("Films | Almost Yellow");

  // Check the seeded films are loaded
  await expect(page.locator("#main-content")).toContainText(/Seven Samurai/);
  await expect(page.locator("#main-content")).toContainText(
    /Final Destination/,
  );

  // Check only Seven Samurai is there after playing with filters
  await page.getByRole("button", { name: "Sort and filter" }).click();
  await page.getByRole("textbox", { name: "IMDB top" }).click();
  await page.getByRole("option", { name: "Top 30", exact: true }).click();

  await expect(page.locator("#main-content")).toContainText(/Seven Samurai/);
  await expect(page.locator("#main-content")).not.toContainText(
    /Final Destination/,
  );

  // Check both are there after clearing filters
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.locator("#main-content")).toContainText(/Seven Samurai/);
  await expect(page.locator("#main-content")).toContainText(
    /Final Destination/,
  );
});
