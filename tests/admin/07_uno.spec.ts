import { test, expect, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { assertEmulatorEnvironment } from "../firebase/guard";
import { getCredentials, getSecondCredentials } from "./helpers";
import type { LocalData } from "../../src/uno/storage";

const SYNC = { timeout: 30_000 };
async function signIn(page: Page, credentials = getCredentials()) {
  await page.goto("/admin/login?callbackUrl=/games/uno");
  await page
    .getByPlaceholder("e.g. simply@thebest.co.uk")
    .fill(credentials.email);
  await page.getByPlaceholder("Enter password").fill(credentials.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/games/uno");
  await expect(
    page.getByRole("button", { name: "Start new game" }),
  ).toBeEnabled(SYNC);
}
async function start(page: Page) {
  await page.getByRole("button", { name: "Start new game" }).click();
  await expect(
    page.getByRole("button", { name: "Add a round for Cam" }),
  ).toBeEnabled(SYNC);
}
async function idle(page: Page) {
  await expect(page.getByRole("status")).toContainText(
    /All .*saved|All .*synced|result was amended/,
    SYNC,
  );
}
async function local(page: Page): Promise<LocalData> {
  return page.evaluate(
    () =>
      new Promise<LocalData>((resolve, reject) => {
        const request = indexedDB.open("almostyellow-uno", 1);
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction("data")
            .objectStore("data")
            .get("current");
          read.onsuccess = () => {
            resolve(read.result as LocalData);
            db.close();
          };
          read.onerror = () => {
            reject(new Error("Cannot read Uno storage"));
          };
        };
        request.onerror = () => {
          reject(new Error("Cannot open Uno storage"));
        };
      }),
  );
}

test.describe("Uno durable scoring", () => {
  // One shared scoreboard; run its mutation scenarios sequentially in one project.
  test.describe.configure({ mode: "default" });
  test.beforeEach(async ({ browserName }, info) => {
    test.skip(
      browserName !== "chromium" || info.project.name !== "Google Chrome",
      "Shared scoreboard mutations run once in desktop Chrome; layouts run in all projects.",
    );
    const { projectId } = assertEmulatorEnvironment();
    const db = getFirestore(getApps()[0] ?? initializeApp({ projectId }));
    for (const name of ["uno", "unoGames", "unoLeases"])
      await db.recursiveDelete(db.collection(name));
  });

  test("offline awards and corrections survive closing and reopening, then sync once to another device", async ({
    page,
    context,
    browser,
  }) => {
    test.slow();
    await signIn(page);
    await start(page);
    await idle(page);
    await page.setViewportSize({ width: 375, height: 740 });
    const scoringButton = await page
      .getByRole("button", { name: "Add a round for Cam" })
      .boundingBox();
    expect(scoringButton?.height).toBeGreaterThanOrEqual(56);
    expect(
      (scoringButton?.y ?? 0) + (scoringButton?.height ?? 0),
    ).toBeLessThanOrEqual(740);
    await page.screenshot({
      path: test.info().outputPath("uno-mobile.png"),
      fullPage: true,
    });
    await page
      .locator("summary")
      .filter({ hasText: "Offline storage" })
      .click();
    await expect(
      page.getByText("Ready to reopen offline on this device."),
    ).toBeVisible(SYNC);
    const cachedPaths = await page.evaluate(async () => {
      const cache = await caches.open("uno-shell-v1");
      return (await cache.keys()).map(
        (request) => new URL(request.url).pathname,
      );
    });
    expect(cachedPaths).toContain("/games/uno/stats");
    expect(
      cachedPaths.every(
        (path) =>
          path === "/games/uno" ||
          path === "/games/uno/stats" ||
          path.startsWith("/_next/static/"),
      ),
    ).toBe(true);
    const bobContext = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    const bob = await bobContext.newPage();
    await bob.goto("/admin/login?callbackUrl=/games/uno");
    const credentials = getSecondCredentials();
    await bob
      .getByPlaceholder("e.g. simply@thebest.co.uk")
      .fill(credentials.email);
    await bob.getByPlaceholder("Enter password").fill(credentials.password);
    await bob.getByRole("button", { name: "Log in", exact: true }).click();
    await bob.waitForURL("**/games/uno");
    await expect(
      bob.getByRole("button", { name: "Add a round for Laura" }),
    ).toBeEnabled(SYNC);
    await context.setOffline(true);
    await bobContext.setOffline(true);
    await bob.getByRole("button", { name: "Add a round for Laura" }).click();
    await expect(bob.getByTestId("score-laura")).toHaveText("1");
    await page
      .getByRole("button", { name: "Add a round for Cam" })
      .click({ clickCount: 3 });
    await expect(page.getByTestId("score-cam")).toHaveText("3");
    await page.getByRole("button", { name: "Remove a round for Cam" }).click();
    await expect(page.getByTestId("score-cam")).toHaveText("2");
    await expect(
      page.getByRole("button", { name: "Finish game", exact: true }),
    ).toBeDisabled();
    expect((await local(page)).events).toHaveLength(4);
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto("/games/uno");
    await expect(reopened.getByTestId("score-cam")).toHaveText("2", SYNC);
    await reopened
      .getByRole("button", { name: "Add a round for Laura" })
      .click();
    await expect(reopened.getByTestId("score-laura")).toHaveText("1");
    await context.setOffline(false);
    await idle(reopened);
    await expect
      .poll(async () => (await local(reopened)).events.length, SYNC)
      .toBe(0);
    await bobContext.setOffline(false);
    await idle(bob);
    await expect(bob.getByTestId("score-cam")).toHaveText("2", SYNC);
    await expect(bob.getByTestId("score-laura")).toHaveText("2", SYNC);
    await reopened.reload();
    await expect(reopened.getByTestId("lifetime-cam")).toHaveText("2", SYNC);
    await bobContext.close();
  });

  test("a failed response retains the queue and retry does not duplicate the award", async ({
    page,
  }) => {
    test.slow();
    await signIn(page);
    await start(page);
    await idle(page);
    let fail = true;
    await page.route("**/games/uno", async (route) => {
      if (route.request().method() === "POST" && fail) {
        fail = false;
        await route.fetch();
        await route.abort();
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Add a round for Cam" }).click();
    await expect(page.getByTestId("score-cam")).toHaveText("1");
    await expect
      .poll(async () => (await local(page)).events.length, SYNC)
      .toBe(0);
    await page.reload();
    await expect(page.getByTestId("score-cam")).toHaveText("1", SYNC);
    await expect(page.getByTestId("lifetime-cam")).toHaveText("1");
  });

  test("a storage failure never confirms or awards the point", async ({
    page,
  }) => {
    await signIn(page);
    await start(page);
    await idle(page);
    await page.evaluate(() => {
      IDBObjectStore.prototype.put = () => {
        throw new DOMException("Storage full", "QuotaExceededError");
      };
    });
    await page.getByRole("button", { name: "Add a round for Cam" }).click();
    await expect(
      page.getByRole("alert", { name: "Scores need attention" }),
    ).toContainText(/Storage full|not saved|storage/);
    await expect(page.getByTestId("score-cam")).toHaveText("0");
    await page.reload();
    await expect(page.getByTestId("lifetime-cam")).toHaveText("0", SYNC);
  });

  test("historic games retain dates and free-text notes in history and totals", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("link", { name: "Statistics", exact: true }).click();
    await page.getByRole("button", { name: "Add historic game" }).click();
    await page.getByRole("textbox", { name: "Cam’s round wins" }).fill("8");
    await page.getByRole("textbox", { name: "Laura’s round wins" }).fill("6");
    await page.getByLabel("Game date").fill("2020-06-12");
    await page
      .getByRole("textbox", { name: "Notes" })
      .fill("Played in the garden after tea.");
    await page.getByRole("button", { name: "Save historic game" }).click();
    await expect(
      page.getByText("Played in the garden after tea."),
    ).toBeVisible();
    await expect(page.getByText("2020-06-12 · historic game")).toBeVisible();
    await page.getByRole("link", { name: "Tracker", exact: true }).click();
    await expect(page.getByTestId("lifetime-cam")).toHaveText("8", SYNC);
    await expect(page.getByTestId("lifetime-laura")).toHaveText("6");
  });

  test("queued rounds are preserved when the signed-in account changes", async ({
    page,
    context,
  }) => {
    test.slow();
    await signIn(page);
    await start(page);
    await idle(page);
    await context.setOffline(true);
    await page.getByRole("button", { name: "Add a round for Cam" }).click();
    await expect(page.getByTestId("score-cam")).toHaveText("1");
    // Simulate another account having signed in while this tab was offline.
    await page.route("**/games/uno/session", (route) =>
      route.fulfill({ json: { uid: getSecondCredentials().uid } }),
    );
    await context.setOffline(false);
    await expect(
      page.getByRole("alert", { name: "Scores need attention" }),
    ).toContainText("another account", SYNC);
    expect((await local(page)).events).toHaveLength(1);
    await page.unroute("**/games/uno/session");
    await page.reload();
    await idle(page);
    expect((await local(page)).events).toHaveLength(0);
  });

  test("late offline rounds amend their original result while the next game stays untouched", async ({
    page,
    browser,
  }) => {
    test.slow();
    await signIn(page);
    await start(page);
    await idle(page);
    const otherContext = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    const other = await otherContext.newPage();
    await other.goto("/admin/login?callbackUrl=/games/uno");
    const credentials = getSecondCredentials();
    await other
      .getByPlaceholder("e.g. simply@thebest.co.uk")
      .fill(credentials.email);
    await other.getByPlaceholder("Enter password").fill(credentials.password);
    await other.getByRole("button", { name: "Log in", exact: true }).click();
    await other.waitForURL("**/games/uno");
    await expect(
      other.getByRole("button", { name: "Add a round for Laura" }),
    ).toBeEnabled(SYNC);
    await otherContext.setOffline(true);
    await other.getByRole("button", { name: "Add a round for Laura" }).click();
    await expect(other.getByTestId("score-laura")).toHaveText("1");
    await page
      .getByRole("button", { name: "Finish game", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirm finish" }).click();
    await expect(page.getByText("It’s a draw!")).toBeVisible();
    await start(page);
    await otherContext.setOffline(false);
    await idle(other);
    await expect(page.getByTestId("lifetime-laura")).toHaveText("1", SYNC);
    await expect(page.getByTestId("score-laura")).toHaveText("0");
    await page.getByRole("link", { name: "Statistics", exact: true }).click();
    await expect(
      page.getByText("Result amended after offline rounds synced."),
    ).toBeVisible();
    await otherContext.close();
  });
});
