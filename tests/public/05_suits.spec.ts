import { test, expect, Page } from "../playwright";
import { SuitNames } from "@/components/carddeck";
import { expectGameFits, expectInstructions } from "../gameplay";

test.describe("A player on a phone", { tag: "@phone" }, () => {
  async function startGame(page: Page, names: string[], seeded = false) {
    await page.goto("/games/suits");
    await page.getByRole("button", { name: "Add player" }).click();
    for (const [index, name] of names.entries()) {
      await page.getByLabel(`Player ${String(index + 1)} name`).fill(name);
    }
    if (seeded) {
      await page.evaluate(() => {
        let seed = 0;
        window.addEventListener(
          "click",
          (event) => {
            const button =
              event.target instanceof Element && event.target.closest("button");
            if (button && button.textContent === "Start game") seed = 74;
          },
          { capture: true },
        );
        Math.random = () => {
          seed = (seed + 0x6d2b79f5) | 0;
          let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      });
    }
    await page.getByRole("button", { name: "Start game" }).click();
  }

  test("Credits Ben and shows the instructions", async ({ page }) => {
    await page.goto("/games/suits");

    // Suits isn't published anywhere, so the credit has no link
    await expect(page.getByText("A Ben Palmer original")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "A Ben Palmer original" }),
    ).toHaveCount(0);

    await expectInstructions(page, "Suits instructions", [
      "university",
      "final turn counts double",
    ]);
  });

  test("Sets up between 2 and 13 players", async ({ page }) => {
    await page.goto("/games/suits");

    await expect(
      page.getByRole("button", { name: "Remove Player 1" }),
    ).toBeDisabled();

    for (let players = 3; players <= 13; players++) {
      await page.getByRole("button", { name: "Add player" }).click();
    }
    await expect(page.getByLabel("Player 13 name")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add player" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "Remove Player 13" }).click();
    await expect(page.getByLabel("Player 13 name")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Add player" }),
    ).toBeEnabled();
  });

  test("Plays a full game of 13 turns", async ({ page }) => {
    // Blank names become "Player 2"
    await startGame(page, ["Ben", "", "Cam"], true);
    const players = ["Ben", "Player 2", "Cam"];
    const cards = page.locator("main img");
    const result = page.locator("#suits_result");

    await expectGameFits(page, 44);
    const revealButton = page.getByRole("button", {
      name: "Reveal four cards",
    });

    const revealBox = await revealButton.boundingBox();
    const changeBox = await page
      .getByRole("button", { name: "Change players" })
      .boundingBox();
    if ((page.viewportSize()?.height ?? 0) <= 720) {
      expect(changeBox?.y).toBe(revealBox?.y);
    } else {
      expect(changeBox?.y).toBeGreaterThan(
        (revealBox?.y ?? 0) + (revealBox?.height ?? 0),
      );
      expect(changeBox?.width).toBe(revealBox?.width);
    }
    for (let turn = 0; turn < 13; turn++) {
      const player = players[turn % 3];
      const suit = SuitNames[turn % 4];
      const finalTurn = turn === 12;
      await test.step(`Turn ${String(turn + 1)}: ${player} picks ${suit} and sees the result`, async () => {
        await expect(page.locator("#suits_turn")).toHaveText(
          `${player}'s turn`,
        );
        await expect(page.locator("#suits_turn_count")).toHaveText(
          `Turn ${String(turn + 1)} of 13`,
        );
        // Three players, so each other player's share is 2
        await expect(page.locator("#suits_magic_number")).toHaveText(
          "Magic number2",
        );
        await expect(page.locator("#suits_choose")).toHaveText(
          `${player}, choose a suit`,
        );
        await expect(cards).toHaveCount(4);
        if (turn === 0) {
          for (const card of await cards.all()) {
            await expect(card).toHaveAttribute("alt", "Face-down card");
          }
        }
        // Players hear about the double before they guess
        await expect(
          page.getByText("Final turn counts double", { exact: true }),
        ).toBeVisible({
          visible: finalTurn,
        });

        if (finalTurn) await expectGameFits(page, 44);

        // Each player starts with no suit picked
        await expect(revealButton).toBeDisabled();
        await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
        // The segmented control hides its radio inputs, so press the label
        await page.locator("label").filter({ hasText: suit }).click();
        await expect(page.getByRole("radio", { name: suit })).toBeChecked();

        // Every other turn uses the keyboard shortcut instead of the button
        if (turn % 2 === 0) {
          await revealButton.click();
        } else {
          await page.keyboard.press("Control+Enter");
        }

        // Wait for the turn to move on before reading the cards
        await expect(page.locator("#suits_turn")).toHaveText(
          finalTurn ? "Game over" : `${players[(turn + 1) % 3]}'s turn`,
        );
        await expect(page.locator("#suits_chosen")).toContainText(
          `${player} picked`,
        );
        await expect(page.locator("#suits_chosen")).toContainText(suit);

        // Work out the result from the cards on screen
        const alts = await Promise.all(
          (await cards.all()).map((card) => card.getAttribute("alt")),
        );
        const matches = alts.filter((alt) =>
          alt?.endsWith(` of ${suit}`),
        ).length;
        const suitsDrawn = new Set(alts.map((alt) => alt?.split(" of ")[1]));
        const multiplier = finalTurn ? 2 : 1;
        const doubled = finalTurn ? " (doubled for the final turn)" : "";
        if (suitsDrawn.size === 4) {
          await expect(result).toContainText("Safe round");
          await expect(result).toContainText(
            `One of every suit, so everyone except ${player} drinks ${String(multiplier)}${doubled}.`,
          );
        } else if (matches > 0) {
          const drinks = matches * 2 * multiplier;
          await expect(result).toHaveText(
            `${player} matched ${String(matches)} ${matches === 1 ? "card" : "cards"}. Hand out ${String(drinks)} drinks${doubled}.`,
          );
        } else {
          await expect(result).toHaveText(
            `No matches. ${player} drinks ${String(4 * multiplier)}${doubled}.`,
          );
        }

        if ([4, 12, 13].includes(turn + 1))
          await expect(result).toContainText("Safe round");
        if ([0, 3, 11, 12].includes(turn)) await expectGameFits(page, 44);

        // Focus moves to the next player's suit picker
        if (!finalTurn) {
          await expect(
            page.getByRole("radio", { name: "Hearts" }),
          ).toBeFocused();
        }
      });
    }

    await test.step("Then the game is over and can be replayed with the same players", async () => {
      await expect(page.locator("#suits_turn_count")).toHaveText(
        "All 13 turns played",
      );
      await expect(page.getByRole("radio")).toHaveCount(0);
      await expect(revealButton).toHaveCount(0);

      await expectGameFits(page, 44);

      // Replay keeps the players
      await page
        .getByRole("button", { name: "Play again with same players" })
        .click();
      await expect(page.locator("#suits_turn")).toHaveText("Ben's turn");
      await expect(page.locator("#suits_turn_count")).toHaveText(
        "Turn 1 of 13",
      );
      await expect(result).toHaveText("");
      await expectGameFits(page, 44);
      await expect(page.locator("#suits_chosen")).toHaveText("");
    });
  });

  test("Won't reveal with the shortcut before a suit is picked", async ({
    page,
  }) => {
    await startGame(page, ["Ben", "Cam", "Laura"]);
    await page.keyboard.press("Control+Enter");
    await expect(page.locator("#suits_turn")).toHaveText("Ben's turn");
    await expect(page.locator("main img").first()).toHaveAttribute(
      "alt",
      "Face-down card",
    );
  });

  test("Keeps blank names blank when changing players", async ({ page }) => {
    await startGame(page, ["Ben", "", "Cam"]);
    await expect(page.locator("#suits_turn")).toHaveText("Ben's turn");

    await page.getByRole("button", { name: "Change players" }).click();
    await page
      .getByRole("dialog", { name: "End this game?" })
      .getByRole("button", { name: "End game" })
      .click();

    await expect(page.getByLabel("Player 2 name")).toHaveValue("");

    // Removing Ben moves the blank player up, so they're named by their new place
    await page.getByRole("button", { name: "Remove Player 1" }).click();
    await expect(page.getByLabel("Player 1 name")).toHaveValue("");
    await page.getByRole("button", { name: "Start game" }).click();
    await expect(page.locator("#suits_turn")).toHaveText("Player 1's turn");
  });

  test("Asks before ending an unfinished game", async ({ page }) => {
    await startGame(page, ["Ben", "Cam", "Laura"]);

    await page.getByRole("button", { name: "Change players" }).click();
    const confirm = page.getByRole("dialog", { name: "End this game?" });
    await confirm.getByRole("button", { name: "Keep playing" }).click();
    await expect(confirm).toBeHidden();
    await expect(page.locator("#suits_turn")).toHaveText("Ben's turn");

    await page.getByRole("button", { name: "Change players" }).click();
    await confirm.getByRole("button", { name: "End game" }).click();

    // Back at setup with the same names filled in
    await expect(page.getByLabel("Player 1 name")).toHaveValue("Ben");
    await expect(page.getByLabel("Player 3 name")).toHaveValue("Laura");
  });
});
