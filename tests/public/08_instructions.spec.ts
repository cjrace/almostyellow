import { test, expect } from "../playwright";

test.describe(
  "A visitor reading server-rendered game instructions",
  { tag: "@desktop" },
  () => {
    for (const [game, title] of [
      ["irishbingo", "Irish Bingo"],
      ["redorblack", "Red or Black v1"],
      ["suits", "Suits"],
    ]) {
      test(`${title} has one hidden copy without JavaScript`, async ({
        browser,
        baseURL,
      }) => {
        const path = `/games/${game}`;
        const noJS = await browser.newContext({
          javaScriptEnabled: false,
          baseURL,
        });
        try {
          const serverPage = await noJS.newPage();
          await serverPage.goto(path);
          const instructions = serverPage.getByText(`${title} instructions`, {
            exact: true,
          });
          await expect(instructions).toHaveCount(1);
          await expect(instructions).toBeHidden();
        } finally {
          await noJS.close();
        }
      });
    }
  },
);
