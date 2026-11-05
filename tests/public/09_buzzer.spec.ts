import { test, expect, waitsForHydration } from "../playwright";
import { users } from "../firebase/fixtures";
test.describe("Quiz host and guests", () => {
  test("join, buzz, refresh, reset and remove a player", async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(90000);
    const guestName = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234";
    await test.step("Given a guest identity exists before admin sign-in", async () => {
      await page.goto("/games/buzzer");
      await expect(
        page.getByRole("button", { name: "Join room", exact: true }),
      ).toBeEnabled();
    });
    await page.goto("/admin/login");
    await page
      .getByPlaceholder("e.g. simply@thebest.co.uk")
      .fill(users.alice.email);
    await page.getByPlaceholder("Enter password").fill(users.alice.password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL("/");
    await page.goto("/games/buzzer");
    await page
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    const heading = page.getByRole("heading", { name: /^Room / });
    await expect(heading).toBeVisible();
    const code = (await heading.innerText()).slice(5);
    await page.getByLabel("Your player name", { exact: true }).fill("Host");
    await page
      .getByRole("button", { name: "Join as a player", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Players (1/20)" }),
    ).toBeVisible();
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      viewport: testInfo.project.use.viewport,
      isMobile: testInfo.project.use.isMobile,
      hasTouch: testInfo.project.use.hasTouch,
    });
    const guest = waitsForHydration(await context.newPage());
    try {
      await guest.goto(`/games/buzzer?room=${code}`);
      await guest.getByLabel("Your name", { exact: true }).fill(guestName);
      await guest
        .getByRole("button", { name: "Join room", exact: true })
        .click();
      await expect(
        guest.getByRole("heading", { name: "Players (2/20)" }),
      ).toBeVisible();
      await test.step("When the host opens buzzing and the guest presses Space", async () => {
        await page
          .getByRole("button", { name: "Open buzzing", exact: true })
          .click();
        await expect(
          guest.getByRole("button", { name: "Buzz!", exact: true }),
        ).toBeEnabled();
        await guest.getByRole("button", { name: "Buzz!", exact: true }).focus();
        const cap = guest
          .getByRole("button", { name: "Buzz!", exact: true })
          .locator("span")
          .first();
        const raised = await cap.boundingBox();
        if (!raised) throw new Error("The buzzer cap is missing");
        await guest.keyboard.down("Space");
        await expect
          .poll(async () => (await cap.boundingBox())?.y ?? 0)
          .toBeGreaterThan(raised.y + 5);
        await guest.keyboard.up("Space");
        await expect(
          guest.getByRole("button", { name: "Buzz recorded", exact: true }),
        ).toBeVisible();
        await guest.emulateMedia({ reducedMotion: "reduce" });
        await expect(
          guest
            .getByRole("button", { name: "Buzz recorded", exact: true })
            .locator("span")
            .first(),
        ).toHaveCSS("transition-duration", "0s");
        await guest.emulateMedia({ reducedMotion: "no-preference" });
        await expect(
          page.getByRole("cell", { name: guestName, exact: true }),
        ).toBeVisible();
      });
      expect(
        await guest.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("buzzer-host.png"),
        fullPage: true,
      });
      await guest.screenshot({
        path: testInfo.outputPath("buzzer-player.png"),
        fullPage: true,
      });
      await test.step("Then refreshing restores the confirmed result", async () => {
        await guest.reload();
        await expect(
          guest.getByRole("button", { name: "Buzz recorded", exact: true }),
        ).toBeVisible();
      });
      await page
        .getByRole("button", { name: "Close buzzing", exact: true })
        .click();
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await expect(
        guest.getByRole("cell", { name: guestName, exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Open buzzing", exact: true })
        .click();
      await expect(
        guest.getByRole("button", { name: "Buzz!", exact: true }),
      ).toBeEnabled();
      await context.setOffline(true);
      await expect(
        guest.getByRole("button", { name: "Buzz!", exact: true }),
      ).toBeDisabled();
      await context.setOffline(false);
      await expect(
        guest.getByRole("button", { name: "Buzz!", exact: true }),
      ).toBeEnabled();
      await expect(
        guest.getByRole("cell", { name: "Guest", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: `Remove ${guestName}`, exact: true })
        .click();
      await expect(
        guest.getByRole("alert").filter({ hasText: "removed" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "End room", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "End room", exact: true })
        .click();
      await expect(
        page.getByText("This room has ended.", { exact: true }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
  test("puts the buzzer last in the games list", async ({ page }) => {
    await page.goto("/games");
    await expect(
      page.getByRole("link", { name: /^Play / }).last(),
    ).toHaveAttribute("href", "/games/buzzer");
  });
  test("fits narrow screens and zoom in both colour schemes", async ({
    page,
  }, testInfo) => {
    await page.goto("/games/buzzer");
    for (const scheme of ["dark", "light"]) {
      await page.evaluate((scheme) => {
        document.documentElement.setAttribute(
          "data-mantine-color-scheme",
          scheme,
        );
      }, scheme);
      await page.setViewportSize({ width: 320, height: 640 });
      await expect(
        page.getByLabel("Room code", { exact: true }),
      ).toBeInViewport();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("landing-" + scheme + ".png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.evaluate(() => {
        document.body.style.zoom = "2";
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() => {
        document.body.style.zoom = "1";
      });
    }
  });
  test("explains play and keeps room links out of search", async ({ page }) => {
    await page.goto("/games/buzzer?room=ABC234");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Quiz buzzer | Almost Yellow",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await page
      .getByRole("button", { name: "Instructions", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Network and processing delays",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
