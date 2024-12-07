import { test, expect } from "@playwright/test";

test("Films Page Test", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Cam's film list" }).click();

  await expect(page).toHaveTitle("Films | Almost Yellow");

  // Check the seeded films are loaded
  await expect(page.locator("#main-content")).toContainText(/Seven Samurai/);
  await expect(page.locator("#main-content")).toContainText(
    /Final Destination/,
  );

  // Check only Seven Samurai is there after playing with filters
  await page.getByRole("button", { name: "Sort and filter" }).click();
  await page.getByRole("textbox", { name: "IMDB top" }).click();
  await page.getByRole("option", { name: "Top 30", exact: true }).click();

  await expect(page.locator("#main-content")).toContainText(/Seven Samurai/);
  await expect(page.locator("#main-content")).not.toContainText(
    /Final Destination/,
  );

  // Check both are there after clearing filters
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.locator("#main-content")).toContainText(/Seven Samurai/);
  await expect(page.locator("#main-content")).toContainText(
    /Final Destination/,
  );
});

test("Can copy film names to clipboard", async ({ page, context }) => {
  // Grant clipboard permissions to browser context when not in firefox
  // firefox works without permissions, and doesn't recognise it when granted
  const browser = context.browser();
  if (browser && browser.browserType().name() !== "firefox") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }

  await page.goto("/films");
  await page
    .getByRole("button", { name: "Copy film names to clipboard" })
    .click();

  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(clipboardText).toContain("Final Destination (2000)");
  expect(clipboardText).toContain("Seven Samurai (1954)");
});

const fs = require("fs");
test("Download CSV and check contents", async ({ page }) => {
  await page.goto("/films");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);

  const path = await download.path();
  const csv = fs.readFileSync(path, "utf-8");
  const rows = csv.split("\n");

  expect(rows.length).toBeGreaterThan(50);
});

test("Can search films by name", async ({ page }) => {
  await page.goto("/films");
  await page.fill('input[placeholder="Search film titles..."]', "Seven");

  await expect(page.locator("#main-content")).toContainText(/Seven Samurai/);
  await expect(page.locator("#main-content")).not.toContainText(
    /Final Destination/,
  );

  // Clear search and check both films are there
  await page.click('button[aria-label="Clear search query"]');
  await expect(page.locator("#main-content")).toContainText(/Seven Samurai/);
  await expect(page.locator("#main-content")).toContainText(
    /Final Destination/,
  );
});
