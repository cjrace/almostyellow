import { test, expect } from '@playwright/test';

test('Homepage has the title "Almost yellow"', async ({ page }) => {
  await page.goto('/');
  // Check the h1 exists
  await expect(page.locator('h1')).toContainText('Almost yellow');
  // Check the overall website title exists
  await expect(page).toHaveTitle(/Almost yellow/);
});
