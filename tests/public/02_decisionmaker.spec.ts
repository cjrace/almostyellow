import { test, expect } from "@playwright/test";

test("Hasn't prematurely made a decision", async ({ page }) => {
  await page.goto("/decisionmaker");

  // Check the decision div hasn't appeared yet
  await expect(page.getByTestId("choice_made")).toHaveCount(0);
});

test("Won't make a decision if nothing to decide", async ({ page }) => {
  await page.goto("/decisionmaker");

  // Prematurely press the button
  await page.getByRole("button", { name: "Make a decision" }).click();

  // Expect an error and no decision
  await expect(page.getByRole("paragraph")).toContainText(
    "Please enter at least 2 options.",
  );
  await expect(page.getByTestId("choice_made")).toHaveCount(0);

  // Enter one thing in the box
  await page.getByLabel("List out your options").fill("Only one road ahead");
  await page.getByRole("button", { name: "Make a decision" }).click();

  // Expect an error and no decision
  await expect(page.getByRole("paragraph")).toContainText(
    "Please enter at least 2 options.",
  );
  await expect(page.getByTestId("choice_made")).toHaveCount(0);
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
  await page.getByLabel("List out your options").fill(optionsToEnter);
  await page.getByRole("button", { name: "Make a decision" }).click();

  // Get the chosen takeaway text
  const chosenTakeaway = await page.getByTestId("choice_made").textContent();

  // Assert that the chosen takeaway is one of the provided options
  expect(takeawayOptions).toContain(chosenTakeaway);
});
