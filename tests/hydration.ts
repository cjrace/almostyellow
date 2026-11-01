import type { Page } from "@playwright/test";

// Pages that arrive with their controls in the HTML can be used before React
// has taken them over, which wipes typed text and drops clicks. Wait for the
// first input to be hydrated before using the page.
export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const input = document.querySelector("input");
    return (
      input !== null &&
      Object.keys(input).some((key) => key.startsWith("__reactProps"))
    );
  });
}
