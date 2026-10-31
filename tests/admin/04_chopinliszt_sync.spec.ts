import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { getCredentials, getSecondCredentials } from "./helpers";

// How the list behaves for the people using it, each tested below:
//
// - A change on one phone shows on the other without a refresh.
// - Without signal for more than a second, a message says you're offline.
//   Changes still show straight away, and any not saved after a second are
//   marked "Not synced yet". They save once the phone is back online. They
//   are only kept while the list is open, so closing the app before they
//   save loses them. Leaving or reloading the page asks first, but swiping
//   the app away on a phone does not.
// - The list can't be opened without signal, so open it before going into
//   the shop and keep it open. Trying anyway says it needs a connection.
// - If both people change the same item, the change that saves last wins.
//   Someone who was offline usually saves last, as their change only arrives
//   when they reconnect.
// - If one person deletes an item, it stays deleted. A change to it from the
//   other person's phone is dropped, and they see a message saying so.
//
// Alice and Bob each have the list open in their own browser, as on two
// phones. Every test running at the same time shares the one list, so each
// test only adds and changes items with names of its own.

const test = base.extend<{ bobPage: Page }>({
  bobPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:3000/",
    });
    await use(await context.newPage());
    await context.close();
  },
});

// Signs in twice per test, which takes longer than the default allows
test.beforeEach(() => {
  test.slow();
});

// Firestore retries with a growing delay after losing the connection, so
// changes made offline can take a while to arrive
const SYNC = { timeout: 30_000 };

