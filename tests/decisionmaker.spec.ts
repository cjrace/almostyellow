import { test, expect } from "@playwright/test";

test("Hasn't prematurely made a decision", async ({ page }) => {
  await page.goto("/decisionmaker");

  // Check the decision div hasn't appeared yet
  await expect(page.locator("#decision")).toHaveCount(0);
});

test("Won't make a decision if nothing to decide", async ({ page }) => {
  await page.goto("/decisionmaker");

  // Prematurely press the button
  await page.getByRole("button", { name: "Make a decision" }).click();

  // Expect an error and no decision
  await expect(page.getByRole("paragraph")).toContainText(
    "Please enter at least 2 options."
  );
  await expect(page.locator("#decision")).toHaveCount(0);

  // Enter one thing in the box
  await page
    .getByLabel("Type the options for your")
    .fill("Only one road ahead");
  await page.getByRole("button", { name: "Make a decision" }).click();

  // Expect an error and no decision
  await expect(page.getByRole("paragraph")).toContainText(
    "Please enter at least 2 options."
  );
  await expect(page.locator("#decision")).toHaveCount(0);
});

test("Makes a valid decision", async ({ page }) => {
  await page.goto("/decisionmaker");

  // Some example initial options
  const takeawayOptions = [
    "Nandos",
    "Shake N Cake",
    "McDonalds",
    "Dominos",
    "KFC",
    "Bella Italia",
  ];

  // Paste together with new line breaks to reuse as the input
  const optionsToEnter = takeawayOptions.join("\n");

  // Add some options and make a decision
  await page.getByLabel("Type the options for your").fill(optionsToEnter);
  await page.getByRole("button", { name: "Make a decision" }).click();

  // Ensure decision has been made
  await expect(page.locator("#decision")).toContainText(
    "The decision has been made, and you should choose:"
  );

  const decisionDiv = page.locator("#decision");
  const decisionText = await decisionDiv.textContent();
  expect(decisionText).not.toBeNull();

  // Forcing this as it really doesn't like it when there's a possibility it is null
  if (decisionText !== null) {
    // Check the devision was an actual option in the list
    const endsWithInitialOption = takeawayOptions.some((option) =>
      decisionText.endsWith(option)
    );
    expect(endsWithInitialOption).toBeTruthy();
  }
});
