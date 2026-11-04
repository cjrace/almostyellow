// Playwright, with pages that wait for React to take over after loading.
// Import test and expect from here rather than @playwright/test.
//
// Safari can fire the load event before React has hydrated the page, and
// hydrating puts every form field back to its starting value, so a test that
// types straight away loses what it typed. src/components/hydrated.tsx marks
// <html> once React has hydrated.
import { test as base, type Page } from "@playwright/test";

export * from "@playwright/test";

// Makes goto and reload on this page wait until React has hydrated it. Use it
// on pages a test opens itself with newPage()
export function waitsForHydration(page: Page) {
  const goto = page.goto.bind(page);
  const reload = page.reload.bind(page);
  const hydrated = () =>
    page.locator("html[data-hydrated]").waitFor({ state: "attached" });

  page.goto = async (...args) => {
    const response = await goto(...args);
    await hydrated();
    return response;
  };
  page.reload = async (...args) => {
    const response = await reload(...args);
    await hydrated();
    return response;
  };
  return page;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(waitsForHydration(page));
  },
});
