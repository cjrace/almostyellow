import { test, expect } from "@playwright/test";

test("Navigate to the whisky journal", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Cam's whisky journal" }).click();
  await expect(page).toHaveURL("/whiskyjournal");
  await expect(page).toHaveTitle("Whisky Journal | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Cam's whisky journal");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Almost Yellow");
});

test("Navigate to the film list", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Cam's film list" }).click();
  await expect(page).toHaveURL("/films");
  await expect(page).toHaveTitle("Films | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Cam's film list");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Almost Yellow");
});
