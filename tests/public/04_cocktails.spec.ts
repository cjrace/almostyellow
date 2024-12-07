import { test, expect } from "@playwright/test";

test("Can filter and search cocktails", async ({ page }) => {
  await page.goto("/cocktails");

  // Check that Bramble and Luigi are in the list
  await expect(page.locator("text=Manhattan")).toBeVisible();
  await expect(page.locator("text=Luigi")).toBeVisible();

  // Filter by gin
  await page.getByLabel("Filter by base spirit").selectOption("Gin");
  await expect(page.locator("text=Manhattan")).not.toBeVisible();
  await expect(page.locator("text=Luigi")).toBeVisible();

  // Clear filter
  await page.getByLabel("Filter by base spirit").selectOption("All spirits");

  await expect(page.locator("text=Manhattan")).toBeVisible();
  await expect(page.locator("text=Luigi")).toBeVisible();

  // Search for Luigi
  await page.getByPlaceholder("Search cocktail names...").fill("Luigi");
  await expect(page.locator("text=Luigi")).toBeVisible();
  await expect(page.locator("text=Manhattan")).not.toBeVisible();

  // Clear search
  await page.click('button[aria-label="Clear search query"]');
  await expect(page.locator("text=Luigi")).toBeVisible();
  await expect(page.locator("text=Manhattan")).toBeVisible();
});
