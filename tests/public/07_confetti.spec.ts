import { test, expect } from "@playwright/test";

// The confetti script is large, so it should only be fetched when someone
// asks for confetti. The request is blocked so tests never reach the site.
test("Confetti only loads when asked for", async ({ page }) => {
  const requests: string[] = [];
  await page.route("https://run.confettipage.com/**", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });

  await page.goto("/games");
  await page.waitForLoadState("load");
  expect(requests).toEqual([]);

  await page.getByRole("button", { name: "Unleash confetti" }).click();
  await expect.poll(() => requests.length).toBe(1);
});
