import { test, expect } from "@playwright/test";

// TODO: Setup auth config so that the tests can sign in

/*
test("Navigate through admin pages", async ({ page }) => {
    await page.goto("/");
  
    await page.getByRole("link", { name: "Admin stuff" }).click();
    await expect(page).toHaveURL("/admin");
    await expect(page).toHaveTitle("Admin | Almost Yellow");
    await expect(page.locator("h1")).toContainText("Welcome to our admin page");
  
    await page.getByRole("link", { name: "Chopin Liszt" }).click();
    await expect(page).toHaveURL("/admin/chopinliszt");
    await expect(page).toHaveTitle("Chopin Liszt | Almost Yellow");
    await expect(page.locator("h1")).toContainText("Chopin Liszt");
  
    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page).toHaveURL("/admin");
    await expect(page).toHaveTitle("Admin | Almost Yellow");
  
    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle("Almost Yellow");
  });
  */

// TODO: clear auth and check that admin pages redirect to the login page
