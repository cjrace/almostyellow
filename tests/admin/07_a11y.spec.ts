import { randomUUID } from "node:crypto";
import { test, expect } from "../playwright";
import { expectNoAxeViolations, schemes, useScheme } from "../axe";
import { films, whiskies } from "../firebase/fixtures";
import { signIn } from "./helpers";

// Fills in a fixture ID for pages with one in the path
function url(route: string) {
  return route
    .replace("films/[id]", `films/${films[0].id}`)
    .replace("whiskyjournal/[id]", `whiskyjournal/${whiskies[0].id}`);
}

for (const scheme of schemes) {
  test.describe(`${scheme} scheme`, { tag: "@desktop" }, () => {
    test.beforeEach(async ({ page }) => {
      await useScheme(page, scheme);
    });

    test("Login page meets WCAG 2.2 AA, with and without an error", async ({
      page,
    }) => {
      await page.goto("/admin/login");
      await expect(page.locator("h1")).toBeVisible();
      await expectNoAxeViolations(page, { soft: true });

      await page
        .getByPlaceholder("e.g. simply@thebest.co.uk")
        .fill("missing@example.com");
      await page.getByPlaceholder("Enter password").fill("invalid-password");
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page.locator("main").getByRole("alert")).toHaveText(
        "Invalid credentials.",
      );
      await expectNoAxeViolations(page);
    });

    // Signing in is slow, so one test looks at every page in turn
    test("Admin pages meet WCAG 2.2 AA", async ({ page }) => {
      test.slow();
      await signIn(page);
      for (const route of [
        "/admin/chopinliszt",
        "/admin/films/[id]/edit",
        "/admin/whiskyjournal/[id]/edit",
        "/admin/holidays",
      ]) {
        await test.step(route, async () => {
          await page.goto(url(route));
          await expect(page.locator("h1")).toBeVisible();
          await expectNoAxeViolations(page, { soft: true });
        });
      }
    });

    test("Deletion confirmations have named controls and return focus", async ({
      page,
    }) => {
      await signIn(page);
      for (const [route, button] of [
        [`/admin/films/${films[0].id}/edit`, "Delete Film"],
        [`/admin/whiskyjournal/${whiskies[0].id}/edit`, "Delete Whisky"],
      ]) {
        await page.goto(route);
        const trigger = page.getByRole("button", { name: button, exact: true });
        await trigger.focus();
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", { name: "Confirm Deletion" });
        await expect(dialog).toBeVisible();
        await expect(
          dialog.getByRole("button", { name: "Close deletion confirmation" }),
        ).toBeVisible();
        await expectNoAxeViolations(page);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
      }
    });

    test("Shopping list add dialog meets WCAG 2.2 AA with an input error", async ({
      page,
    }) => {
      await signIn(page);
      await page.goto("/admin/chopinliszt");
      const trigger = page.getByRole("button", { name: "Add new item(s)" });
      await trigger.click();
      await expect(
        page.getByRole("dialog", { name: "Add new items" }),
      ).toBeVisible();
      await expectNoAxeViolations(page);
      await page
        .getByPlaceholder("Add new items, one per line...")
        .fill("x".repeat(501));
      await page
        .getByRole("button", { name: "Add item(s) and close modal" })
        .click();
      await expect(
        page.getByText(/Each item must be .* characters or fewer/),
      ).toBeVisible();
      await expectNoAxeViolations(page);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    });
  });
}

// Ticking moves an item to the other list and deleting removes it, so the
// list puts keyboard focus back rather than losing it. The list is shared
// with other tests, so this only touches items of its own.
test(
  "Keyboard focus stays in the shopping list",
  { tag: "@phone" },
  async ({ page }) => {
    const first = `Focus test ${randomUUID()}`;
    const second = `Focus test ${randomUUID()}`;
    await signIn(page);
    await page.goto("/admin/chopinliszt");
    await page.getByRole("button", { name: "Add new item(s)" }).click();
    await page
      .getByPlaceholder("Add new items, one per line...")
      .fill(`${first}\n${second}`);
    await page
      .getByRole("button", { name: "Add item(s) and close modal" })
      .click();

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
  },
);
