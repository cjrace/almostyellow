import {
  test,
  expect,
  waitsForHydration,
  type Locator,
  type Route,
} from "../playwright";
import { users } from "../firebase/fixtures";
import { expectNoUnexpectedAxeViolations, useScheme } from "../axe";

async function expectTextInsideCap(button: Locator) {
  const fits = await button.evaluate((button) => {
    const cap = button.firstElementChild;
    const label = cap?.firstElementChild;
    if (!(cap instanceof HTMLElement) || !(label instanceof HTMLElement))
      throw new Error("The buzzer label is missing.");
    const bounds = cap.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(label);
    const insideCircle = Array.from(range.getClientRects()).every((line) =>
      [
        [line.left, line.top],
        [line.right, line.top],
        [line.left, line.bottom],
        [line.right, line.bottom],
      ].every(
        ([x, y]) =>
          ((x - bounds.left - bounds.width / 2) / (bounds.width / 2)) ** 2 +
            ((y - bounds.top - bounds.height / 2) / (bounds.height / 2)) ** 2 <=
          1,
      ),
    );
    return insideCircle && label.scrollWidth <= label.clientWidth;
  });
  expect(fits).toBe(true);
}
test.describe("Quiz host and guests", () => {
  test("explains blocked cookies after two attempts and sends no recovery key in the body", async ({
    page,
  }) => {
    const inputs: unknown[] = [];
    await page.route("**/api/buzzer", (route) => {
      inputs.push((route.request().postDataJSON() as { input: unknown }).input);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ retry: true }),
      });
    });
    await page.goto("/games/buzzer?room=ABC2");
    await page.getByLabel("Your name", { exact: true }).fill("Cam");
    await page.getByRole("button", { name: "Join room", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Allow cookies for this website",
    );
    expect(inputs).toEqual([
      { code: "ABC2", name: "Cam" },
      { code: "ABC2", name: "Cam" },
    ]);
    await expect(
      page.getByRole("button", { name: "Join room", exact: true }),
    ).toBeEnabled();
  });
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
      await page.goto("/games/buzzer");
      await expect(page.getByRole("textbox")).toHaveCount(0);
      await page
        .getByRole("link", { name: "Create a room", exact: true })
        .click();
      await page.waitForURL(/\/admin\/login\?/);
      await page
        .getByPlaceholder("e.g. simply@thebest.co.uk")
        .fill(users.alice.email);
      await page.getByPlaceholder("Enter password").fill(users.alice.password);
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await page.waitForURL("/games/buzzer");
      await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    });
    let code = "";
    await test.step("When the host creates an open room and resets buzzing", async () => {
      await expect(page.getByRole("textbox")).toHaveCount(0);
      const create = page.getByRole("button", {
        name: "Create a room",
        exact: true,
      });
      await expect(create).toBeEnabled();
      await page.screenshot({
        path: testInfo.outputPath("host-landing-dark.png"),
        fullPage: true,
      });
      if (testInfo.project.name === "Google Chrome")
        await expectNoUnexpectedAxeViolations(page);
      await create.focus();
      await page.keyboard.press("Enter");
      const heading = page.getByRole("heading", { name: /^Room / });
      await expect(heading).toBeVisible();
      code = (await heading.innerText()).slice(5);
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
      await expect(
        page.getByRole("button", { name: "Players (0/20)" }),
      ).toBeVisible();
      await page.getByLabel("Your player name", { exact: true }).fill("Cam");
      await page
        .getByRole("button", { name: "Join as a player", exact: true })
        .click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Could not join the room",
      );
      await expect(page.getByText(/Reconnecting|ended|expired/)).toHaveCount(0);
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Reset", exact: true }),
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
        page.getByRole("button", { name: "Reset", exact: true }),
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
    await page
      .getByRole("button", { name: "Join with a code", exact: true })
      .click();
    await page.getByLabel("Room code", { exact: true }).fill("ABC2");
    await page.getByLabel("Your name", { exact: true }).fill("Cam");
    await page.getByRole("button", { name: "Join room", exact: true }).click();
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toContainText("Could not join the room");
    await expect(alert).not.toContainText("Allow browser storage");
    await expect(
      page.getByRole("button", { name: "Join room", exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel("Room code", { exact: true })).toHaveValue(
      "ABC2",
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
  // Mobile Safari covers the phone case, so Mobile Chrome skips this slow test.
  test(
    "join, buzz, refresh, reset and remove a player",
    {
      tag: "@no-android",
    },
    async ({ page, browser, browserName }, testInfo) => {
      test.setTimeout(90000);
      if (testInfo.project.name === "Google Chrome")
        await useScheme(page, "dark");
      const guestName = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234";
      // Windows WebKit reports None even for Strict cookies. Check the response
      // header as well; Playwright's browsercontext-cookies tests cover this limit.
      const storedSameSite =
        browserName === "webkit" && process.platform === "win32"
          ? "None"
          : "Strict";
      let signUps = 0;
      await page.context().route(
        (url) => url.pathname.endsWith("/accounts:signUp"),
        (route) => {
          signUps++;
          return route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              error: { message: "ADMIN_ONLY_OPERATION" },
            }),
          });
        },
      );
      await test.step("Given public sign-ups are blocked and the buzzer page is open before admin sign-in", async () => {
        await page.goto("/games/buzzer");
        await expect(
          page.getByRole("button", { name: "Join with a code", exact: true }),
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
        .getByRole("button", { name: "Create a room", exact: true })
        .click();
      const heading = page.getByRole("heading", { name: /^Room / });
      await expect(heading).toBeVisible();
      const code = (await heading.innerText()).slice(5);
      await page.getByLabel("Your player name", { exact: true }).fill("Host");
      await page
        .getByRole("button", { name: "Join as a player", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Players (1/20)" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Buzz!", exact: true }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "Buzz!", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Buzz recorded", exact: true }),
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
            body: JSON.stringify({
              error: { message: "ADMIN_ONLY_OPERATION" },
            }),
          });
        },
      );
      try {
        await guest.goto("/games/buzzer");
        await guest
          .getByRole("button", { name: "Join with a code", exact: true })
          .click();
        await guest
          .getByLabel("Room code", { exact: true })
          .fill(code.toLowerCase());
        await expect(
          guest.getByLabel("Room code", { exact: true }),
        ).toHaveValue(code);
        await guest.getByLabel("Your name", { exact: true }).fill(guestName);
        const cookieResponse = guest.waitForResponse(
          (response) => new URL(response.url()).pathname === "/api/buzzer",
        );
        await guest
          .getByRole("button", { name: "Join room", exact: true })
          .click();
        await expect(
          guest.getByRole("button", { name: "Players (2/20)" }),
        ).toBeVisible();
        expect(
          await (await cookieResponse).headerValue("set-cookie"),
        ).toContain("SameSite=strict");
        const roomCookie = (await context.cookies()).find(
          (cookie) => cookie.name === `buzzer-guest-${code}`,
        );
        expect(roomCookie).toMatchObject({
          httpOnly: true,
          sameSite: storedSameSite,
          secure: false,
          path: "/api/buzzer",
        });
        expect(
          await guest.evaluate(() =>
            Object.keys(localStorage).filter((key) =>
              key.startsWith("buzzer-key-"),
            ),
          ),
        ).toEqual([]);
        await test.step("When a guest joins after another player buzzes and presses Space", async () => {
          await expect(
            guest.getByRole("button", { name: "Buzz!", exact: true }),
          ).toBeEnabled();
          await guest
            .getByRole("button", { name: "Buzz!", exact: true })
            .focus();
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
          const { promise: confirmation, resolve: release } =
            Promise.withResolvers<boolean>();
          const holdBuzz = async (route: Route) => {
            if (
              (route.request().postDataJSON() as { action: string }).action ===
              "buzz"
            )
              await confirmation;
            await route.continue();
          };
          await guest.route("**/api/buzzer", holdBuzz);
          try {
            await guest.keyboard.up("Space");
            const confirming = guest.getByRole("button", {
              name: "Confirming…",
              exact: true,
            });
            await expect(confirming).toBeVisible();
            await expectTextInsideCap(confirming);
            await guest.screenshot({
              path: testInfo.outputPath("buzzer-confirming.png"),
              fullPage: true,
            });
            if (testInfo.project.name === "Google Chrome") {
              const viewport = guest.viewportSize();
              if (!viewport) throw new Error("The guest viewport is missing.");
              try {
                await guest.setViewportSize({
                  width: 320,
                  height: viewport.height,
                });
                await expectTextInsideCap(confirming);
                await guest.setViewportSize(viewport);
                await guest.evaluate(() => {
                  document.body.style.zoom = "2";
                });
                await expectTextInsideCap(confirming);
              } finally {
                await guest.setViewportSize(viewport);
                await guest.evaluate(() => {
                  document.body.style.zoom = "";
                });
              }
            }
          } finally {
            release(true);
            await guest.unrouteAll({ behavior: "wait" });
          }
          await expect(
            guest.getByRole("button", { name: "Buzz recorded", exact: true }),
          ).toBeVisible();
          await expectTextInsideCap(
            guest.getByRole("button", { name: "Buzz recorded", exact: true }),
          );
          await expect(
            guest.getByRole("button", { name: "Buzz recorded", exact: true }),
          ).toHaveCSS("opacity", "0.5");
          await guest.emulateMedia({ reducedMotion: "reduce" });
          await expect(
            guest
              .getByRole("button", { name: "Buzz recorded", exact: true })
              .locator("span")
              .first(),
          ).toHaveCSS("transition-duration", "0s");
          await guest.emulateMedia({ reducedMotion: "no-preference" });
          await expect(
            page
              .getByRole("list", { name: "Buzz order" })
              .getByRole("listitem")
              .filter({ hasText: guestName }),
          ).toBeVisible();
          await expect(
            guest.getByRole("status").filter({ hasText: /^You're (2nd|1st)/ }),
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
              .getByRole("button", { name: "Create a room", exact: true })
              .click();
            const otherHeading = otherHost.getByRole("heading", {
              name: /^Room /,
            });
            await expect(otherHeading).toBeVisible();
            const otherCode = (await otherHeading.innerText()).slice(5);
            await otherGuest.goto(`/games/buzzer?room=${otherCode}`);
            await expect(otherGuest.getByRole("textbox")).toHaveCount(1);
            await expect(
              otherGuest.getByLabel("Room code", { exact: true }),
            ).toHaveCount(0);
            await otherGuest
              .getByLabel("Your name", { exact: true })
              .fill("Laura");
            await otherGuest
              .getByLabel("Your name", { exact: true })
              .press("Enter");
            await expect(
              otherGuest.getByRole("button", { name: "Players (1/20)" }),
            ).toBeVisible();
            const otherCookie = (await context.cookies()).find(
              (cookie) => cookie.name === `buzzer-guest-${otherCode}`,
            );
            expect(otherCookie).toMatchObject({
              httpOnly: true,
              sameSite: storedSameSite,
              path: "/api/buzzer",
            });
            expect(otherCookie?.value).not.toBe(roomCookie?.value);
            await otherGuest.reload();
            await expect(
              otherGuest.getByRole("button", { name: "Players (1/20)" }),
            ).toBeVisible();
            await guest.reload();
            await expect(
              guest.getByRole("button", { name: "Buzz recorded", exact: true }),
            ).toBeVisible();
            await expect(
              guest.getByRole("button", { name: "Players (2/20)" }),
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
        await page.getByRole("button", { name: "Reset", exact: true }).click();
        await expect(
          guest.getByRole("list", { name: "Buzz order" }),
        ).toHaveCount(0);
        await expect(
          guest.getByRole("button", { name: "Buzz!", exact: true }),
        ).toBeEnabled();
        await guest.getByRole("button", { name: "Buzz!", exact: true }).click();
        await expect(
          guest.getByRole("button", { name: "Buzz recorded", exact: true }),
        ).toBeVisible();
        await expect(
          page
            .getByRole("list", { name: "Buzz order" })
            .getByRole("listitem")
            .filter({ hasText: guestName }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Reset", exact: true }).click();
        await expect(
          guest.getByRole("button", { name: "Buzz!", exact: true }),
        ).toBeEnabled();
        await context.setOffline(true);
        await expect(
          guest.getByRole("button", { name: "Buzz!", exact: true }),
        ).toBeDisabled();
        await expect(
          guest.getByRole("button", { name: "Buzz!", exact: true }),
        ).toHaveCSS("opacity", "0.5");
        await context.setOffline(false);
        await expect(
          guest.getByRole("button", { name: "Buzz!", exact: true }),
        ).toBeEnabled();
        await expect(
          guest.getByRole("button", { name: "Buzz!", exact: true }),
        ).toHaveCSS("opacity", "1");
        await page.getByRole("button", { name: /^Players \(/ }).click();
        await page
          .getByRole("button", { name: `Remove ${guestName}`, exact: true })
          .click();
        await expect(
          guest.getByRole("alert").filter({ hasText: "removed" }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "End room", exact: true })
          .click();
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
        await page
          .getByRole("button", { name: "Leave game", exact: true })
          .click();
        await page.waitForURL("/games");
        expect(signUps).toBe(0);
      } finally {
        await context.close();
      }
    },
  );
  test("explains play and keeps room links out of search", async ({
    page,
  }, testInfo) => {
    await page.goto("/games/buzzer?room=ABC2");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Quiz buzzer | Almost Yellow",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    const information = page.getByRole("button", {
      name: "Open game instructions modal",
      exact: true,
    });
    await information.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toContainText(
      "Network and processing delays",
    );
    await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
    await page.screenshot({
      path: testInfo.outputPath("instructions.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Close instructions modal", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(information).toBeFocused();
    await information.click();
    await expect(
      page.getByRole("dialog", { name: "Quiz buzzer instructions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Close instructions modal",
        exact: true,
      }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(information).toBeFocused();
  });
});
