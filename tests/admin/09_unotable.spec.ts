import { test, expect, type Page } from "../playwright";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { assertEmulatorEnvironment } from "../firebase/guard";
import { expectNoUnexpectedAxeViolations, schemes, useScheme } from "../axe";
import {
  buildPreview,
  previewScenarios,
  type PreviewScenario,
} from "../unogame-preview";
import { signIn } from "./helpers";

// The table at its awkward sizes and states, in a real room. Cam hosts and
// sits at the table; each scenario is a real engine state written into the
// room with the Admin SDK, so the page, the listeners and the commands are the
// ones players use.

// Round over is the lobby, not the table, and is checked in 09_unoplay
const scenarios = previewScenarios.filter((s) => s.value !== "round-over");

function database() {
  const { projectId } = assertEmulatorEnvironment();
  return getFirestore(getApps()[0] ?? initializeApp({ projectId }));
}

const handLabel = (cards: number) =>
  `Your hand, ${String(cards)} ${cards === 1 ? "card" : "cards"}`;

// Writes a preview table into the room, with Cam in the first seat
async function rig(
  code: string,
  me: { id: string; uid: string },
  scenario: PreviewScenario,
) {
  const db = database();
  const swap = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value).replaceAll("player-0", me.id)) as T;
  const table = buildPreview(scenario);
  const state = swap(table.state);
  const names = swap(table.names);
  const roomRef = db.doc(`gameRooms/${code}`);
  const room = (await roomRef.get()).data() as {
    version: number;
    round: string;
    expiresAt: number;
  };
  await db.doc(`roomPrivate/${code}`).update({
    state,
    seatUids: { [me.id]: me.uid },
  });
  await db.doc(`roomHands/${code}_${me.id}`).set({
    code,
    playerId: me.id,
    uid: me.uid,
    round: room.round,
    expiresAt: room.expiresAt,
    ...swap(table.mine),
  });
  await roomRef.update({
    version: room.version + 1,
    stage: "playing",
    seats: state.players,
    players: state.players.map((id) => ({ id, name: names[id] })),
    names,
    scores: swap(table.scores),
    view: swap(table.view),
    events: [],
  });
  return table.mine.hand.length;
}

async function openTable(
  page: Page,
  scenario: PreviewScenario = "two-players",
) {
  await signIn(page);
  await page.goto("/games/uno");
  await page.getByRole("button", { name: "Create a room" }).click();
  const heading = page.getByRole("heading", { name: /^Room / });
  await expect(heading).toBeVisible();
  const code = (await heading.innerText()).slice(5);
  await page.getByLabel("Your player name").fill("Cam");
  await page.getByRole("button", { name: "Join as a player" }).click();
  await expect(
    page.getByRole("heading", { name: "Waiting to start" }),
  ).toBeVisible();
  const members = await database()
    .collection("roomMembers")
    .where("code", "==", code)
    .get();
  const member = members.docs[0].data() as { playerId: string; uid: string };
  const me = { id: member.playerId, uid: member.uid };
  const show = async (next: PreviewScenario) => {
    const cards = await rig(code, me, next);
    await expect(
      page.getByRole("list", { name: handLabel(cards) }),
    ).toBeVisible();
  };
  await show(scenario);
  return { code, show };
}

// The hand never scrolls, and the top-left corner of every card is the
// frontmost thing at that spot, so no card is covered
async function expectWholeHandShowing(page: Page) {
  const result = await page.evaluate(() => {
    const list = document.querySelector('ul[aria-label^="Your hand"]');
    if (!list) return { error: "no hand" };
    const buttons = [...list.querySelectorAll("button")];
    const bounds = list.getBoundingClientRect();
    const covered: string[] = [];
    let outside = 0;
    for (const button of buttons) {
      // elementFromPoint only sees what is on screen
      button.scrollIntoView({ block: "nearest" });
      const box = button.getBoundingClientRect();
      if (box.left < bounds.left - 1 || box.right > bounds.right + 1) outside++;
      const x = box.left + box.width * 0.1;
      const y = box.top + box.height * 0.1;
      const top = document.elementFromPoint(x, y)?.closest("button");
      if (top !== button) covered.push(button.getAttribute("aria-label") ?? "");
    }
    return {
      scrolls: list.scrollWidth > list.clientWidth,
      outside,
      covered,
      cards: buttons.length,
    };
  });
  expect(result).toMatchObject({ scrolls: false, outside: 0, covered: [] });
}

const overflowOf = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

// Cards overlap in the fan, so tap the corner strip that is always showing
const CORNER = { x: 8, y: 8 };

// Phones held sideways: wide and short
const sidewaysPhones = [
  { name: "iPhone 17", width: 874, height: 402 },
  { name: "Pixel 9", width: 960, height: 448 },
  { name: "small phone", width: 667, height: 320 },
];

