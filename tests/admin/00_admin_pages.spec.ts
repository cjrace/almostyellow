import { test, expect } from "../playwright";
import { getCredentials } from "./helpers";
import { ENCODED_BASE_URL } from "../ports.mts";

test("Can sign in and navigate admin", async ({ page }) => {
  const { email, password } = getCredentials();

  await page.goto("/admin/login");
  const emailInput = page.getByPlaceholder("e.g. simply@thebest.co.uk");
  await expect(emailInput).toBeEditable();
  await emailInput.fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await Promise.all([
    page.waitForURL("/", { timeout: 15_000 }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);
  await expect(page).toHaveTitle("Almost Yellow");
  await page.getByRole("link", { name: "Admin stuff" }).click();

  await expect(page).toHaveTitle("Admin | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Admin");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.getByRole("link", { name: "Chopin Liszt" }).click();
  await expect(page).toHaveURL("/admin/chopinliszt");
  await expect(page).toHaveTitle("Chopin Liszt | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Chopin Liszt");

  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL("/admin");
  await expect(page).toHaveTitle("Admin | Almost Yellow");

  await page.getByRole("link", { name: "Our Holidays!" }).click();
  await expect(page).toHaveURL("/admin/holidays");
  await expect(page).toHaveTitle("Holidays | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Our trips and holidays");

  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL("/admin");
  await expect(page).toHaveTitle("Admin | Almost Yellow");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Almost Yellow");
});

test.describe("A signed in user on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("sees the holidays timeline in a narrow column in the middle of the page", async ({
    page,
  }) => {
    const { email, password } = getCredentials();
    await page.goto("/admin/login");
    const emailInput = page.getByPlaceholder("e.g. simply@thebest.co.uk");
    await expect(emailInput).toBeEditable();
    await emailInput.fill(email);
    await page.getByPlaceholder("Enter password").fill(password);
    await Promise.all([
      page.waitForURL("/", { timeout: 15_000 }),
      page.getByRole("button", { name: "Log in" }).click(),
    ]);
    await page.goto("/admin/holidays");
    await expect(page.locator("h1")).toContainText("Our trips and holidays");

    // The timeline's text is short and left-aligned, so a wide column leaves
    // it sitting left of centre with empty space to its right
    const column = await page
      .locator("#main-content > .mantine-Container-root")
      .boundingBox();
    const screenWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    if (!column) throw new Error("The holidays column is missing");
    expect(
      Math.abs(column.x + column.width / 2 - screenWidth / 2),
    ).toBeLessThan(2);
    expect(column.width).toBeLessThanOrEqual(540);
  });
});

test("Redirected to login if tried to get to admin pages while not signed in", async ({
  page,
}) => {
  // Admin
  await page.goto("/admin");
  await page.waitForURL(
    `**/admin/login?callbackUrl=${ENCODED_BASE_URL}%2Fadmin`,
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );

  // Chopin Liszt
  await page.goto("/admin/chopinliszt");
  await page.waitForURL(
    `**/admin/login?callbackUrl=${ENCODED_BASE_URL}%2Fadmin%2Fchopinliszt`,
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );

  // Holidays
  await page.goto("/admin/holidays");
  await page.waitForURL(
    `**/admin/login?callbackUrl=${ENCODED_BASE_URL}%2Fadmin%2Fholidays`,
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );

  // Whisky Journal
  await page.goto("/admin/whiskyjournal/add");
  await page.waitForURL(
    `**/admin/login?callbackUrl=${ENCODED_BASE_URL}%2Fadmin%2Fwhiskyjournal%2Fadd`,
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );
  await page.goto(
    "/admin/whiskyjournal/33675c13-6835-4cc8-b7de-2823b37ae78a/edit/",
  );
  await page.waitForURL(
    `**/admin/login?callbackUrl=${ENCODED_BASE_URL}%2Fadmin%2Fwhiskyjournal%2F33675c13-6835-4cc8-b7de-2823b37ae78a%2Fedit`,
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );

  // Dummy link
  await page.goto("/admin/dummylink");
  await page.waitForURL(
    `**/admin/login?callbackUrl=${ENCODED_BASE_URL}%2Fadmin%2Fdummylink`,
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );

  // Films
  await page.goto("/admin/films/add");
  await page.waitForURL(
    `**/admin/login?callbackUrl=${ENCODED_BASE_URL}%2Fadmin%2Ffilms%2Fadd`,
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );
  await page.goto("/admin/films/33675c13-6835-4cc8-b7de-2823b37ae78a/edit/");
  await page.waitForURL(
    `**/admin/login?callbackUrl=${ENCODED_BASE_URL}%2Fadmin%2Ffilms%2F33675c13-6835-4cc8-b7de-2823b37ae78a%2Fedit`,
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );
});
