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
  const heading = page.getByRole("button", { name: /^Room \w{4}, options$/ });
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
  // Polled, as the fan settles a moment after a resize
  const measure = () =>
    page.evaluate(() => {
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
        if (box.left < bounds.left - 1 || box.right > bounds.right + 1)
          outside++;
        const x = box.left + box.width * 0.1;
        const y = box.top + box.height * 0.1;
        const top = document.elementFromPoint(x, y)?.closest("button");
        if (top !== button)
          covered.push(button.getAttribute("aria-label") ?? "");
      }
      return {
        scrolls: list.scrollWidth > list.clientWidth,
        outside,
        covered,
        cards: buttons.length,
      };
    });
  await expect
    .poll(measure)
    .toMatchObject({ scrolls: false, outside: 0, covered: [] });
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
  try {
    await expectTurnOnScreenOnce(page, label);
  } catch (error) {
    // Where everything is, so a failure on another machine can be read
    const layout = await page.evaluate(() => ({
      font: getComputedStyle(document.body).fontFamily,
      page: [innerWidth, innerHeight, document.documentElement.scrollHeight],
      boxes: [...document.querySelectorAll("h1, h2, p, button, ul")]
        .slice(0, 30)
        .map((e) => {
          const b = e.getBoundingClientRect();
          return `${e.tagName} ${(e.getAttribute("aria-label") ?? e.textContent).slice(0, 18)} ${String(Math.round(b.left))},${String(Math.round(b.top))},${String(Math.round(b.right))},${String(Math.round(b.bottom))}`;
        }),
    }));
    throw new Error(
      `${(error as Error).message}
LAYOUT ${JSON.stringify(layout)}`,
      { cause: error },
    );
  }
}

async function expectTurnOnScreenOnce(page: Page, label: string) {
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
          // Nothing sits on top of anything beside it
          const button = (name: string) =>
            [...document.querySelectorAll("button")].find(
              (b) => b.textContent === name,
            );
          const named: Record<string, Element | undefined> = {
            colour: [...document.querySelectorAll("p")].find((p) =>
              p.textContent.startsWith("Colour"),
            ),
            scores: button("Scores"),
            room: [...document.querySelectorAll("button")].find((b) =>
              b.textContent.startsWith("Room"),
            ),
            catchUno: [...document.querySelectorAll("button")].find((b) =>
              b.textContent.startsWith("Call out"),
            ),
            sayUno: spots.unoButton,
            drawPile: spots.drawPile ?? undefined,
            hand: spots.hand ?? undefined,
          };
          const boxes = Object.entries(named).flatMap(([name, el]) =>
            el ? [[name, el.getBoundingClientRect()] as const] : [],
          );
          const overlaps = boxes.flatMap(([nameA, a], i) =>
            boxes
              .slice(i + 1)
              .filter(
                ([, b]) =>
                  a.left < b.right &&
                  b.left < a.right &&
                  a.top < b.bottom &&
                  b.top < a.bottom,
              )
              .map(([nameB]) => `${nameA} and ${nameB}`),
          );
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
    .toEqual({ overlaps: [], off: [], sideways: 0, scrollsBy: 0 });
}