// Everything needed to take a turn is on screen without scrolling
async function expectTurnOnScreen(page: Page, label: string) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const height = window.innerHeight;
          const spots = {
            heading: document.querySelector("h2[tabindex]:not([id])"),
            hand: document.querySelector('ul[aria-label^="Your hand"]'),
            drawPile: document.querySelector('button[aria-label^="Draw pile"]'),
            unoButton: [...document.querySelectorAll("button")].find((b) =>
              /^(Say Uno!|Uno said)$/.test(b.textContent),
            ),
          };
          const off = Object.entries(spots)
            .filter(([, el]) => {
              if (!el) return true;
              const box = el.getBoundingClientRect();
              return box.top < 0 || box.bottom > height + 1;
            })
            .map(([name]) => name);
          // Nothing on the top rows sits on top of anything beside it
          const rect = (el: Element | undefined) => el?.getBoundingClientRect();
          const colour = [...document.querySelectorAll("p")].find((p) =>
            p.textContent.startsWith("Colour"),
          );
          const scores = [...document.querySelectorAll("button")].find(
            (b) => b.textContent === "Scores",
          );
          const [a, b] = [rect(colour), rect(scores)];
          const overlaps =
            !!a &&
            !!b &&
            a.left < b.right &&
            b.left < a.right &&
            a.top < b.bottom &&
            b.top < a.bottom;
          return {
            overlaps,
            off,
            sideways:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
            // A few pixels either way, as fonts differ from machine to machine,
            // and the gap under the page makes up the rest
            scrollsBy: Math.max(
              0,
              document.documentElement.scrollHeight - height - 12,
            ),
          };
        }),
      { message: label },
    )
    .toEqual({ overlaps: false, off: [], sideways: 0, scrollsBy: 0 });
}

test.describe("Looking at the Uno table in a real room", () => {
  test.slow();

  test("Can choose a card and then a colour for a wild card", async ({
    page,
  }) => {
    await openTable(page, "large-hand");
    const hand = page.getByRole("list", { name: /^Your hand, \d+ cards$/ });

    await test.step("Given it is my turn", async () => {
      await expect(
        page.getByRole("heading", { level: 2, name: "Your turn" }),
      ).toBeVisible();
    });

    await test.step("When I pick a wild card", async () => {
      const wild = hand
        .getByRole("button", { name: "Wild Draw Four, play" })
        .first();
      await wild.scrollIntoViewIfNeeded();
      await wild.focus();
      await page.keyboard.press("Enter");
    });

    await test.step("Then I am asked for a colour, starting on the first", async () => {
      const picker = page.getByRole("group", {
        name: "Choose a colour for your wild card",
      });
      await expect(picker).toBeVisible();
      await expect(picker.getByRole("button", { name: "Red" })).toBeFocused();
      await expect(
        picker.getByRole("button", { name: "Yellow" }),
      ).toBeVisible();
      await expect(picker.getByRole("button", { name: "Green" })).toBeVisible();
    });

    await test.step("When I choose blue, focus returns to the heading and the play is announced", async () => {
      await page
        .getByRole("group", { name: "Choose a colour for your wild card" })
        .getByRole("button", { name: "Blue" })
        .click();
      await expect(
        page.getByRole("heading", { level: 2, name: /'s turn$|^Your turn$/ }),
      ).toBeFocused();
      await expect(
        page.getByRole("status").filter({ hasText: "You played" }),
      ).toContainText("You played Wild Draw Four, and chose blue.");
    });
  });

  test("Cards that cannot be played say why and ignore clicks", async ({
    page,
  }) => {
    await openTable(page, "two-players");
    const blocked = page
      .getByRole("list", { name: /^Your hand/ })
      .getByRole("button", { name: /does not match the top card$/ })
      .first();
    await expect(blocked).toHaveAttribute("aria-disabled", "true");
    // Playwright waits for aria-disabled buttons to be enabled, so force it
    await blocked.click({ force: true, position: CORNER });
    await expect(
      page.getByRole("status").filter({ hasText: "You played" }),
    ).toHaveCount(0);

    await page
      .getByRole("button", { name: /^Draw pile, \d+ cards, draw/ })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "You drew" }),
    ).toContainText("You drew a card.");
  });

  test("Uno is a button, pressed before the play or right after it", async ({
    page,
  }) => {
    const { show } = await openTable(page, "two-players");
    await expect(
      page.getByRole("button", { name: "Say Uno!" }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      page.getByRole("button", { name: "Say Uno!" }),
    ).toHaveAccessibleDescription(
      "Saying Uno only matters when you play down to one card.",
    );

    await test.step("Given two cards left, when I say Uno before playing", async () => {
      await show("two-cards");
      const say = page.getByRole("button", { name: "Say Uno!" });
      await expect(say).toHaveAttribute("aria-disabled", "false");
      await say.click();
      await expect(
        page.getByRole("button", { name: "Uno said" }),
      ).toHaveAttribute("aria-disabled", "true");
      await page
        .getByRole("list", { name: /^Your hand/ })
        .getByRole("button", { name: /, play$/ })
        .first()
        .click({ position: CORNER });
      const picker = page.getByRole("group", { name: /Choose a colour/ });
      if (await picker.isVisible())
        await picker.getByRole("button", { name: "Red" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "You played" }),
      ).toContainText("You said Uno.");
    });

    await test.step("Given I forgot, when I say Uno right after playing", async () => {
      await show("say-uno");
      await page.getByRole("button", { name: "Say Uno!" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "You said Uno." }),
      ).toHaveCount(1);
    });
  });

  test("Players, piles and turn are named for screen readers", async ({
    page,
  }) => {
    await openTable(page, "catch-uno");
    await expect(
      page.getByRole("listitem", {
        name: "Laura, 1 card, can be caught for Uno",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Catch Laura for Uno" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "caught" }),
    ).toContainText(
      "You caught Laura for Uno. Laura drew 2 cards for not saying Uno.",
    );
  });

  test("A large hand fans out to fit, with every corner showing", async ({
    page,
  }) => {
    const { show } = await openTable(page, "large-hand");
    for (const { value } of scenarios) {
      await show(value);
      expect(
        await overflowOf(page),
        `${value} overflows the page sideways`,
      ).toBeLessThanOrEqual(0);
    }
    await show("large-hand");
    await expect(
      page.getByRole("list", { name: /^Your hand, 5\d cards$/ }),
    ).toBeVisible();
    await expectWholeHandShowing(page);
  });

  test("A phone held sideways keeps the piles, buttons and hand on screen", async ({
    page,
  }) => {
    const { show } = await openTable(page, "two-players");
    for (const { name, width, height } of sidewaysPhones) {
      await page.setViewportSize({ width, height });
      for (const scenario of ["two-players", "catch-uno"] as const) {
        await show(scenario);
        await expectTurnOnScreen(page, `${scenario} on a ${name}`);
        await expectWholeHandShowing(page);
      }
      // A hand of 50 or more cards wraps into rows and can be scrolled to, but
      // still shows every card, as does a full table of ten
      for (const scenario of ["large-hand", "ten-players"] as const) {
        await show(scenario);
        expect(
          await overflowOf(page),
          `${scenario} overflows sideways on a ${name}`,
        ).toBeLessThanOrEqual(0);
        await expectWholeHandShowing(page);
      }
    }
  });

  test("Stays inside a 320 pixel wide screen and at 200% zoom", async ({
    page,
  }) => {
    const { show } = await openTable(page, "long-names");
    for (const width of [320, 640]) {
      await page.setViewportSize({ width, height: 700 });
      for (const { value } of scenarios) {
        await show(value);
        expect(
          await overflowOf(page),
          `${value} overflows at ${String(width)} pixels`,
        ).toBeLessThanOrEqual(0);
        await expectWholeHandShowing(page);
      }
    }
  });
});

