import { test, expect } from "@playwright/test";

for (const path of [
  "/games/uno-tracker",
  "/games/uno-tracker/stats",
  "/games/uno-tracker/history",
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
    await expect(
      page.getByRole("radio", { name: "Tracker", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "Statistics", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "History", exact: true }),
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
  await page.goto("/games/uno-tracker");
  await expect(
    page.getByRole("alert", { name: "Scores need attention" }),
  ).toContainText("storage");
  await expect(
    page.getByRole("button", { name: "Add a round for Cam" }),
  ).toHaveCount(0);
});

for (const failure of ["open", "match", "put"] as const) {
  test(`online assets still load when cache ${failure} fails`, async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Service-worker evaluation is available in Chromium.",
    );
    await page.goto("/games/uno-tracker");
    await expect
      .poll(
        () =>
          page.evaluate(
            async () =>
              (await (await caches.open("uno-shell-v1")).keys()).length,
          ),
        { timeout: 30000 },
      )
      .toBeGreaterThan(1);
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    const asset = await page.evaluate(async () => {
      const cache = await caches.open("uno-shell-v1");
      return (await cache.keys())
        .map((request) => request.url)
        .find((url) => new URL(url).pathname.endsWith(".js"));
    });
    if (!asset) throw new Error("No cached JavaScript asset was found.");
    const url = `${asset}?cache-failure=${failure}`;
    expect((await page.request.get(url)).status()).toBe(200);
    await context.serviceWorkers()[0].evaluate((failure) => {
      if (failure === "open")
        CacheStorage.prototype.open = () =>
          Promise.reject(
            new DOMException("Storage unavailable", "SecurityError"),
          );
      if (failure === "match")
        Cache.prototype.match = () =>
          Promise.reject(
            new DOMException("Storage unavailable", "SecurityError"),
          );
      if (failure === "put")
        Cache.prototype.put = () =>
          Promise.reject(
            new DOMException("Storage full", "QuotaExceededError"),
          );
    }, failure);
    expect(
      await page.evaluate(async (url) => (await fetch(url)).status, url),
    ).toBe(200);
    await context.setOffline(true);
    expect(
      await page.evaluate(async (url) => {
        try {
          await fetch(`${url}-offline`);
          return false;
        } catch {
          return true;
        }
      }, url),
    ).toBe(true);
  });
}
