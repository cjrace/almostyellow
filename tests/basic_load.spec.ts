import { test, expect } from '@playwright/test';

test('Homepage has the title "Almost yellow"', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await page.waitForLoadState('load');

  await expect(page.locator('h1')).toContainText('Almost yellow');
  // await expect(page).toHaveTitle(/Almost yellow/); Change to this once there is a title set
});

test('Can navigate to the games page and find the "Games" heading', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.click('text=View our games');

  await page.waitForLoadState('load');

  await expect(page).toHaveURL('http://localhost:3000/games');
  await expect(page.locator('h1')).toContainText('Games');

  await page.click('text=Back to homepage');

  await page.waitForLoadState('load');
  await expect(page).toHaveURL('http://localhost:3000/');
});

test('Can navigate to the cocktails page and find the "Cocktails" heading', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.click('text=Cocktail time!');

  await page.waitForLoadState('load');

  await expect(page).toHaveURL('http://localhost:3000/cocktails');
  await expect(page.locator('h1')).toContainText('Cocktails');

  await page.click('text=Back to homepage');

  await page.waitForLoadState('load');
  await expect(page).toHaveURL('http://localhost:3000/');
});