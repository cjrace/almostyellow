import { expect, type Locator, type Page } from "./playwright";

// Match the vendor's fixed badge, including its inherited line height and
// responsive font size. Tests never download or execute the external script.
export async function mockConfetti(page: Page) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("https://run.confettipage.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.ConfettiPage = { play() {
      if (document.querySelector('a[data-test-confetti]')) return;
      const style = document.createElement('style');
      style.textContent = 'a[data-test-confetti] { font-size: 14px !important; } @media (min-width: 1000px) { a[data-test-confetti] { font-size: 16px !important; } }';
      document.head.append(style);
      const badge = document.createElement('a');
      badge.dataset.testConfetti = '';
      badge.href = 'https://confettipage.com/';
      badge.style.cssText = 'position:fixed!important;bottom:0!important;left:5%!important;z-index:2147483647!important;padding:0.2em 0.7em!important;background:black!important;color:white!important;border-radius:8px 8px 0 0!important;text-decoration:none!important;white-space:nowrap!important;';
      badge.innerHTML = '<span>Animation by </span><strong>ConfettiPage.com</strong>';
      document.body.append(badge);
    }};`,
    }),
  );
}

export const confettiBadge = (page: Page) =>
  page.locator("a[data-test-confetti]");

export async function showConfetti(page: Page) {
  // Game pages fold the button into a menu on a portrait phone
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if (await menu.isVisible()) {
    await menu.click();
    await page.getByRole("menuitem", { name: "Unleash confetti" }).click();
  } else {
    await page.getByRole("button", { name: "Unleash confetti" }).click();
  }
  await expect(confettiBadge(page)).toBeVisible();
}

export async function expectClearOfBadge(control: Locator, page: Page) {
  await expect(confettiBadge(page)).toBeVisible();
  await control.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await expect(control).toBeInViewport({ ratio: 1 });
  await expect
    .poll(
      async () => {
        const box = await control.boundingBox();
        const badge = await confettiBadge(page).boundingBox();
        if (!box || !badge) return false;
        return (
          box.x + box.width <= badge.x ||
          box.x >= badge.x + badge.width ||
          box.y + box.height <= badge.y ||
          box.y >= badge.y + badge.height
        );
      },
      { message: "The whole action must clear the badge" },
    )
    .toBe(true);
  if (await control.isEnabled()) {
    expect(
      await control.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          ),
        );
      }),
      "The action's centre receives clicks",
    ).toBe(true);
  }
}
