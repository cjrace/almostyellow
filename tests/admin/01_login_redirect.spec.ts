import { test, expect } from "@playwright/test";
import { getCredentials } from "./helpers";

test("Redirected back to the originally requested admin page after login", async ({
  page,
}) => {
  const { email, password } = getCredentials();

  await page.goto("/admin/holidays");
  await page.waitForURL(
    "**/admin/login?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fadmin%2Fholidays",
  );

  await page.getByPlaceholder("e.g. simply@thebest.co.uk").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await Promise.all([
    page.waitForURL("/admin/holidays", { timeout: 15_000 }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);

  await expect(page).toHaveTitle("Holidays | Almost Yellow");
  await expect(page.locator("h1")).toContainText("Our trips and holidays");
});

test("Redirected back to a deep admin route with an id after login", async ({
  page,
}) => {
  const { email, password } = getCredentials();

  await page.goto(
    "/admin/whiskyjournal/33675c13-6835-4cc8-b7de-2823b37ae78a/edit/",
  );
  await page.waitForURL(
    "**/admin/login?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fadmin%2Fwhiskyjournal%2F33675c13-6835-4cc8-b7de-2823b37ae78a%2Fedit",
  );

  await page.getByPlaceholder("e.g. simply@thebest.co.uk").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await Promise.all([
    page.waitForURL(
      "/admin/whiskyjournal/33675c13-6835-4cc8-b7de-2823b37ae78a/edit",
      { timeout: 15_000 },
    ),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);
});

test("Does not honour an off-site callback URL", async ({ page }) => {
  const { email, password } = getCredentials();

  await page.goto("/admin/login?callbackUrl=https://evil.example.com");

  await page.getByPlaceholder("e.g. simply@thebest.co.uk").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await Promise.all([
    // Rejected callback URLs fall back to the same default landing page as
    // a plain /admin/login visit with no callbackUrl at all - crucially,
    // never the attacker-supplied https://evil.example.com.
    page.waitForURL("/", { timeout: 15_000 }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);

  await expect(page).toHaveTitle("Almost Yellow");
});

test("Does not honour a callback URL outside the admin area", async ({
  page,
}) => {
  const { email, password } = getCredentials();

  await page.goto(
    "/admin/login?callbackUrl=http://localhost:3000/some-other-page",
  );

  await page.getByPlaceholder("e.g. simply@thebest.co.uk").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await Promise.all([
    page.waitForURL("/", { timeout: 15_000 }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);

  await expect(page).toHaveTitle("Almost Yellow");
});
