import { test, expect } from "@playwright/test";

test("Whisky Journal Page Test", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Cam's whisky journal" }).click();

  await expect(page).toHaveTitle("Whisky Journal | Almost Yellow");

  // Check the seeded whisky entries are loaded
  await expect(page.locator("#main-content")).toContainText(
    /Talisker 10 Year Old/,
  );
  await expect(page.locator("#main-content")).toContainText(
    /Johnnie Walker Double Black/,
  );

  // Check only Talisker is there after playing with filters
  await page.getByPlaceholder("Select distillery").click();
  await page.getByRole("option", { name: "Talisker" }).click();

  await expect(page.locator("#main-content")).toContainText(
    /Talisker 10 Year Old/,
  );
  await expect(page.locator("#main-content")).not.toContainText(
    /Johnnie Walker Double Black/,
  );

  // Check both are there after clearing filters
  await page.getByRole("button", { name: "Clear All Filters" }).click();
  await expect(page.locator("#main-content")).toContainText(
    /Talisker 10 Year Old/,
  );
  await expect(page.locator("#main-content")).toContainText(
    /Johnnie Walker Double Black/,
  );
});
