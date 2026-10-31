import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { getCredentials } from "./helpers";

// Every test running at the same time shares the one journal, so this only
// changes a whisky it adds itself, with a name of its own

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

// Each rating is a set of radio buttons labelled with their values. The
// whisky rating goes up to 5 and the price up to 3, so the price comes second.
// The radio buttons themselves are hidden, so this clicks the symbol that is
// their label.
async function rate(page: Page, rating: number, price: number) {
  const radios = [
    page.getByRole("radio", { name: String(rating), exact: true }).first(),
    page.getByRole("radio", { name: String(price), exact: true }).last(),
  ];
  for (const radio of radios) {
    const id = await radio.getAttribute("id");
    await page.locator(`label[for="${String(id)}"]`).click();
    await expect(radio).toBeChecked();
  }
}

function card(page: Page, name: string) {
  return page
    .locator(".mantine-Paper-root")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
}

test("Can add, edit and delete a whisky", async ({ page }) => {
  test.slow();
  const name = `Test whisky ${randomUUID().slice(0, 8)}`;

  await signInTo(page, "/admin/whiskyjournal/add");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Distillery").fill("Test distillery");
  await page.getByLabel("Country (plus region if Scotland)").fill("Ireland");
  await page.getByLabel("Age").fill("12");
  await page.getByPlaceholder("Select grain").click();
  await page.getByRole("option", { name: "Single malt" }).click();
  await page.getByLabel("ABV").fill("46");
  await rate(page, 4, 2);
  await page.getByLabel("Notes").fill("Added by a test");
  await Promise.all([
    page.waitForURL("/whiskyjournal"),
    page.getByRole("button", { name: "Add whisky" }).click(),
  ]);

  await expect(card(page, name)).toContainText("Added by a test");
  await expect(card(page, name)).toContainText("46%");

  // Edit it
  await card(page, name)
    .getByRole("link", { name: `Edit ${name}` })
    .click();
  await expect(page.getByLabel("Name")).toHaveValue(name);
  await page.getByLabel("Notes").fill("Edited by a test");
  await Promise.all([
    page.waitForURL("/whiskyjournal"),
    page.getByRole("button", { name: "Update Whisky" }).click(),
  ]);
  await expect(card(page, name)).toContainText("Edited by a test");

  // Delete it
  await card(page, name)
    .getByRole("link", { name: `Edit ${name}` })
    .click();
  await page.getByRole("button", { name: "Delete Whisky" }).click();
  await Promise.all([
    page.waitForURL("/whiskyjournal"),
    page.getByRole("button", { name: "Confirm deletion" }).click(),
  ]);
  await expect(
    page.getByRole("heading", { name: "Talisker 10 Year Old" }),
  ).toBeVisible();
  await expect(card(page, name)).toHaveCount(0);
});

test("Editing a whisky that does not exist shows not found", async ({
  page,
}) => {
  await signInTo(page, "/admin");
  await page.goto("/admin/whiskyjournal/no-such-whisky/edit");
  await expect(page.getByText("Whisky not found (404)")).toBeVisible();
});
