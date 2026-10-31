import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { expectNoAxeViolations, schemes, useScheme } from "../axe";
import { adminRoutes } from "../../src/routes";
import { films, whiskies } from "../firebase/fixtures";
import { signIn } from "./helpers";

// axe finds the same problems in every browser, so Chrome and Mobile Chrome
// are enough, and cover both the desktop and mobile layouts
test.skip(({ browserName }) => browserName !== "chromium");

// Fills in a fixture ID for pages with one in the path
function url(route: string) {
  return route
    .replace("films/[id]", `films/${films[0].id}`)
    .replace("whiskyjournal/[id]", `whiskyjournal/${whiskies[0].id}`);
}

for (const scheme of schemes) {
  test.describe(`${scheme} scheme`, () => {
    test.beforeEach(async ({ page }) => {
      await useScheme(page, scheme);
    });

    test("Login page meets WCAG 2.2 AA, with and without an error", async ({
      page,
    }) => {
      await page.goto("/admin/login");
      await expect(page.locator("h1")).toBeVisible();
      await expectNoAxeViolations(page, { soft: true });

      await page.getByRole("button", { name: "Log in" }).click();
      await expectNoAxeViolations(page);
    });

    // Signing in is slow, so one test looks at every page in turn
    test("Admin pages meet WCAG 2.2 AA", async ({ page }) => {
      await signIn(page);
      for (const route of adminRoutes.filter((r) => r !== "/admin/login")) {
        await test.step(route, async () => {
          await page.goto(url(route));
          await expect(page.locator("h1")).toBeVisible();
          await expectNoAxeViolations(page, { soft: true });
        });
      }
    });
  });
}

// Ticking moves an item to the other list and deleting removes it, so the
// list puts keyboard focus back rather than losing it. The list is shared
// with other tests, so this only touches items of its own.
test("Keyboard focus stays in the shopping list", async ({ page }) => {
  const first = `Focus test ${randomUUID()}`;
  const second = `Focus test ${randomUUID()}`;
  await signIn(page);
  await page.goto("/admin/chopinliszt");
  await page.getByRole("button", { name: "Add new item(s)" }).click();
  await page
    .getByPlaceholder("Add new items, one per line...")
    .fill(`${first}\n${second}`);
  await page.getByRole("button", { name: "Add items and close modal" }).click();

  const box = page.getByRole("checkbox", { name: first });
  await box.focus();
  await page.keyboard.press("Space");
  await expect(box).toBeChecked();
  await expect(box).toBeFocused();

  await page.getByRole("button", { name: `Delete ${first}` }).focus();
  await page.keyboard.press("Enter");
  await expect(box).toHaveCount(0);
  await expect(page.locator("main *:focus")).toHaveCount(1);

  await page.getByRole("button", { name: `Delete ${second}` }).click();
});
