import { expect, type Page } from "./playwright";

// Check the rendered state in the same journey that exercises the game rules.
export async function expectGameFits(page: Page, minimumControlHeight = 24) {
  await expect
    .poll(() =>
      page.evaluate((minimumControlHeight) => {
        const problems: string[] = [];
        if (document.documentElement.scrollHeight > innerHeight)
          problems.push("The page scrolls vertically");
        if (document.documentElement.scrollWidth > innerWidth)
          problems.push("The page scrolls horizontally");
        const targets = document.querySelectorAll(
          "main img, main .mantine-Button-root, main .mantine-SegmentedControl-label",
        );
        for (const target of targets) {
          const box = target.getBoundingClientRect();
          if (!box.width || !box.height) continue;
          const name = target.getAttribute("alt") ?? target.textContent;
          if (
            box.top < -1 ||
            box.left < -1 ||
            box.right > innerWidth + 1 ||
            box.bottom > innerHeight + 1
          )
            problems.push(`${name} is outside the viewport`);
          if (
            !(target instanceof HTMLImageElement) &&
            box.height < minimumControlHeight
          )
            problems.push(
              `${name} is shorter than ${String(minimumControlHeight)}px`,
            );
        }
        return problems;
      }, minimumControlHeight),
    )
    .toEqual([]);
}

export async function expectInstructions(
  page: Page,
  title: string,
  content: string[] = [],
) {
  const text = page.getByText(title, { exact: true });
  await expect(text).toHaveCount(1);
  await expect(text).toBeHidden();
  const trigger = page.getByRole("button", {
    name: "Open game instructions modal",
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  for (const text of content) await expect(dialog).toContainText(text);
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
}

// Snakes and Ladders picks the number of players from a row of choices
export async function choosePlayers(page: Page, players: number) {
  await page
    .getByRole("radiogroup", { name: "Number of Players" })
    .getByText(players.toString(), { exact: true })
    .click();
}
