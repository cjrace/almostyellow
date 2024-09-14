import { test, expect } from "@playwright/test";

test("Hasn't prematurely made a decision", async ({ page }) => {
  await page.goto("/decisionmaker");

  // Check the decision div hasn't appeared yet  
  expect(page.locator("div#decision")).not.toBeVisible();
});

test("Won't make a decision if nothing to decide", async ({ page }) => {
  await page.goto("/decisionmaker");

  // Prematurely press the button
  await page.click("text=Make a decision");
  // Expect an error
  // Enter one thing in the box
  // Expect an error
  await page.click("text=Make a decision");
});

test("Makes a valid decision", async ({ page }) => {
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
  await page.getByRole('textbox', { name: 'options' }).fill(optionsToEnter);
  await page.click("text=Make a decision");

  // Ensure decision has been made
  const decisionDiv = await page.locator("div#decision");
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
