import { test, expect } from '@playwright/test';

test('Homepage has the title "Almost yellow"', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Almost yellow');
  await expect(page).toHaveTitle(/Almost yellow/);
});
