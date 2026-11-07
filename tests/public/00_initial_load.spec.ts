import { test, expect } from "../playwright";

test('The homepage shows the "Almost Yellow" title', async ({ page }) => {
  await page.goto("/");
  // Check the h1 exists
  await expect(page.locator("h1")).toContainText("Almost Yellow");
  // Check the overall website title exists
  await expect(page).toHaveTitle("Almost Yellow");
});

test.describe("A visitor on the homepage", () => {
  test("sees centred, unclipped button labels in its device viewport", async ({
    page,
  }) => {
    await page.goto("/");
    const buttons = page.locator("main .mantine-Button-root");
    await expect(buttons).toHaveCount(7);
    for (const button of await buttons.all()) {
      const bounds = await button.evaluate((element) => {
        const button = element.getBoundingClientRect();
        const label = element.querySelector(".mantine-Button-label");
        if (!label) throw new Error("The button label is missing.");
        const text = label.getBoundingClientRect();
        const style = getComputedStyle(label);
        return {
          centreOffset: Math.abs(
            (text.top + text.bottom - button.top - button.bottom) / 2,
          ),
          fits:
            text.left >= button.left &&
            text.right <= button.right &&
            text.top >= button.top &&
            text.bottom <= button.bottom,
          lineHeight:
            Number.parseFloat(style.lineHeight) /
            Number.parseFloat(style.fontSize),
        };
      });
      expect(bounds.centreOffset).toBeLessThan(2);
      expect(bounds.fits).toBe(true);
      expect(bounds.lineHeight).toBeGreaterThanOrEqual(1.3);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});