// Reads the hand from its accessible names, in the order it is shown, and
// checks it runs red, yellow, green, blue, wilds, with numbers before actions
async function expectHandSorted(page: Page) {
  const labels = await page
    .getByRole("list", { name: /^Your hand/ })
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((b) => b.getAttribute("aria-label") ?? ""),
    );
  const colours = ["Red", "Yellow", "Green", "Blue", "Wild"];
  const actions = ["Skip", "Reverse", "Draw Two", "Draw Four"];
  const keys = labels.map((label) => {
    const [first, ...rest] = label.split(",")[0].split(" ");
    const colour = colours.indexOf(first);
    const what = rest.join(" ");
    return [
      colour,
      /^\d$/.test(what) ? Number(what) : 10 + actions.indexOf(what),
    ];
  });
  expect(keys.length).toBeGreaterThan(0);
  keys.forEach((key, index) => {
    expect(key[0], labels[index]).toBeGreaterThanOrEqual(0);
    if (index === 0) return;
    const before = keys[index - 1];
    expect(
      before[0] < key[0] || (before[0] === key[0] && before[1] <= key[1]),
      `${labels[index - 1]} should come before ${labels[index]}`,
    ).toBe(true);
  });
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

  test("Your hand is sorted by colour and number, and a drawn card slots in", async ({
    page,
  }) => {
    const { show } = await openTable(page, "large-hand");
    await expectHandSorted(page);

    await show("two-players");
    await expectHandSorted(page);
    await page
      .getByRole("button", { name: /^Draw pile, \d+ cards, draw/ })
      .click();
    await expect(
      page.getByRole("list", { name: "Your hand, 8 cards" }),
    ).toBeVisible();
    await expectHandSorted(page);
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
    await page
      .getByRole("button", { name: "Call out Laura for not saying Uno" })
      .click();
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
      await expect
        .poll(() => overflowOf(page), {
          message: `${value} overflows the page sideways`,
        })
        .toBeLessThanOrEqual(0);
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
        await expect
          .poll(() => overflowOf(page), {
            message: `${scenario} overflows sideways on a ${name}`,
          })
          .toBeLessThanOrEqual(0);
        await expectWholeHandShowing(page);
      }
    }
  });

  test("The host's room buttons are in one menu while the table shows", async ({
    page,
  }) => {
    await openTable(page, "two-players");
    const menu = page.getByRole("button", { name: /^Room \w{4}, options$/ });
    await test.step("Given the table, the room buttons are folded into a menu", async () => {
      await expect(menu).toBeVisible();
      await expect(page.getByRole("button", { name: "End room" })).toHaveCount(
        0,
      );
      // From the keyboard: a click does not focus a button in Safari, so there
      // would be nothing for focus to return to
      await menu.focus();
      await page.keyboard.press("Enter");
      for (const name of [
        "Copy join link",
        "End round",
        "End room",
        "Leave game",
      ])
        await expect(page.getByRole("menuitem", { name })).toBeVisible();
    });

    await test.step("When I close it, or the dialog it opens, focus comes back to it", async () => {
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
      // From the keyboard: a click does not focus a button in Safari, so there
      // would be nothing for focus to return to
      await menu.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("menuitem", { name: "Leave game" }).click();
      const dialog = page.getByRole("dialog", { name: "Leave this round?" });
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(menu).toBeFocused();
    });

    await test.step("Then it is the same on a phone held sideways", async () => {
      await page.setViewportSize({ width: 874, height: 402 });
      await expect(menu).toBeVisible();
      await expect(page.getByRole("button", { name: "End room" })).toHaveCount(
        0,
      );
    });
  });

  test("The colour in play, your turn and Uno are easy to see", async ({
    page,
  }) => {
    const { show } = await openTable(page, "two-players");
    const hand = page.getByRole("list", { name: /^Your hand/ });
    await expect(hand).toHaveAttribute("data-myturn", "");
    await expect(
      page.locator("[data-colour][class*='pileSwatch']"),
    ).toHaveAttribute("data-colour", /^(red|yellow|green|blue)$/);

    const say = page.getByRole("button", { name: "Say Uno!" });
    await expect(say).not.toHaveAttribute("data-ready");
    await show("two-cards");
    await expect(say).toHaveAttribute("data-ready", "");
    await say.click();
    await expect(
      page.getByRole("button", { name: "Uno said" }),
    ).not.toHaveAttribute("data-ready");
  });

  test("Stays inside a 320 pixel wide screen and at 200% zoom", async ({
    page,
  }) => {
    const { show } = await openTable(page, "long-names");
    for (const width of [320, 640]) {
      await page.setViewportSize({ width, height: 700 });
      for (const { value } of scenarios) {
        await show(value);
        await expect
          .poll(() => overflowOf(page), {
            message: `${value} overflows at ${String(width)} pixels`,
          })
          .toBeLessThanOrEqual(0);
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
