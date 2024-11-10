import { test, expect } from "@playwright/test";

test("Can navigate to the cocktails page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Cocktail time!" }).click();
  await expect(page).toHaveURL("/cocktails");
  await expect(page).toHaveTitle("Cocktails | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Cocktails");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Almost Yellow");
});

test("Can navigate to the games page and through its subpages", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "View our games" }).click();
  await expect(page).toHaveURL("/games");
  await expect(page).toHaveTitle("Games | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Our games");

  await page.getByRole("link", { name: "Irish Bingo" }).click();
  await expect(page).toHaveTitle("Irish Bingo | Almost Yellow");
  await expect(page).toHaveURL("/games/irishbingo");
  await expect(page.locator("h1")).toContainText("Irish Bingo");

  await page.getByLabel("Back to our games list").click();
  await page.getByRole("link", { name: "Uno" }).click();
  await expect(page).toHaveTitle("Uno | Almost Yellow");
  await expect(page).toHaveURL("/games/uno");
  await expect(page.locator("h1")).toContainText("Uno");

  await page.getByLabel("Back to our games list").click();
  await page.getByRole("link", { name: "Snakes and Ladders" }).click();
  await expect(page).toHaveTitle("Snakes and Ladders | Almost Yellow");
  await expect(page).toHaveURL("/games/snakesandladders");
  await expect(page.locator("h1")).toContainText("Snakes");

  await page.getByLabel("Back to our games list").click();
  await page.getByRole("link", { name: "Boom Boom Pirate" }).click();
  await expect(page).toHaveTitle("Boom Boom Pirate | Almost Yellow");
  await expect(page).toHaveURL("/games/boomboompirate");
  await expect(page.locator("h1")).toContainText("Boom");

  await page.getByLabel("Back to our games list").click();
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Almost Yellow");
});

test("Navigate to the decision maker page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "How we make decisions" }).click();
  await expect(page).toHaveURL("/decisionmaker");
  await expect(page).toHaveTitle("Decision Maker | Almost Yellow");
  await expect(page.locator("h1")).toContainText("The Decision Maker");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Almost Yellow");
});

test("Navigate to the holidays page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Our holidays!" }).click();
  await expect(page).toHaveURL("/holidays");
  await expect(page).toHaveTitle("Holidays | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Our trips and holidays");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Almost Yellow");
});
