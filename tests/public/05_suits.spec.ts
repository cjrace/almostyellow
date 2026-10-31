import { test, expect, Page } from "@playwright/test";
import { SuitNames } from "@/components/carddeck";

async function startGame(page: Page, names: string[]) {
  await page.goto("/games/suits");
  await page.getByRole("button", { name: "Add player" }).click();
  for (const [index, name] of names.entries()) {
    await page.getByLabel(`Player ${String(index + 1)} name`).fill(name);
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

  await page.getByLabel("Open game instructions modal").click();
  const instructions = page.getByRole("dialog");
  await expect(instructions).toContainText("Suits instructions");
  await expect(instructions).toContainText("university");
  await expect(instructions).toContainText("final turn counts double");
  await instructions
    .getByRole("button", { name: "Close instructions modal" })
    .click();
  await expect(instructions).toBeHidden();
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
  await expect(page.getByRole("button", { name: "Add player" })).toBeDisabled();

  await page.getByRole("button", { name: "Remove Player 13" }).click();
  await expect(page.getByLabel("Player 13 name")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add player" })).toBeEnabled();
});

test("Plays a full game of 13 turns", async ({ page }) => {
  // Blank names become "Player 2"
  await startGame(page, ["Ben", "", "Cam"]);
  const players = ["Ben", "Player 2", "Cam"];
  const cards = page.locator("main img");
  const result = page.locator("#suits_result");

  for (let turn = 0; turn < 13; turn++) {
    const player = players[turn % 3];
    const suit = SuitNames[turn % 4];
    const finalTurn = turn === 12;

    await expect(page.locator("#suits_turn")).toHaveText(`${player}'s turn`);
    await expect(page.locator("#suits_turn_count")).toHaveText(
      `Turn ${String(turn + 1)} of 13`,
    );
    // Three players, so each other player's share is 2
    await expect(page.locator("#suits_magic_number")).toHaveText(
      "Magic number2",
    );
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      await expect(card).toHaveAttribute("alt", "Face-down card");
    }
    // Players hear about the double before they guess
    await expect(page.getByText("This turn counts double.")).toBeVisible({
      visible: finalTurn,
    });

    const revealButton = page.getByRole("button", {
      name: "Reveal four cards",
    });
    await expect(revealButton).toBeDisabled();
    // The segmented control hides its radio inputs, so press the label
    await page.locator("label").filter({ hasText: suit }).click();
    await expect(page.getByRole("radio", { name: suit })).toBeChecked();
    await revealButton.click();
    await expect(revealButton).toHaveCount(0);

    // Work out the result from the cards on screen
    const alts = await Promise.all(
      (await cards.all()).map((card) => card.getAttribute("alt")),
    );
    const matches = alts.filter((alt) => alt?.endsWith(` of ${suit}`)).length;
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

    // The guess can't change once the cards are showing
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.locator("#suits_chosen")).toContainText(
      `${player} picked`,
    );
    await expect(page.locator("#suits_chosen")).toContainText(suit);

    if (!finalTurn) {
      await page.getByRole("button", { name: "Next player" }).click();
    }
  }

  await expect(page.locator("#suits_turn")).toHaveText("Game over");
  await expect(page.getByText("All 13 turns have been played.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next player" })).toHaveCount(
    0,
  );

  // Replay keeps the players
  await page
    .getByRole("button", { name: "Play again with same players" })
    .click();
  await expect(page.locator("#suits_turn")).toHaveText("Ben's turn");
  await expect(page.locator("#suits_turn_count")).toHaveText("Turn 1 of 13");
  await expect(result).toHaveText("");
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
