import { test, expect } from "@playwright/test";

test("Whisky Journal Page Test", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Cam's whisky journal" }).click();

  await expect(page).toHaveTitle("Whisky Journal | Almost Yellow");

  // Check the seeded whisky entries are loaded
  await expect(page.locator("#main-content")).toContainText(
    /Talisker 10 Year Old/,
  );
  await expect(page.locator("#main-content")).toContainText(
    /Johnnie Walker Black Label/,
  );

  // Check only Talisker is there after playing with filters
  await page.getByRole("button", { name: "Sort and filter" }).click();
  await page.getByPlaceholder("Select distillery").click();
  await page.getByRole("option", { name: "Talisker" }).click();

  await expect(page.locator("#main-content")).toContainText(
    /Talisker 10 Year Old/,
  );
  await expect(page.locator("#main-content")).not.toContainText(
    /Johnnie Walker Black Label/,
  );

  // Check both are there after clearing filters
  await page.getByRole("button", { name: "Clear All Filters" }).click();
  await expect(page.locator("#main-content")).toContainText(
    /Talisker 10 Year Old/,
  );
  await expect(page.locator("#main-content")).toContainText(
    /Johnnie Walker Black Label/,
  );
});

test("Can search whiskies by name", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Cam's whisky journal" }).click();
  await page.fill('input[placeholder="Search whisky names..."]', "Talisker");

  await expect(page.locator("#main-content")).toContainText(
    /Talisker 10 Year Old/,
  );
  await expect(page.locator("#main-content")).not.toContainText(
    /Johnnie Walker Black Label/,
  );

  // Clear search and check both whiskies are there
  await page.click('button[aria-label="Clear search query"]');
  await expect(page.locator("#main-content")).toContainText(
    /Talisker 10 Year Old/,
  );
  await expect(page.locator("#main-content")).toContainText(
    /Johnnie Walker Black Label/,
  );
});

const fs = require("fs");
test("Download CSV and check contents", async ({ page }) => {
  await page.goto("/whiskyjournal");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);

  const path = await download.path();
  const csv = fs.readFileSync(path, "utf-8");
  const rows = csv.split("\n");

  expect(rows.length).toBeGreaterThan(30);
});
