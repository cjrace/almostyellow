import { expect, type Page } from "@playwright/test";
import { users } from "../firebase/fixtures";

// Synthetic users that only exist in the Firebase Auth emulator
export function getCredentials() {
  return users.alice;
}

// Can sign in to Firebase, but is not on the allowlist
export function getUnauthorisedCredentials() {
  return users.mallory;
}

// The other authorised user, for tests that need two people
export function getSecondCredentials() {
  return users.bob;
}

// Signs in as the first authorised user, landing on the homepage
export async function signIn(page: Page) {
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
}
