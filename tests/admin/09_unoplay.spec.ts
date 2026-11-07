import {
  test as base,
  expect,
  waitsForHydration,
  type Page,
} from "../playwright";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { assertEmulatorEnvironment } from "../firebase/guard";
import { expectNoUnexpectedAxeViolations, schemes, useScheme } from "../axe";
import { mockConfetti } from "../confetti";
import { signIn } from "./helpers";
import type { RoundState } from "../../src/unogame/engine/round";
import { canPlayOn, type Card } from "../../src/unogame/engine/cards";

// Cam hosts and plays on the page under test, and Laura joins from a second
// browser, as on two phones. The cards are dealt at random, so the test only
// draws, then leaves one player on a last matching card to finish the round.
// A won round plays confetti, so every page uses the stand-in for its script
// and never reaches the real site
const test = base.extend<{ guestPage: Page; thirdPage: Page }>({
  page: async ({ page }, use) => {
    await mockConfetti(page);
    await use(page);
  },
  guestPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:3000/",
    });
    const page = waitsForHydration(await context.newPage());
    await mockConfetti(page);
    await use(page);
    await context.close();
  },
  thirdPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:3000/",
    });
    const page = waitsForHydration(await context.newPage());
    await mockConfetti(page);
    await use(page);
    await context.close();
  },
});

// Corners of overlapping cards are the parts that always show
const CORNER = { x: 8, y: 8 };

function database() {
  const { projectId } = assertEmulatorEnvironment();
  return getFirestore(getApps()[0] ?? initializeApp({ projectId }));
}

// Leaves whoever is to play on one number card that matches the colour in
// play, in the server's record and in their published hand
async function leaveOnLastCard(code: string) {
  const db = database();
  const ref = db.doc(`roomPrivate/${code}`);
  const state = (await ref.get()).get("state") as RoundState;
  const playerId = state.players[state.current];
  const index = state.stock.findIndex((card) => card.kind === "number");
  const [last] = state.stock.splice(index, 1);
  if (last.kind !== "number") throw new Error("Needs a number card.");
  state.hands[playerId] = [last];
  state.colour = last.colour;
  state.drawnCardId = null;
  await ref.update({ state });
  await db
    .doc(`roomHands/${code}_${playerId}`)
    .update({ hand: [last], playableIds: [last.id], drawnCardId: null });
}

// Swaps every card the player to move could play for one they could not, in
// the server's record and in their published hand, so drawing is their move
async function leaveWithNoPlay(code: string) {
  const db = database();
  const ref = db.doc(`roomPrivate/${code}`);
  const state = (await ref.get()).get("state") as RoundState;
  const playerId = state.players[state.current];
  const top = state.discard[state.discard.length - 1];
  const dead = (card: Card) => !canPlayOn(card, top, state.colour);
  state.hands[playerId] = state.hands[playerId].map((card) => {
    if (dead(card)) return card;
    const [swap] = state.stock.splice(state.stock.findIndex(dead), 1, card);
    return swap;
  });
  await ref.update({ state });
  await db
    .doc(`roomHands/${code}_${playerId}`)
    .update({ hand: state.hands[playerId], playableIds: [] });
}

