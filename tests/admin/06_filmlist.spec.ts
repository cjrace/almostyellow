import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { getCredentials } from "./helpers";

// Every test running at the same time shares the one list, so this only
// changes a film it adds itself, with a name of its own

async function signInTo(page: Page, path: string) {
  const { email, password } = getCredentials();
  await page.goto(`/admin/login?callbackUrl=http://localhost:3000${path}`);
  await page.getByPlaceholder("e.g. simply@thebest.co.uk").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await Promise.all([
    page.waitForURL(path, { timeout: 15_000 }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);
}

function card(page: Page, text: string) {
  return page.locator(".mantine-Paper-root").filter({ hasText: text });
}

test("Can add, edit and delete a film", async ({ page }) => {
  test.slow();
  const name = `Test film ${randomUUID().slice(0, 8)}`;

  await signInTo(page, "/admin/films/add");
  await page.getByLabel("Film title").fill(name);
  await page.getByLabel("Year the film was released").fill("1999");
  await page.getByLabel("I have watched this film").check();
  await Promise.all([
    page.waitForURL("/films"),
    page.getByRole("button", { name: "Add film" }).click(),
  ]);
  await expect(card(page, `${name} (1999)`)).toBeVisible();

  // Edit it
  await card(page, name).getByRole("link", { name: "Edit film" }).click();
  await expect(page.getByLabel("Film title")).toHaveValue(name);
  await page.getByLabel("Year the film was released").fill("2001");
  await Promise.all([
    page.waitForURL("/films"),
    page.getByRole("button", { name: "Update Film" }).click(),
  ]);
  await expect(card(page, `${name} (2001)`)).toBeVisible();

  // Delete it
  await card(page, name).getByRole("link", { name: "Edit film" }).click();
  await page.getByRole("button", { name: "Delete Film" }).click();
  await Promise.all([
    page.waitForURL("/films"),
    page.getByRole("button", { name: "Confirm deletion" }).click(),
  ]);
  await expect(page.getByText("Seven Samurai (1954)")).toBeVisible();
  await expect(card(page, name)).toHaveCount(0);
});

test("Editing a film that does not exist shows not found", async ({ page }) => {
  await signInTo(page, "/admin");
  await page.goto("/admin/films/no-such-film/edit");
  await expect(page.getByText("Film not found (404)")).toBeVisible();
});
