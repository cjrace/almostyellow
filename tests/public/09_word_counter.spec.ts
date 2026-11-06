import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../playwright";

const example = "My mother-in-law 👩‍💻";
const whole = (page: Page) =>
  page.getByRole("region", { name: "Whole text", exact: true });
const selected = (page: Page) =>
  page.getByRole("region", { name: "Selected text", exact: true });

// On phones the selected counts appear in brackets inside the whole-text box,
// so the whole-text numbers may be followed by them.
const withSelection = (count: string) =>
  new RegExp(`^${count}( \\(selected \\d+\\))?$`);

async function expectCounts(
  region: Locator,
  words: string,
  characters: string,
) {
  await expect(region.locator("dd")).toHaveText([
    withSelection(words),
    withSelection(characters),
  ]);
}

// Desktop has a box for the selected text; phones show it in brackets after
// the whole-text counts, and only while something is highlighted.
async function expectSelected(page: Page, words: string, characters: string) {
  const box = selected(page);
  if (await box.isVisible()) {
    await expect(box.locator("dd")).toHaveText([words, characters]);
    return;
  }
  const counts = whole(page).locator("dd");
  if (words === "—") {
    await expect(counts).toHaveText([/^\d+$/, /^\d+$/]);
    return;
  }
  await expect(counts).toHaveText([
    new RegExp(`\\(selected ${words}\\)$`),
    new RegExp(`\\(selected ${characters}\\)$`),
  ]);
}

async function selectRange(page: Page, start: number, end: number) {
  await page.getByLabel("Your text").evaluate(
    (input: HTMLTextAreaElement, range) => {
      input.focus();
      input.setSelectionRange(range.start, range.end);
      input.dispatchEvent(new Event("select", { bubbles: true }));
    },
    { start, end },
  );
}

