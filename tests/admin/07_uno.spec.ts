import { test, expect, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { assertEmulatorEnvironment } from "../firebase/guard";
import { getCredentials, getSecondCredentials } from "./helpers";
import type { LocalData } from "../../src/uno/storage";

const SYNC = { timeout: 30_000 };
async function signIn(page: Page, credentials = getCredentials()) {
  await page.goto("/admin/login?callbackUrl=/games/uno-tracker");
  await page
    .getByPlaceholder("e.g. simply@thebest.co.uk")
    .fill(credentials.email);
  await page.getByPlaceholder("Enter password").fill(credentials.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/games/uno-tracker");
  await expect(
    page.getByRole("button", { name: "Start new game" }),
  ).toBeEnabled(SYNC);
}
// The segmented control hides its radio inputs, so press the visible label
async function openTab(page: Page, name: "Tracker" | "Statistics" | "History") {
  await page
    .getByRole("radiogroup", { name: "Uno pages" })
    .getByText(name, { exact: true })
    .click();
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
    await expect
      .poll(
        () =>
          page.evaluate(
            async () =>
              (await (await caches.open("uno-shell-v1")).keys()).length,
          ),
        SYNC,
      )
      .toBeGreaterThan(1);
    const cachedPaths = await page.evaluate(async () => {
      const cache = await caches.open("uno-shell-v1");
      return (await cache.keys()).map(
        (request) => new URL(request.url).pathname,
      );
    });
    expect(cachedPaths).toContain("/games/uno-tracker/stats");
    expect(cachedPaths).toContain("/games/uno-tracker/history");
    expect(
      cachedPaths.every(
        (path) =>
          path === "/games/uno-tracker" ||
          path === "/games/uno-tracker/stats" ||
          path === "/games/uno-tracker/history" ||
          path.startsWith("/_next/static/"),
      ),
    ).toBe(true);
    const bobContext = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    const bob = await bobContext.newPage();
    await bob.goto("/admin/login?callbackUrl=/games/uno-tracker");
    const credentials = getSecondCredentials();
    await bob
      .getByPlaceholder("e.g. simply@thebest.co.uk")
      .fill(credentials.email);
    await bob.getByPlaceholder("Enter password").fill(credentials.password);
    await bob.getByRole("button", { name: "Log in", exact: true }).click();
    await bob.waitForURL("**/games/uno-tracker");
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
    const legacyEventIds = (await local(page)).events.map((event) => event.id);
    expect(legacyEventIds).toHaveLength(4);
    // Emulate an existing version-1 record written before local revisions existed.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open("almostyellow-uno", 1);
          open.onsuccess = () => {
            const db = open.result;
            const transaction = db.transaction("data", "readwrite");
            const store = transaction.objectStore("data");
            const read = store.get("current");
            read.onsuccess = () => {
              const value = read.result as Partial<LocalData>;
              delete value.revision;
              store.put(value, "current");
            };
            transaction.oncomplete = () => {
              db.close();
              resolve();
            };
            transaction.onerror = () => {
              db.close();
              reject(new Error("Could not prepare legacy storage"));
            };
          };
        }),
    );
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto("/games/uno-tracker");
    await expect(reopened.getByTestId("score-cam")).toHaveText("2", SYNC);
    expect((await local(reopened)).events.map((event) => event.id)).toEqual(
      legacyEventIds,
    );
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
    await page.route("**/games/uno-tracker", async (route) => {
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
    await openTab(page, "History");
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
    await openTab(page, "Tracker");
    await expect(page.getByTestId("lifetime-cam")).toHaveText("8", SYNC);
    await expect(page.getByTestId("lifetime-laura")).toHaveText("6");
  });

  test("a historic game can be edited and deleted after confirming", async ({
    page,
  }) => {
    await signIn(page);
    await openTab(page, "History");
    await page.getByRole("button", { name: "Add historic game" }).click();
    await page.getByRole("textbox", { name: "Cam’s round wins" }).fill("8");
    await page.getByRole("textbox", { name: "Laura’s round wins" }).fill("6");
    await page.getByLabel("Game date").fill("2020-06-12");
    await page.getByRole("button", { name: "Save historic game" }).click();
    await expect(page.getByText("2020-06-12 · historic game")).toBeVisible();
    await page
      .getByRole("button", { name: "Edit historic game from 2020-06-12" })
      .click();
    await page.getByRole("textbox", { name: "Cam’s round wins" }).fill("9");
    await page.getByLabel("Game date").fill("2020-06-13");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("2020-06-13 · historic game")).toBeVisible();
    await expect(page.getByText("2020-06-12 · historic game")).toBeHidden();
    await openTab(page, "Tracker");
    await expect(page.getByTestId("lifetime-cam")).toHaveText("9", SYNC);
    await openTab(page, "History");
    await page
      .getByRole("button", { name: "Delete historic game from 2020-06-13" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Delete historic game?" });
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("2020-06-13 · historic game")).toBeVisible();
    await page
      .getByRole("button", { name: "Delete historic game from 2020-06-13" })
      .click();
    await dialog.getByRole("button", { name: "Delete game" }).click();
    await expect(page.getByText("2020-06-13 · historic game")).toBeHidden();
    await openTab(page, "Tracker");
    await expect(page.getByTestId("lifetime-cam")).toHaveText("0", SYNC);
  });

  test("going offline and syncing never move the content", async ({
    page,
    context,
  }) => {
    test.slow();
    await signIn(page);
    await start(page);
    await idle(page);
    const layout = () =>
      page.evaluate(() =>
        [
          ...document.querySelectorAll(
            "main h2, main section, main button:not([aria-haspopup])",
          ),
        ].map((el) => {
          const box = el.getBoundingClientRect();
          return [el.tagName, box.x, box.y, box.width, box.height];
        }),
      );
    // The pill may get wider as its text changes, but never taller
    const pillHeight = () =>
      page
        .locator("button[aria-haspopup=dialog]")
        .evaluate((el) => el.getBoundingClientRect().height);
    const pill = await pillHeight();
    const settled = await layout();
    await context.setOffline(true);
    await expect(page.getByRole("status")).toContainText("Offline");
    expect(await layout()).toEqual(settled);
    expect(await pillHeight()).toBe(pill);
    await page.getByRole("button", { name: "Add a round for Cam" }).click();
    await expect(page.getByRole("status")).toContainText("not yet synced");
    expect(await layout()).toEqual(settled);
    expect(await pillHeight()).toBe(pill);
    await context.setOffline(false);
    await idle(page);
    expect(await layout()).toEqual(settled);
    expect(await pillHeight()).toBe(pill);
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
    await page.route("**/games/uno-tracker/session", (route) =>
      route.fulfill({ json: { uid: getSecondCredentials().uid } }),
    );
    await context.setOffline(false);
    await expect(
      page.getByRole("alert", { name: "Scores need attention" }),
    ).toContainText("another account", SYNC);
    expect((await local(page)).events).toHaveLength(1);
    await page.unroute("**/games/uno-tracker/session");
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
    await other.goto("/admin/login?callbackUrl=/games/uno-tracker");
    const credentials = getSecondCredentials();
    await other
      .getByPlaceholder("e.g. simply@thebest.co.uk")
      .fill(credentials.email);
    await other.getByPlaceholder("Enter password").fill(credentials.password);
    await other.getByRole("button", { name: "Log in", exact: true }).click();
    await other.waitForURL("**/games/uno-tracker");
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
    await openTab(page, "History");
    await expect(
      page.getByText("Result amended after offline rounds synced."),
    ).toBeVisible();
    await otherContext.close();
  });

  test("a slow start serialises other tabs and keeps its acknowledged score usable offline", async ({
    page,
    context,
  }) => {
    test.slow();
    await signIn(page);
    const other = await context.newPage();
    await other.goto("/games/uno-tracker");
    await expect(
      other.getByRole("button", { name: "Start new game" }),
    ).toBeEnabled(SYNC);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let captured!: () => void;
    const received = new Promise<void>((resolve) => {
      captured = resolve;
    });
    let armed = true;
    await page.route("**/games/uno-tracker", async (route) => {
      if (
        armed &&
        route.request().method() === "POST" &&
        route.request().postData() === "[]"
      ) {
        armed = false;
        const response = await route.fetch();
        captured();
        await held;
        await route.fulfill({ response });
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Start new game" }).click();
    await received;
    await expect(
      other.getByRole("button", { name: "Add a round for Cam" }),
    ).toHaveCount(0);
    release();
    await expect(
      other.getByRole("button", { name: "Add a round for Cam" }),
    ).toBeEnabled(SYNC);
    await other.getByRole("button", { name: "Add a round for Cam" }).click();
    // Both tabs share one queue, and the status can read "saved" before the
    // click has been queued, so wait for the round to be queued and then for
    // it to reach the server
    await expect(other.getByTestId("score-cam")).toHaveText("1", SYNC);
    await expect
      .poll(async () => (await local(other)).events.length, SYNC)
      .toBe(0);
    await expect(page.getByTestId("score-cam")).toHaveText("1", SYNC);
    await context.setOffline(true);
    await page.getByRole("button", { name: "Add a round for Cam" }).click();
    await expect(page.getByTestId("score-cam")).toHaveText("2");
    expect((await local(page)).events).toHaveLength(1);
    await context.setOffline(false);
    await idle(page);
    await expect(other.getByTestId("score-cam")).toHaveText("2", SYNC);
  });

  test("a delayed finish retains points recorded by another tab during its request", async ({
    page,
    context,
  }) => {
    test.slow();
    await signIn(page);
    await start(page);
    await idle(page);
    const other = await context.newPage();
    await other.goto("/games/uno-tracker");
    await expect(
      other.getByRole("button", { name: "Add a round for Cam" }),
    ).toBeEnabled(SYNC);
    const gameId = (await local(page)).state?.board.activeGameId ?? "";
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let captured!: () => void;
    const received = new Promise<void>((resolve) => {
      captured = resolve;
    });
    await page.route("**/games/uno-tracker", async (route) => {
      if (
        route.request().method() === "POST" &&
        route.request().postData()?.includes(gameId) &&
        route.request().postData()?.includes(",")
      ) {
        const response = await route.fetch();
        captured();
        await held;
        await route.fulfill({ response });
      } else await route.continue();
    });
    await page
      .getByRole("button", { name: "Finish game", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirm finish" }).click();
    await received;
    await other.getByRole("button", { name: "Add a round for Cam" }).click();
    expect((await local(other)).events).toHaveLength(1);
    release();
    await idle(other);
    await expect(page.getByTestId("lifetime-cam")).toHaveText("1", SYNC);
    await expect
      .poll(async () => (await local(page)).events.length, SYNC)
      .toBe(0);
    await expect(
      page.getByRole("button", { name: "Add a round for Cam" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Result amended after offline rounds synced.", {
        exact: true,
      }),
    ).toBeVisible(SYNC);
  });

  test("a delayed historic entry merges once alongside newly queued points", async ({
    page,
    context,
  }) => {
    test.slow();
    await signIn(page);
    await start(page);
    await idle(page);
    const other = await context.newPage();
    await other.goto("/games/uno-tracker");
    await expect(
      other.getByRole("button", { name: "Add a round for Cam" }),
    ).toBeEnabled(SYNC);
    await openTab(page, "History");
    await page.getByRole("button", { name: "Add historic game" }).click();
    await page.getByRole("textbox", { name: "Cam’s round wins" }).fill("5");
    await page.getByRole("textbox", { name: "Laura’s round wins" }).fill("3");
    await page.getByLabel("Game date").fill("2020-06-12");
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let captured!: () => void;
    const received = new Promise<void>((resolve) => {
      captured = resolve;
    });
    await page.route("**/games/uno-tracker/history", async (route) => {
      if (
        route.request().method() === "POST" &&
        route.request().postData()?.includes("playedOn")
      ) {
        const response = await route.fetch();
        captured();
        await held;
        await route.fulfill({ response });
      } else await route.continue();
    });
    await page.getByRole("button", { name: "Save historic game" }).click();
    await received;
    await other.getByRole("button", { name: "Add a round for Cam" }).click();
    expect((await local(other)).events).toHaveLength(1);
    release();
    await expect(page.getByText("2020-06-12 · historic game")).toBeVisible(
      SYNC,
    );
    await idle(other);
    await expect(other.getByTestId("lifetime-cam")).toHaveText("6", SYNC);
    await expect(other.getByTestId("lifetime-laura")).toHaveText("3");
    expect((await local(other)).events).toHaveLength(0);
  });

  for (const firstFails of [false, true]) {
    test(`history responses and errors from a closed game are ignored (${firstFails ? "error" : "success"})`, async ({
      page,
    }) => {
      const { projectId } = assertEmulatorEnvironment();
      const db = getFirestore(getApps()[0] ?? initializeApp({ projectId }));
      const ids = [
        "dbeb9180-6337-4257-8cca-97bf1bb0a151",
        "dbeb9180-6337-4257-8cca-97bf1bb0a152",
      ];
      for (let i = 0; i < 2; i++) {
        const when = Date.parse(
          i === 0 ? "2026-10-31T12:00:00Z" : "2026-10-30T12:00:00Z",
        );
        const player = i === 0 ? "cam" : "laura";
        await db.doc(`unoGames/${ids[i]}`).set({
          id: ids[i],
          cam: i === 0 ? 1 : 0,
          laura: i === 1 ? 1 : 0,
          status: "completed",
          startedAt: when,
          finishedAt: when,
          playedOn: null,
          notes: "",
          source: "live",
          winner: player,
          rounds: 1,
          margin: 1,
          version: 1,
          amended: false,
        });
        await db
          .doc(`unoGames/${ids[i]}/events/dbeb9180-6337-4257-8cca-97bf1bb0a153`)
          .set({ player, delta: 1, createdAt: when, receivedAt: when });
      }
      await db.doc("uno/scoreboard").set({
        cam: 1,
        laura: 1,
        startingTotals: { cam: 0, laura: 0 },
        activeGameId: null,
        lastFinishedGameId: ids[0],
        version: 1,
        updatedAt: Date.now(),
      });
      await page.goto("/games/uno-tracker/history");
      await expect(
        page.getByRole("button", { name: "Scoring history" }),
      ).toHaveCount(2);
      let release!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let captured!: () => void;
      const received = new Promise<void>((resolve) => {
        captured = resolve;
      });
      let releaseSecond!: () => void;
      const heldSecond = new Promise<void>((resolve) => {
        releaseSecond = resolve;
      });
      let capturedSecond!: () => void;
      const receivedSecond = new Promise<void>((resolve) => {
        capturedSecond = resolve;
      });
      await page.route("**/games/uno-tracker/history", async (route) => {
        const body = route.request().postData();
        if (route.request().method() === "POST" && body?.includes(ids[0])) {
          const response = await route.fetch();
          captured();
          await held;
          if (firstFails) await route.abort();
          else await route.fulfill({ response });
        } else if (
          route.request().method() === "POST" &&
          body?.includes(ids[1])
        ) {
          const response = await route.fetch();
          capturedSecond();
          await heldSecond;
          await route.fulfill({ response });
        } else await route.continue();
      });
      await page
        .getByRole("button", { name: "Scoring history" })
        .nth(0)
        .click();
      await received;
      await page.getByRole("button", { name: "Close scoring history" }).click();
      await page
        .getByRole("button", { name: "Scoring history" })
        .nth(1)
        .click();
      release();
      await receivedSecond;
      await expect(page.getByRole("dialog")).toContainText("2026-10-30");
      await expect(page.getByRole("dialog")).toContainText("Loading rounds…");
      await expect(page.getByRole("dialog").locator("li")).toHaveCount(0);
      await expect(page.getByRole("dialog")).not.toContainText(
        "Could not load scoring history",
      );
      releaseSecond();
      await expect(page.getByRole("dialog").locator("li")).toContainText(
        "Laura +1",
      );
    });
  }
});
