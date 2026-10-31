import { test, expect } from "@playwright/test";

for (const path of ["/games/uno", "/games/uno/stats"]) {
  test(`${path} is public and fits narrow and landscape screens`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Uno");
    for (const size of [
      { width: 320, height: 640 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await expect(
      page.getByRole("link", { name: "Tracker", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Statistics", exact: true }),
    ).toBeVisible();
  });
}
test("storage unavailable blocks scoring with an actionable warning", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new DOMException(
          "Device storage is unavailable",
          "SecurityError",
        );
      },
    });
  });
  await page.goto("/games/uno");
  await expect(
    page.getByRole("alert", { name: "Scores need attention" }),
  ).toContainText("storage");
  await expect(
    page.getByRole("button", { name: "Add a round for Cam" }),
  ).toHaveCount(0);
});