test.describe("A visitor on the word counter", () => {
  test("can reach the tool from the homepage and return to the catalogue", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Tools", exact: true }).click();
    await expect(page).toHaveURL("/tools");
    await page.getByRole("link", { name: "Open word counter" }).click();
    await expect(page).toHaveURL("/tools/word-counter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Word & character counter",
    );
    await expectCounts(whole(page), "0", "0");
    await expectSelected(page, "—", "—");
    await expect(page.getByLabel("Your text")).toHaveAttribute(
      "spellcheck",
      "false",
    );
    await expect(page.getByLabel("Your text")).not.toHaveAttribute("maxlength");
    await page.getByRole("link", { name: "Back to our tools list" }).click();
    await expect(page).toHaveURL("/tools");
  });

  test("can compare methods and keep a highlighted emoji while using the controls", async ({
    page,
    isMobile,
  }) => {
    const editor = page.getByLabel("Your text");
    const method = page.getByLabel("Counting method", { exact: true });
    await test.step("Given text with a highlighted emoji", async () => {
      await page.goto("/tools/word-counter");
      await editor.fill(example);
      await expectCounts(whole(page), "4", "18");
      await selectRange(page, 17, 22);
      await expectSelected(page, "0", "1");
    });
    await test.step("When they compare methods and read the explanation, the selection remains", async () => {
      await method.focus();
      await method.selectOption("whitespace");
      await expectCounts(whole(page), "3", "18");
      await expectSelected(page, "1", "1");
      await method.selectOption("legacy");
      await expectCounts(whole(page), "3", "22");
      await expectSelected(page, "1", "5");
      const info = page.getByRole("button", { name: "About counting methods" });
      if (isMobile) await info.tap();
      else await info.click();
      await expect(
        page.getByRole("dialog", { name: "How counting works" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expectSelected(page, "1", "5");
      await expect(editor).toHaveValue(example);
      await expect(editor).toHaveJSProperty("selectionStart", 17);
      await expect(editor).toHaveJSProperty("selectionEnd", 22);
    });
    await test.step("Then collapsing, editing or clearing removes the selection counts", async () => {
      await selectRange(page, 2, 2);
      await expectSelected(page, "—", "—");
      await selectRange(page, 0, 2);
      await editor.press("Backspace");
      await expectSelected(page, "—", "—");
      await page.getByRole("button", { name: "Clear text" }).click();
      await expect(editor).toBeFocused();
      await expect(editor).toHaveValue("");
      await expectCounts(whole(page), "0", "0");
    });
  });

  test("can select using the keyboard and count multiple lines", async ({
    page,
  }) => {
    await page.goto("/tools/word-counter");
    const editor = page.getByLabel("Your text");
    await editor.fill("Hello\nworld 👩‍💻");
    await editor.press("ControlOrMeta+a");
    await expectSelected(page, "2", "13");
    await expectCounts(whole(page), "2", "13");
    await editor.press("ArrowLeft");
    await expectSelected(page, "—", "—");
    await editor.press("ControlOrMeta+Home");
    await editor.press("Shift+ArrowRight");
    await expectSelected(page, "1", "1");
    await editor.press("ControlOrMeta+a");
    await editor.press("Backspace");
    await editor.pressSequentially("Hello");
    await expectCounts(whole(page), "1", "5");
    await expect(page.getByRole("status")).toContainText(
      "Whole text: 1 word, 5 characters.",
    );
  });

  test("can read the worked example and close its keyboard-accessible modal", async ({
    page,
  }) => {
    await page.goto("/tools/word-counter");
    const info = page.getByRole("button", { name: "About counting methods" });
    await info.focus();
    await info.press("Enter");
    const dialog = page.getByRole("dialog", { name: "How counting works" });
    await expect(dialog).toBeVisible();
    for (const [method, words, characters] of [
      ["Unicode-aware", "4", "18"],
      ["Whitespace-separated", "3", "18"],
      ["Legacy string counting", "3", "22"],
    ]) {
      await expect(
        dialog.getByRole("row", { name: `${method} ${words} ${characters}` }),
      ).toBeVisible();
    }
    await expect(dialog.getByRole("link")).toHaveAttribute(
      "href",
      "https://github.com/alphagov/govuk-frontend/releases/tag/v6.6.0",
    );
    for (let index = 0; index < 4; index++) {
      await page.keyboard.press("Tab");
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(info).toBeFocused();
    await info.click();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
  });

  test("sees a clear choice when Unicode segmentation is unavailable", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(Intl, "Segmenter", { value: undefined });
    });
    await page.goto("/tools/word-counter");
    await expect(
      page.getByRole("alert", {
        name: "Your browser does not support Unicode segmentation",
      }),
    ).toContainText("Your browser does not support Unicode segmentation");
    await expect(page.locator('option[value="unicode"]')).toBeDisabled();
    await expect(page.locator('option[value="whitespace"]')).toBeDisabled();
    await expectCounts(whole(page), "—", "—");
    await page
      .getByLabel("Counting method", { exact: true })
      .selectOption("legacy");
    await page.getByLabel("Your text").fill(example);
    await expectCounts(whole(page), "3", "22");
    await page.getByRole("button", { name: "About counting methods" }).click();
    await expect(
      page.getByRole("row", { name: "Unicode-aware Unavailable Unavailable" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("can keep counting offline without transmitting or storing their text", async ({
    page,
    context,
  }) => {
    const marker = "private-counter-7af91";
    const passage = `${marker} mother-in-law 👩‍💻\n${marker}`;
    const requests: string[] = [];
    const logs: string[] = [];
    context.on("request", (request) =>
      requests.push(
        `${request.url()} ${request.postData() ?? ""} ${JSON.stringify(request.headers())}`,
      ),
    );
    page.on("console", (message) => logs.push(message.text()));
    const before =
      await test.step("Given a counter visit without tracking scripts", async () => {
        await page.goto("/tools/word-counter");
        await expect(page.locator('script[src*="/_vercel/"]')).toHaveCount(0);
        return context.storageState({ indexedDB: true });
      });
    await test.step("When they enter private text and continue offline", async () => {
      await page.getByLabel("Your text").fill(passage);
      await selectRange(page, 0, marker.length);
      await page
        .getByLabel("Counting method", { exact: true })
        .selectOption("legacy");
      await page
        .getByRole("button", { name: "About counting methods" })
        .click();
      await page.keyboard.press("Escape");
      await context.setOffline(true);
      await page.getByLabel("Your text").fill(`${passage} offline`);
      await expectCounts(whole(page), "5", "71");
      await page
        .getByLabel("Counting method", { exact: true })
        .selectOption("unicode");
      await expectCounts(whole(page), "10", "67");
      await context.setOffline(false);
    });
    await test.step("Then text stays out of requests and storage and is cleared on reload", async () => {
      const during = await context.storageState({ indexedDB: true });
      expect(during).toEqual(before);
      expect(
        await page.evaluate(() =>
          JSON.stringify({
            local: Object.fromEntries(Object.entries(localStorage)),
            session: Object.fromEntries(Object.entries(sessionStorage)),
            url: location.href,
            history: history.state as unknown,
          }),
        ),
      ).not.toContain(marker);
      await page.reload();
      await expect(page.getByLabel("Your text")).toHaveValue("");
      await page.getByRole("link", { name: "Back to our tools list" }).click();
      const captured = JSON.stringify({
        requests,
        logs,
        storage: await context.storageState({ indexedDB: true }),
      });
      expect(captured).not.toContain(marker);
      expect(decodeURIComponent(captured)).not.toContain(marker);
    });
  });

  test("excludes both trackers after arriving from another page", async ({
    page,
  }) => {
    // Keep the SDK queues available without contacting Vercel. This exercises
    // the callbacks registered by the real React integrations.
    await page.route("**/_vercel/**", async (route) => {
      await route.fulfill({ contentType: "application/javascript", body: "" });
    });
    await page.goto("/");
    await page.getByRole("link", { name: "Tools", exact: true }).click();
    await page.getByRole("link", { name: "Open word counter" }).click();
    await expect(page).toHaveURL("/tools/word-counter");
    await page.getByLabel("Your text").fill("private-counter-tracker-52a90");
    const checkCallbacks = () =>
      page.evaluate(() => {
        return [window.vaq ?? [], window.siq ?? []].map((queue) => {
          const callback = queue.findLast(
            ([kind]) => kind === "beforeSend",
          )?.[1];
          if (typeof callback !== "function")
            throw new Error("A tracking filter was not registered.");
          const filter = callback as (event: {
            type: string;
            url: string;
          }) => unknown;
          return {
            current: filter({ type: "pageview", url: location.href }),
            counter: filter({
              type: "vital",
              url: `${location.origin}/tools/word-counter`,
            }),
          };
        });
      });
    expect(await checkCallbacks()).toEqual([
      { current: null, counter: null },
      { current: null, counter: null },
    ]);
    await page.getByRole("link", { name: "Back to our tools list" }).click();
    await expect(page).toHaveURL("/tools");
    for (const result of await checkCallbacks()) {
      expect(result.current).not.toBeNull();
      expect(result.counter).toBeNull();
    }
  });

  test(
    "can paste from the clipboard and select a word with the mouse",
    { tag: "@desktop" },
    async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto("/tools/word-counter");
      await page.evaluate(
        async (text) => navigator.clipboard.writeText(text),
        example,
      );
      const editor = page.getByLabel("Your text");
      await editor.focus();
      await editor.press("ControlOrMeta+v");
      await expectCounts(whole(page), "4", "18");
      await editor.dblclick({ position: { x: 20, y: 18 } });
      // Windows can include the space after a double-clicked word.
      const highlighted = await editor.evaluate((input: HTMLTextAreaElement) =>
        input.value.slice(input.selectionStart, input.selectionEnd),
      );
      expect(highlighted.trim()).toBe("My");
      await expectSelected(page, "1", highlighted.length.toString());
    },
  );

  test("keeps the editor, results and modal within the device viewport", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/tools/word-counter");
    await page.getByLabel("Your text").fill(example.repeat(300));
    const editor = await page.getByLabel("Your text").boundingBox();
    const results = await whole(page).boundingBox();
    if (!editor || !results)
      throw new Error("The editor or counts are missing.");
    if (isMobile) expect(results.y).toBeGreaterThan(editor.y + editor.height);
    else expect(results.x).toBeGreaterThan(editor.x + editor.width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "About counting methods" }).click();
    const dialog = await page.getByRole("dialog").boundingBox();
    const viewport = page.viewportSize();
    if (!dialog || !viewport)
      throw new Error("The dialog or viewport is missing.");
    expect(dialog.x).toBeGreaterThanOrEqual(0);
    expect(dialog.x + dialog.width).toBeLessThanOrEqual(viewport.width);
  });
});
