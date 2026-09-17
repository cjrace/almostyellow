import { test, expect } from "@playwright/test";

test("Can view and search recipes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Our recipes" }).click();

  await expect(page).toHaveTitle("Recipes | Almost Yellow");

  const counter = page.getByText(/Showing \d+ of \d+ recipes/);
  await expect(counter).toBeVisible();

  const bolognese = page.getByRole("heading", { name: "Spaghetti bolognese" });
  const pancakes = page.getByRole("heading", { name: "Pancakes" });

  await expect(bolognese).toBeVisible();
  await expect(pancakes).toBeVisible();

  // Search for pancakes
  await page.getByPlaceholder("Search recipe names...").fill("Pancakes");
  await expect(pancakes).toBeVisible();
  await expect(bolognese).toBeHidden();

  // Clear search
  await page.click('button[aria-label="Clear search query"]');
  await expect(bolognese).toBeVisible();
  await expect(pancakes).toBeVisible();
});
