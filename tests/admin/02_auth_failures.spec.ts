import { test, expect } from "@playwright/test";
import { getCredentials } from "./helpers";

async function tryLogin(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("e.g. simply@thebest.co.uk").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("Rejects a wrong password", async ({ page }) => {
  const { email } = getCredentials();

  await tryLogin(page, email, "not-the-password");

  await expect(page.getByText("Invalid credentials.")).toBeVisible();
  await expect(page).toHaveURL("/admin/login");

  // Still locked out of the admin area
  await page.goto("/admin/chopinliszt");
  await page.waitForURL("**/admin/login?callbackUrl=**");
});

test("Rejects an unknown user", async ({ page }) => {
  await tryLogin(page, "nobody@example.com", "not-the-password");

  await expect(page.getByText("Invalid credentials.")).toBeVisible();
  await expect(page).toHaveURL("/admin/login");
});

test("Signing out locks the admin area again", async ({ page }) => {
  const { email, password } = getCredentials();

  await Promise.all([
    page.waitForURL("/", { timeout: 15_000 }),
    tryLogin(page, email, password),
  ]);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/admin/chopinliszt");
  await page.waitForURL("**/admin/login?callbackUrl=**");
  await expect(page.getByText("Limes")).not.toBeVisible();
});
