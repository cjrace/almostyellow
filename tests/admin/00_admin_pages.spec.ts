import { test, expect } from "@playwright/test";

test("Can sign in and navigate admin", async ({ page }) => {
  const email = process.env.TEST_EMAIL as string;
  const password = process.env.TEST_PASSWORD as string;

  if (!email || !password) {
    console.error("Missing environment variables: TEST_EMAIL or TEST_PASSWORD");
    process.exit(1);
  }

  await page.goto("/admin/login");
  await page.getByPlaceholder("e.g. simply@thebest.co.uk").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Almost Yellow");
  await page.getByRole("link", { name: "Admin stuff" }).click();

  await expect(page).toHaveTitle("Admin | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Welcome to our admin page");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.getByRole("link", { name: "Chopin Liszt" }).click();
  await expect(page).toHaveURL("/admin/chopinliszt");
  await expect(page).toHaveTitle("Chopin Liszt | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Chopin Liszt");

  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL("/admin");
  await expect(page).toHaveTitle("Admin | Almost Yellow");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Almost Yellow");
});

test("Redirected to login if tried to get to admin pages while not signed in", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(
    "/admin/login?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fadmin",
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );

  await page.goto("/admin/chopinliszt");
  await expect(page).toHaveURL(
    "http://localhost:3000/admin/login?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fadmin%2Fchopinliszt",
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );

  await page.goto("/admin/dummylink");
  await expect(page).toHaveURL(
    "http://localhost:3000/admin/login?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fadmin%2Fdummylink",
  );
  await expect(page).toHaveTitle("Login | Almost Yellow");
  await expect(page.locator("h1")).toContainText(
    "Want to access the good stuff?",
  );
});
