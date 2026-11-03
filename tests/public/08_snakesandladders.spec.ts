import { test, expect } from "@playwright/test";

test.describe("Someone setting up Snakes and Ladders", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/games/snakesandladders");
  });

  test("sees a different avatar picked for each player", async ({ page }) => {
    await page.getByLabel("Number of Players").fill("10");
    const groups = page.getByRole("group", { name: /^Avatar for player/ });
    await expect(groups).toHaveCount(10);

    const picked = await groups.evaluateAll((sets) =>
      sets.map((set) =>
        set.querySelector("input:checked")?.getAttribute("value"),
      ),
    );
    expect(new Set(picked).size).toBe(10);
  });

  test("can pick an avatar with the arrow keys, in one tab stop", async ({
    page,
  }) => {
    const first = page.getByRole("group", { name: "Avatar for player 1" });
    await page.getByLabel("Name of player 1:").focus();

    // Tab lands on the picked avatar, and the arrow keys pick another
    await page.keyboard.press("Tab");
    await expect(first.getByRole("radio", { name: "Cat" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(first.getByRole("radio", { name: "Dog" })).toBeChecked();

    // One more tab leaves the avatars for the next player's name
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Name of player 2:")).toBeFocused();
  });

  test("cannot pick an avatar someone else has picked", async ({ page }) => {
    const first = page.getByRole("group", { name: "Avatar for player 1" });
    const second = page.getByRole("group", { name: "Avatar for player 2" });
    await expect(second.getByRole("radio", { name: "Dog" })).toBeChecked();

    // Player 1 takes player 2's dog, so player 2 is given the free cat
    await first.getByText("Dog").click({ force: true });
    await expect(first.getByRole("radio", { name: "Dog" })).toBeChecked();
    await expect(second.getByRole("radio", { name: "Dog" })).toBeDisabled();
    await expect(second.getByRole("radio", { name: "Cat" })).toBeChecked();

    // The arrow keys skip the taken dog
    await second.getByRole("radio", { name: "Cat" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(second.getByRole("radio", { name: "Fish" })).toBeChecked();
  });

  test("keeps the names typed in when others are left blank", async ({
    page,
  }) => {
    await page.getByLabel("Number of Players").fill("3");
    await page.getByLabel("Name of player 1:").fill("Al");
    await page.getByLabel("Name of player 3:").fill("Cy");
    await page.getByRole("button", { name: "Start game!" }).click();

    await expect(
      page.getByRole("button", { name: "Roll Dice (Al)" }),
    ).toBeVisible();
    // Every player gets a turn, with the blank one given a default name
    for (const name of ["Player 2", "Cy"]) {
      await page.getByRole("button", { name: /Roll Dice/ }).click();
      // Landing on a snake or ladder pops up a message to close first
      await expect(async () => {
        const update = page.getByRole("dialog", { name: "Game Update" });
        if (await update.isVisible()) await page.keyboard.press("Escape");
        await expect(
          page.getByRole("button", { name: `Roll Dice (${name})` }),
        ).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
    }
  });
});
