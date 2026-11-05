import { test, expect, waitsForHydration } from "../playwright";
import { users } from "../firebase/fixtures";
import { expectNoUnexpectedAxeViolations, useScheme } from "../axe";
test.describe("Quiz host and guests", () => {
  test("a signed-in host can create, restore and control a room when player sign-in fails", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    await useScheme(page, "dark");
    await test.step("Given guest provisioning is unavailable but the host is signed in", async () => {
      await page.route("**/api/buzzer", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Could not join the room. Try again.",
          }),
        }),
      );
      await page.goto("/admin/login");
      await page
        .getByPlaceholder("e.g. simply@thebest.co.uk")
        .fill(users.alice.email);
      await page.getByPlaceholder("Enter password").fill(users.alice.password);
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await page.waitForURL("/");
      await page.goto("/games/buzzer");
      await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    });
    let code = "";
    await test.step("When the host creates a room and opens and resets buzzing", async () => {
      const create = page.getByRole("button", {
        name: "Create room",
        exact: true,
      });
      await expect(create).toBeEnabled();
      await create.focus();
      await page.keyboard.press("Enter");
      const heading = page.getByRole("heading", { name: /^Room / });
      await expect(heading).toBeVisible();
      code = (await heading.innerText()).slice(5);
      await expect(
        page.getByRole("heading", { name: "Players (0/20)" }),
      ).toBeVisible();
      await page.getByLabel("Your player name", { exact: true }).fill("Cam");
      await page
        .getByRole("button", { name: "Join as a player", exact: true })
        .click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Could not join the room",
      );
      await page
        .getByRole("button", { name: "Open buzzing", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Close buzzing", exact: true }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Open buzzing", exact: true }),
      ).toBeEnabled();
      if (testInfo.project.name === "Google Chrome")
        await expectNoUnexpectedAxeViolations(page);
    });
    await test.step("Then a refresh restores hosting and the host can end the room", async () => {
      await page.reload();
      await expect(
        page.getByRole("heading", { name: `Room ${code}`, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Open buzzing", exact: true }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "End room", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "End room", exact: true })
        .click();
      await expect(
        page.getByText("This room has ended.", { exact: true }),
      ).toBeVisible();
    });
  });
  test("a guest can retry a failed join without losing the form", async ({
    page,
  }, testInfo) => {
    await useScheme(page, "light");
    await page.route("**/api/buzzer", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Could not join the room. Try again.",
        }),
      }),
    );
    await page.goto("/games/buzzer");
    await page.getByLabel("Room code", { exact: true }).fill("ABC234");
    await page.getByLabel("Your name", { exact: true }).fill("Cam");
    await page.getByRole("button", { name: "Join room", exact: true }).click();
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toContainText("Could not join the room");
    await expect(alert).not.toContainText("Allow browser storage");
    await expect(
      page.getByRole("button", { name: "Join room", exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel("Room code", { exact: true })).toHaveValue(
      "ABC234",
    );
    await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
      "Cam",
    );
    await page.unroute("**/api/buzzer");
    await page.getByRole("button", { name: "Join room", exact: true }).click();
    await expect(alert).toContainText("This room code is not available");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (testInfo.project.name === "Google Chrome")
      await expectNoUnexpectedAxeViolations(page);
  });
  test("join, buzz, refresh, reset and remove a player", async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(90000);
    if (testInfo.project.name === "Google Chrome")
      await useScheme(page, "dark");
    const guestName = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234";
    let signUps = 0;
    await page.context().route(
      (url) => url.pathname.endsWith("/accounts:signUp"),
      (route) => {
        signUps++;
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: { message: "ADMIN_ONLY_OPERATION" } }),
        });
      },
    );
    await test.step("Given public sign-ups are blocked and the buzzer page is open before admin sign-in", async () => {
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
    await context.route(
      (url) => url.pathname.endsWith("/accounts:signUp"),
      (route) => {
        signUps++;
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: { message: "ADMIN_ONLY_OPERATION" } }),
        });
      },
    );
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
      await test.step("And another room in the same browser keeps its own identity", async () => {
        const otherHost = waitsForHydration(await page.context().newPage());
        const otherGuest = waitsForHydration(await context.newPage());
        try {
          await otherHost.goto("/games/buzzer");
          await otherHost
            .getByRole("button", { name: "Create room", exact: true })
            .click();
          const otherHeading = otherHost.getByRole("heading", {
            name: /^Room /,
          });
          await expect(otherHeading).toBeVisible();
          const otherCode = (await otherHeading.innerText()).slice(5);
          await otherGuest.goto(`/games/buzzer?room=${otherCode}`);
          await otherGuest
            .getByLabel("Your name", { exact: true })
            .fill("Laura");
          await otherGuest
            .getByRole("button", { name: "Join room", exact: true })
            .click();
          await expect(
            otherGuest.getByRole("heading", { name: "Players (1/20)" }),
          ).toBeVisible();
          await otherGuest.reload();
          await expect(
            otherGuest.getByRole("heading", { name: "Players (1/20)" }),
          ).toBeVisible();
          await guest.reload();
          await expect(
            guest.getByRole("button", { name: "Buzz recorded", exact: true }),
          ).toBeVisible();
          await expect(
            guest.getByRole("heading", { name: "Players (2/20)" }),
          ).toBeVisible();
        } finally {
          await otherGuest.close();
          await otherHost.close();
        }
      });
      if (testInfo.project.name === "Google Chrome") {
        await expectNoUnexpectedAxeViolations(page);
        await expectNoUnexpectedAxeViolations(guest);
      }
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
      await expect(
        page.getByRole("dialog", { name: "End this room?" }),
      ).toBeVisible();
      if (testInfo.project.name === "Google Chrome")
        await expectNoUnexpectedAxeViolations(page);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "End room", exact: true })
        .click();
      await expect(
        page.getByText("This room has ended.", { exact: true }),
      ).toBeVisible();
      expect(signUps).toBe(0);
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
  test(
    "fits a phone in both colour schemes",
    { tag: "@phone" },
    async ({ page }, testInfo) => {
      await page.goto("/games/buzzer");
      for (const scheme of ["dark", "light"]) {
        await page.evaluate((scheme) => {
          document.documentElement.setAttribute(
            "data-mantine-color-scheme",
            scheme,
          );
        }, scheme);
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
      }
    },
  );
  test(
    "fits 200% zoom in both colour schemes",
    { tag: "@desktop" },
    async ({ page }) => {
      await page.goto("/games/buzzer");
      for (const scheme of ["dark", "light"]) {
        await page.evaluate((scheme) => {
          document.documentElement.setAttribute(
            "data-mantine-color-scheme",
            scheme,
          );
          document.body.style.zoom = "2";
        }, scheme);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    },
  );
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
