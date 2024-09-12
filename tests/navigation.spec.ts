import { test, expect } from '@playwright/test';

test('Can navigate to the cocktails page', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Cocktail time!');
    await expect(page).toHaveURL('/cocktails');
    await expect(page.locator('h1')).toContainText('Cocktails');

    await page.click('text=Back to homepage');
    await expect(page).toHaveURL('/');
});

test('Can navigate to the games page and through its subpages', async ({ page }) => {
    await page.goto('/');

    await page.click('text=View our games');
    await expect(page).toHaveURL('/games');
    await expect(page.locator('h1')).toContainText('games');

    await page.click('text=Irish bingo');
    await expect(page).toHaveURL('/games/irishbingo');

    await page.click('text=Back to games');
    await page.click('text=Uno');
    await expect(page).toHaveURL('/games/uno');

    await page.click('text=Back to games');
    await expect(page).toHaveURL('/games');

    await page.click('text=Back to homepage');
    await expect(page).toHaveURL('/');
});

test('Navigate through admin pages', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Admin area');
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('Welcome to our admin page');

    await page.click('text=Chopin Liszt');
    await expect(page).toHaveURL('/admin/chopinliszt');
    await expect(page.locator('h1')).toContainText('Chopin Liszt');

    await page.click('text=Back to admin');
    await expect(page).toHaveURL('/admin');

    await page.click('text=Back to homepage');
    await expect(page).toHaveURL('/');
});