async function whoseTurn(pages: Page[]) {
  let found: Page | undefined;
  await expect
    .poll(async () => {
      for (const page of pages) {
        if (
          await page
            .getByRole("heading", { level: 2, name: "Your turn" })
            .isVisible()
        ) {
          found = page;
          return true;
        }
      }
      return false;
    })
    .toBe(true);
  if (!found) throw new Error("Nobody has the turn.");
  return found;
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function playRound(
  page: Page,
  guest: Page,
  checkAccessibility?: (view: Page) => Promise<void>,
) {
  let code = "";

  await test.step("Given a host has made a room", async () => {
    await signIn(page);
    await page.goto("/games/uno");
    await page.getByRole("button", { name: "Create a room" }).click();
    const heading = page.getByRole("button", { name: /^Room \w{4}, options$/ });
    await expect(heading).toBeVisible();
    code = (await heading.innerText()).slice(5);
    expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    await checkAccessibility?.(page);
    await page.getByLabel("Your player name").fill("Cam");
    await page.getByRole("button", { name: "Join as a player" }).click();
    await expect(
      page.getByRole("heading", { name: "Waiting to start" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start the round" }),
    ).toBeDisabled();
  });

  await test.step("When a guest joins from the link", async () => {
    await guest.goto(`/games/uno?room=${code}`);
    await expect(
      guest.getByRole("heading", { name: `Join room ${code}` }),
    ).toBeVisible();
    await checkAccessibility?.(guest);
    await guest.getByLabel("Your name", { exact: true }).fill("Laura");
    await guest.getByRole("button", { name: "Join room" }).click();
    await expect(
      guest.getByRole("heading", { name: "Waiting to start" }),
    ).toBeVisible();
    await expect(
      guest.getByText("Waiting for the host to start the round."),
    ).toBeVisible();
  });

  await test.step("Then the host sees both players and can start", async () => {
    const players = page.getByRole("list", { name: "Players" });
    await expect(players.getByRole("listitem")).toHaveCount(2);
    await expect(players).toContainText("Laura");
    await expect(
      page.getByRole("button", { name: `Room ${code}, options` }),
    ).toHaveText(`Room ${code}`);
    await checkAccessibility?.(page);
    await page.getByRole("button", { name: "Start the round" }).click();
  });

  await test.step("And each player gets seven cards", async () => {
    for (const view of [page, guest])
      await expect(
        view.getByRole("list", { name: "Your hand, 7 cards" }),
      ).toBeVisible();
    await expectNoSidewaysScroll(page);
    await checkAccessibility?.(page);
  });

  await test.step("When the player to move draws, the other hears about it", async () => {
    // Drawing is only allowed with nothing to play, which the deal cannot promise
    await leaveWithNoPlay(code);
    const actor = await whoseTurn([page, guest]);
    const other = actor === page ? guest : page;
    const name = actor === page ? "Cam" : "Laura";
    // The server is slow to answer, so the move shows as being sent
    await actor.route("**/api/uno", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });
    await actor
      .getByRole("button", { name: /^Draw pile, \d+ cards, draw a card/ })
      .click();
    const sending = actor.getByRole("status").filter({ hasText: /sending/ });
    await expect(sending).toHaveText("Sending…");
    await expect(actor.getByRole("list", { name: /^Your hand/ })).toHaveCSS(
      "opacity",
      "0.55",
    );
    await expect(sending).toHaveText("Still sending…");
    await checkAccessibility?.(actor);
    await expect(sending).toHaveCount(0, { timeout: 10_000 });
    await actor.unroute("**/api/uno");
    await expect(
      other.getByRole("status").filter({ hasText: `${name} drew a card` }),
    ).toHaveCount(1);
    await expect(
      actor.getByRole("list", { name: "Your hand, 8 cards" }),
    ).toBeVisible();
    // A drawn card that can be played is played or kept; otherwise the turn
    // has already passed
    const keep = actor.getByRole("button", { name: "Keep the card I drew" });
    const passed = actor.getByRole("heading", { level: 2, name: /'s turn$/ });
    await expect(keep.or(passed)).toBeVisible();
    if (await keep.isVisible()) await keep.click();
    await expect(passed).toBeVisible();
    await expect(
      other.getByRole("heading", { level: 2, name: "Your turn" }),
    ).toBeVisible();
  });

  await test.step("And the other player plays their last card", async () => {
    await leaveOnLastCard(code);
    const winner = await whoseTurn([page, guest]);
    const loser = winner === page ? guest : page;
    const hand = winner.getByRole("list", { name: "Your hand, 1 card" });
    await expect(hand).toBeVisible();
    await hand.getByRole("button", { name: /, play$/ }).click({
      position: CORNER,
    });
    const names = winner === page ? ["Cam", "Laura"] : ["Laura", "Cam"];
    // The winner is shown on a card, not in a modal
    await expect(
      winner.getByRole("status").filter({ hasText: "won the round!" }),
    ).toContainText("You");
    await expect(
      loser.getByRole("status").filter({ hasText: "won the round!" }),
    ).toContainText(names[0]);
  });

  await test.step("Then the round is over and the host can play again", async () => {
    await expect(
      page.getByRole("heading", { name: "Round over" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Play again" }),
    ).toBeEnabled();
    await expect(
      guest.getByText("Waiting for the host to start the round."),
    ).toBeVisible();
    await expectNoSidewaysScroll(page);
    await checkAccessibility?.(page);
    await page.getByRole("button", { name: /^Room \w{4}, options$/ }).click();
    await page.getByRole("menuitem", { name: "End room" }).click();
    await page
      .getByRole("dialog", { name: "End this room?" })
      .getByRole("button", { name: "End room" })
      .click();
    await expect(guest.getByText("This room has ended.")).toBeVisible();
  });
}

test.describe("Playing Uno online", { tag: "@no-android" }, () => {
  test("A player can leave mid-round, and the host can end the round and play again", async ({
    page,
    guestPage,
    thirdPage,
  }, testInfo) => {
    test.slow();
    let code = "";

    await test.step("Given three players have started a round", async () => {
      await signIn(page);
      await page.goto("/games/uno");
      await page.getByRole("button", { name: "Create a room" }).click();
      const heading = page.getByRole("button", {
        name: /^Room \w{4}, options$/,
      });
      await expect(heading).toBeVisible();
      code = (await heading.innerText()).slice(5);
      await page.getByLabel("Your player name").fill("Cam");
      await page.getByRole("button", { name: "Join as a player" }).click();
      for (const [view, name] of [
        [guestPage, "Laura"],
        [thirdPage, "Sam"],
      ] as const) {
        await view.goto(`/games/uno?room=${code}`);
        await view.getByLabel("Your name", { exact: true }).fill(name);
        await view.getByRole("button", { name: "Join room" }).click();
        await expect(
          view.getByRole("heading", { name: "Waiting to start" }),
        ).toBeVisible();
      }
      await expect(
        page.getByRole("list", { name: "Players" }).getByRole("listitem"),
      ).toHaveCount(3);
      await page.getByRole("button", { name: "Start the round" }).click();
      for (const view of [page, guestPage, thirdPage])
        await expect(
          view.getByRole("list", { name: "Your hand, 7 cards" }),
        ).toBeVisible();
    });

    await test.step("When one player leaves, after confirming", async () => {
      await thirdPage
        .getByRole("button", { name: /^Room \w{4}, options$/ })
        .click();
      await thirdPage.getByRole("menuitem", { name: "Leave game" }).click();
      const dialog = thirdPage.getByRole("dialog", {
        name: "Leave this round?",
      });
      await expect(dialog).toBeVisible();
      await expect(thirdPage.getByRole("menu")).toHaveCount(0);
      await expect(dialog).toHaveCSS("opacity", "1");
      if (testInfo.project.name === "Google Chrome")
        await expectNoUnexpectedAxeViolations(thirdPage);
      await dialog.getByRole("button", { name: "Leave game" }).click();
      await expect(thirdPage).toHaveURL(/\/games$/);
    });

    await test.step("Then the others hear and carry on with two players", async () => {
      for (const view of [page, guestPage])
        await expect(
          view.getByRole("status").filter({ hasText: "Sam left the game" }),
        ).toHaveCount(1);
      await expect(
        page.getByRole("list", { name: "Your hand, 7 cards" }),
      ).toBeVisible();
      await expectNoSidewaysScroll(page);
    });

    await test.step("When the host ends the round", async () => {
      await page.getByRole("button", { name: /^Room \w{4}, options$/ }).click();
      await page.getByRole("menuitem", { name: "Leave game" }).click();
      const warning = page.getByRole("dialog", { name: "Leave this round?" });
      await expect(warning).toContainText("You host this room");
      await page.keyboard.press("Escape");
      await expect(warning).toBeHidden();
      await page.getByRole("button", { name: /^Room \w{4}, options$/ }).click();
      await page.getByRole("menuitem", { name: "End round" }).click();
      const dialog = page.getByRole("dialog", { name: "End this round?" });
      await expect(dialog).toBeVisible();
      // Axe reads the colours as they are drawn, so let the menu finish
      // closing and the dialog finish fading in first
      await expect(page.getByRole("menu")).toHaveCount(0);
      await expect(dialog).toHaveCSS("opacity", "1");
      if (testInfo.project.name === "Google Chrome")
        await expectNoUnexpectedAxeViolations(page);
      await dialog.getByRole("button", { name: "End round" }).click();
    });

    await test.step("Then everyone is back at the lobby and the host can play again", async () => {
      for (const view of [page, guestPage]) {
        await expect(
          view.getByRole("heading", { name: "Round over" }),
        ).toBeVisible();
        await expect(view.getByText("The host ended the round.")).toBeVisible();
      }
      await expect(
        page.getByRole("list", { name: "Players" }).getByRole("listitem"),
      ).toHaveCount(2);
      await page.getByRole("button", { name: "Play again" }).click();
      for (const view of [page, guestPage]) {
        await expect(
          view.getByRole("list", { name: "Your hand, 7 cards" }),
        ).toBeVisible();
        // Screen readers hear about every new deal, not only the first
        await expect(
          view
            .getByRole("status")
            .filter({ hasText: "The round has started." }),
        ).toBeVisible();
      }
    });
  });

  test("Two players play a round from the lobby to a win", async ({
    page,
    guestPage,
  }) => {
    test.slow();
    await playRound(page, guestPage);
  });

  test("A reload keeps the guest's seat", async ({ page, guestPage }) => {
    test.slow();
    await signIn(page);
    await page.goto("/games/uno");
    await page.getByRole("button", { name: "Create a room" }).click();
    const heading = page.getByRole("button", { name: /^Room \w{4}, options$/ });
    await expect(heading).toBeVisible();
    const code = (await heading.innerText()).slice(5);
    await guestPage.goto(`/games/uno?room=${code}`);
    await guestPage.getByLabel("Your name", { exact: true }).fill("Laura");
    await guestPage.getByRole("button", { name: "Join room" }).click();
    await expect(
      guestPage.getByRole("heading", { name: "Waiting to start" }),
    ).toBeVisible();
    await guestPage.reload();
    await expect(
      guestPage.getByRole("button", { name: `Room ${code}, options` }),
    ).toBeVisible();
    await expect(
      guestPage.getByRole("heading", { name: "Waiting to start" }),
    ).toBeVisible();
    await expect(guestPage.getByLabel("Your name")).toHaveCount(0);
  });
});

for (const scheme of schemes) {
  test.describe(
    `Uno online, ${scheme} scheme`,
    { tag: ["@desktop", "@no-android"] },
    () => {
      test("Every stage of a round passes accessibility checks", async ({
        page,
        guestPage,
      }) => {
        test.setTimeout(180_000);
        await useScheme(page, scheme);
        await useScheme(guestPage, scheme);
        await playRound(page, guestPage, async (view) => {
          await expectNoUnexpectedAxeViolations(view);
        });
      });
    },
  );
}
