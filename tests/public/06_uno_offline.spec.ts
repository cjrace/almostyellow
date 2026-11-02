import { test, expect } from "@playwright/test";

// Service-worker evaluation is only available in Chromium, so playwright.config.ts
// leaves this file out of the Firefox project.
for (const failure of ["open", "match", "put"] as const) {
  test(`online assets still load when cache ${failure} fails`, async ({
    page,
    context,
  }) => {
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
