import { test, expect } from '@playwright/test';

test('Homepage has the title "Almost yellow"', async ({ page }) => {
  // Start from the index page (the baseURL is set via the webServer in playwright.config.ts)
  await page.goto('http://localhost:3000/');

  await expect(page.locator('h1')).toContainText('Almost yellow');
  // await expect(page).toHaveTitle(/Almost yellow/); Change to this once there is a title set
});

test('Can navigate to the Games page and find the "Games" heading', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.click('text=View our games');
  await expect(page).toHaveURL('http://localhost:3000/games');

  await expect(page.locator('h1')).toContainText('Games');
});
