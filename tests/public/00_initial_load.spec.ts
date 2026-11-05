import { test, expect } from "../playwright";

test('The homepage shows the "Almost Yellow" title', async ({ page }) => {
  await page.goto("/");
  // Check the h1 exists
  await expect(page.locator("h1")).toContainText("Almost Yellow");
  // Check the overall website title exists
  await expect(page).toHaveTitle("Almost Yellow");
});
