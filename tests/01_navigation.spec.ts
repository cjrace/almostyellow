import { test, expect } from "@playwright/test";

test("Can navigate to the cocktails page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Cocktail time!" }).click();
  await expect(page).toHaveURL("/cocktails");
  await expect(page.locator("h1")).toContainText("Cocktails");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
});

test("Can navigate to the games page and through its subpages", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "View our games" }).click();
  await expect(page).toHaveURL("/games");
  await expect(page.locator("h1")).toContainText("Our games");

  await page.getByRole("link", { name: "Irish bingo" }).click();
  await expect(page).toHaveURL("/games/irishbingo");
  await expect(page.locator("h1")).toContainText("Irish bingo");

  await page.getByRole("link", { name: "Games" }).click();
  await page.getByRole("link", { name: "Uno" }).click();
  await expect(page).toHaveURL("/games/uno");
  await expect(page.locator("h1")).toContainText("Uno");

  await page.getByRole("link", { name: "Games" }).click();
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
});

test("Navigate to the decision maker page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "How we make decisions" }).click();
  await expect(page).toHaveURL("/decisionmaker");
  await expect(page.locator("h1")).toContainText("The Decision Maker");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
});

test("Navigate to the holidays page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Our holidays!" }).click();
  await expect(page).toHaveURL("/holidays");
  await expect(page.locator("h1")).toContainText("Our trips and holidays");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
});

test("Navigate through admin pages", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Admin stuff" }).click();
  await expect(page).toHaveURL("/admin");
  await expect(page.locator("h1")).toContainText("Welcome to our admin page");

  await page.getByRole("link", { name: "Chopin Liszt" }).click();
  await expect(page).toHaveURL("/admin/chopinliszt");
  await expect(page.locator("h1")).toContainText("Chopin Liszt");

  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL("/admin");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
});

test("Jumping to home from 3 layer breadcrumb", async ({ page }) => {
  await page.goto("/games/irishbingo");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
});
