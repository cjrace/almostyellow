import { test, expect } from "@playwright/test";

test("Can filter and search cocktails", async ({ page }) => {
  await page.goto("/cocktails");

  const counter = page.getByText(/Showing \d+ of \d+ cocktails/);
  await expect(counter).toBeVisible();

  const manhattan = page.getByRole("heading", { name: "Manhattan" });
  const luigi = page.getByRole("heading", { name: "Luigi" });

  await expect(manhattan).toBeVisible();
  await expect(luigi).toBeVisible();

  // Filter by gin
  await page.getByLabel("Filter by base spirit").selectOption("Gin");
  await expect(manhattan).toBeHidden();
  await expect(luigi).toBeVisible();

  // Clear filter
  await page.getByLabel("Filter by base spirit").selectOption("All spirits");
  await expect(manhattan).toBeVisible();
  await expect(luigi).toBeVisible();

  // Search for Luigi
  await page.getByPlaceholder("Search cocktail names...").fill("Luigi");
  await expect(luigi).toBeVisible();
  await expect(manhattan).toBeHidden();

  // Clear search
  await page.click('button[aria-label="Clear search query"]');
  await expect(luigi).toBeVisible();
  await expect(manhattan).toBeVisible();
});
