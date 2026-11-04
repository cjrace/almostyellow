import { test, expect } from "../playwright";

test.describe("A visitor on the homepage", () => {
  test("can open the whisky journal and come back", async ({ page }) => {
    await page.goto("/");

    await Promise.all([
      page.waitForURL("/whiskyjournal"),
      page.getByRole("link", { name: "Cam's whisky journal" }).click(),
    ]);
    await expect(page).toHaveTitle("Whisky Journal | Almost Yellow");
    await expect(page.locator("h1")).toContainText("Cam's whisky journal");

    await Promise.all([
      page.waitForURL("/"),
      page.getByRole("link", { name: "Home" }).click(),
    ]);
    await expect(page).toHaveTitle("Almost Yellow");
  });

  test("can open the film list and come back", async ({ page }) => {
    await page.goto("/");

    await Promise.all([
      page.waitForURL("/films"),
      page.getByRole("link", { name: "Cam's film list" }).click(),
    ]);
    await expect(page).toHaveTitle("Films | Almost Yellow");
    await expect(page.locator("h1")).toContainText("Cam's film list");

    await Promise.all([
      page.waitForURL("/"),
      page.getByRole("link", { name: "Home" }).click(),
    ]);
    await expect(page).toHaveTitle("Almost Yellow");
  });
});
