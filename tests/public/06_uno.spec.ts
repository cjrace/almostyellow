import { test, expect } from "@playwright/test";

for (const { path, tab } of [
  { path: "/games/uno-tracker", tab: "Tracker" },
  { path: "/games/uno-tracker/stats", tab: "Statistics" },
  { path: "/games/uno-tracker/history", tab: "History" },
]) {
  test(`${path} is public and fits narrow and landscape screens`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Uno tracker",
    );
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
    // The segmented control hides its radio inputs, so check the visible
    // labels and which radio is selected
    const tabs = page.getByRole("radiogroup", { name: "Uno pages" });
    for (const name of ["Tracker", "Statistics", "History"])
      await expect(tabs.getByText(name, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("radio", { name: tab, exact: true }),
    ).toBeChecked();
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
  await page.goto("/games/uno-tracker");
  await expect(
    page.getByRole("alert", { name: "Scores need attention" }),
  ).toContainText("storage");
  await expect(
    page.getByRole("button", { name: "Add a round for Cam" }),
  ).toHaveCount(0);
});