for (const scheme of schemes) {
  test.describe(
    `Uno table in a real room, ${scheme} scheme`,
    { tag: "@desktop" },
    () => {
      test.beforeEach(async ({ page }) => {
        await useScheme(page, scheme);
      });

      test("Every layout and state passes accessibility checks", async ({
        page,
      }) => {
        test.setTimeout(240_000);
        const { show } = await openTable(page, "two-players");
        for (const { value, label } of scenarios) {
          await test.step(label, async () => {
            await show(value);
            await expectNoUnexpectedAxeViolations(page);
          });
        }

        await test.step("Colour picker", async () => {
          await show("large-hand");
          await page
            .getByRole("button", { name: "Wild Draw Four, play" })
            .first()
            .click({ position: CORNER });
          await expect(
            page.getByRole("group", {
              name: "Choose a colour for your wild card",
            }),
          ).toBeVisible();
          await expectNoUnexpectedAxeViolations(page);
        });
      });

      test("A phone held sideways passes accessibility checks", async ({
        page,
      }) => {
        const { show } = await openTable(page, "two-players");
        await page.setViewportSize({ width: 874, height: 402 });
        for (const scenario of [
          "two-players",
          "catch-uno",
          "ten-players",
        ] as const) {
          await show(scenario);
          await expectNoUnexpectedAxeViolations(page);
        }
      });

      test("Scores open in a dialog and return focus when closed", async ({
        page,
      }) => {
        await openTable(page, "ten-players");
        const trigger = page.getByRole("button", { name: "Scores" });
        await trigger.click();
        const dialog = page.getByRole("dialog", { name: "Scores" });
        await expect(dialog).toBeVisible();
        await expect(
          dialog.getByRole("table", { name: "Rounds won this session" }),
        ).toBeVisible();
        await expectNoUnexpectedAxeViolations(page);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
      });
    },
  );
}
