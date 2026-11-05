import { test, expect } from "../playwright";

test.describe("A visitor reading game instructions", () => {
  for (const [game, title] of [
    ["irishbingo", "Irish Bingo"],
    ["redorblack", "Red or Black v1"],
    ["suits", "Suits"],
  ]) {
    test(`${title} has one hidden copy in server HTML and an accessible dialog after hydration`, async ({
      page,
      browser,
      baseURL,
    }) => {
      const path = `/games/${game}`;
      const html = await (await page.request.get(path)).text();
      expect(
        html
          .replaceAll(/<!--[\s\S]*?-->/g, "")
          .includes(`${title} instructions`),
      ).toBe(true);
      const noJS = await browser.newContext({
        javaScriptEnabled: false,
        baseURL,
      });
      try {
        const serverPage = await noJS.newPage();
        await serverPage.goto(path);
        const instructions = serverPage.getByText(`${title} instructions`, {
          exact: true,
        });
        await expect(instructions).toHaveCount(1);
        await expect(instructions).toBeHidden();
      } finally {
        await noJS.close();
      }
      await page.goto(path);
      const text = page.getByText(`${title} instructions`, { exact: true });
      await expect(text).toHaveCount(1);
      await expect(text).toBeHidden();
      const trigger = page.getByRole("button", {
        name: "Open game instructions modal",
      });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", {
        name: `${title} instructions`,
      });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator(":focus")).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await dialog
        .getByRole("button", { name: "Close instructions modal" })
        .click();
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  }
});