async function openList(
  page: Page,
  { email, password }: { email: string; password: string },
) {
  await page.goto(
    "/admin/login?callbackUrl=http://localhost:3000/admin/chopinliszt",
  );
  await page.getByPlaceholder("e.g. simply@thebest.co.uk").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await Promise.all([
    page.waitForURL("/admin/chopinliszt", { timeout: 15_000 }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);
  // Only shown once the list has loaded
  await expect(
    page.getByRole("button", { name: "Add new item(s)" }),
  ).toBeVisible();
}

async function openBothLists(alice: Page, bob: Page) {
  await Promise.all([
    openList(alice, getCredentials()),
    openList(bob, getSecondCredentials()),
  ]);
}

async function addItems(page: Page, ...texts: string[]) {
  await page.getByRole("button", { name: "Add new item(s)" }).click();
  await page
    .getByPlaceholder("Add new items, one per line...")
    .fill(texts.join("\n"));
  await page.getByRole("button", { name: "Add items and close modal" }).click();
}

// Waits until everything on the page has been saved, so only changes made
// from here on are left waiting
async function goOffline(page: Page) {
  await expect(page.getByText("Not synced yet")).toHaveCount(0);
  await page.context().setOffline(true);
}

function uniqueName(label: string) {
  return `${label} ${randomUUID().slice(0, 8)}`;
}

function item(page: Page, text: string) {
  return page.getByRole("checkbox", { name: text, exact: true });
}

test("Changes on one device show on the other without a refresh", async ({
  page,
  bobPage,
}) => {
  const milk = uniqueName("Milk");
  await openBothLists(page, bobPage);

  await addItems(page, milk);
  await expect(item(bobPage, milk)).toBeVisible();

  await item(bobPage, milk).click();
  await expect(item(page, milk)).toBeChecked();

  await page.getByRole("button", { name: `Delete ${milk}` }).click();
  await expect(item(bobPage, milk)).toBeHidden();
});

test("Ctrl+Enter in the add dialog adds the items and closes it", async ({
  page,
}) => {
  const flour = uniqueName("Flour");
  await openList(page, getCredentials());

  await page.getByRole("button", { name: "Add new item(s)" }).click();
  await page.getByPlaceholder("Add new items, one per line...").fill(flour);
  await page.keyboard.press("Control+Enter");

  await expect(item(page, flour)).toBeVisible();
  await expect(
    page.getByPlaceholder("Add new items, one per line..."),
  ).toBeHidden();
});

test("Both people can change different items at the same time", async ({
  page,
  bobPage,
}) => {
  const apples = uniqueName("Apples");
  const pears = uniqueName("Pears");
  await openBothLists(page, bobPage);
  await addItems(page, apples, pears);
  await expect(item(bobPage, pears)).toBeVisible();

  await Promise.all([item(page, apples).click(), item(bobPage, pears).click()]);

  for (const list of [page, bobPage]) {
    await expect(item(list, apples)).toBeChecked();
    await expect(item(list, pears)).toBeChecked();
  }
});

test("Changes made offline sync after reconnecting", async ({
  page,
  bobPage,
}) => {
  const bread = uniqueName("Bread");
  const eggs = uniqueName("Eggs");
  const jam = uniqueName("Jam");
  await openBothLists(page, bobPage);
  await addItems(page, bread, eggs);
  await expect(item(bobPage, eggs)).toBeVisible();

  await goOffline(page);
  await expect(page.getByText("You're offline")).toBeVisible();
  await item(page, bread).click();
  await addItems(page, jam);
  // Shown straight away, but marked as waiting
  await expect(item(page, bread)).toBeChecked();
  await expect(item(page, jam)).toBeVisible();
  await expect(page.getByText("Not synced yet")).toHaveCount(2);

  // Bob carries on while Alice is offline
  await item(bobPage, eggs).click();
  await expect(item(bobPage, eggs)).toBeChecked();
  await expect(item(bobPage, bread)).not.toBeChecked();

  await page.context().setOffline(false);
  await expect(item(bobPage, jam)).toBeVisible(SYNC);
  await expect(item(bobPage, bread)).toBeChecked();
  await expect(item(page, eggs)).toBeChecked(SYNC);
  await expect(page.getByText("Not synced yet")).toHaveCount(0);
  await expect(page.getByText("You're offline")).toBeHidden();
});

test("Leaving with changes not yet saved asks first", async ({ page }) => {
  const rice = uniqueName("Rice");
  await openList(page, getCredentials());
  await addItems(page, rice);

  await goOffline(page);
  await item(page, rice).click();
  await expect(page.getByText("Not synced yet")).toHaveCount(1);

  const dialog = page.waitForEvent("dialog");
  void page.close({ runBeforeUnload: true });
  expect((await dialog).type()).toBe("beforeunload");
  await (await dialog).dismiss();
  await expect(item(page, rice)).toBeChecked();
});

test("Opening the list without signal says it needs a connection", async ({
  page,
}) => {
  // The page loads, then the signal drops before it can fetch the list
  const listPage = (url: URL) => url.pathname === "/admin/chopinliszt";
  await page.route(listPage, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await page.context().setOffline(true);
    await route.abort("internetdisconnected");
  });
  await page.goto(
    "/admin/login?callbackUrl=http://localhost:3000/admin/chopinliszt",
  );
  const { email, password } = getCredentials();
  await page.getByPlaceholder("e.g. simply@thebest.co.uk").fill(email);
  await page.getByPlaceholder("Enter password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(
    page.getByText("The list needs a connection to open"),
  ).toBeVisible();
});

test("An item deleted on another device stays deleted", async ({
  page,
  bobPage,
}) => {
  const soap = uniqueName("Soap");
  await openBothLists(page, bobPage);
  await addItems(page, soap);
  await expect(item(bobPage, soap)).toBeVisible();

  await goOffline(page);
  await item(page, soap).click();
  await expect(item(page, soap)).toBeChecked();

  await bobPage.getByRole("button", { name: `Delete ${soap}` }).click();
  await expect(item(bobPage, soap)).toBeHidden();

  // Alice's change is refused rather than bringing the item back
  await page.context().setOffline(false);
  await expect(item(page, soap)).toBeHidden(SYNC);
  await expect(page.getByText("A change could not be saved")).toBeVisible(SYNC);
  await expect(item(bobPage, soap)).toBeHidden();
});

test("When both change the same item, the change saved last wins", async ({
  page,
  bobPage,
}) => {
  const tea = uniqueName("Tea");
  await openBothLists(page, bobPage);
  await addItems(page, tea);
  await expect(item(bobPage, tea)).toBeVisible();

  // Alice ticks it offline, then Bob ticks and unticks it online
  await goOffline(page);
  await item(page, tea).click();
  await item(bobPage, tea).click();
  await expect(item(bobPage, tea)).toBeChecked();
  await item(bobPage, tea).click();
  await expect(item(bobPage, tea)).not.toBeChecked();
  // Bob's changes have reached Firestore, and Alice's is still waiting
  await expect(bobPage.getByText("Not synced yet")).toHaveCount(0);
  await expect(page.getByText("Not synced yet")).toHaveCount(1);

  // Alice's change reaches Firestore last, so both end up ticked
  await page.context().setOffline(false);
  await expect(item(bobPage, tea)).toBeChecked(SYNC);
  await expect(item(page, tea)).toBeChecked();
  await expect(page.getByText("Not synced yet")).toHaveCount(0);
});
