import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { isApprovedContrastPair } from "./contrast-exceptions";

// WCAG 2.2 AA, plus axe's best practices. The same engine as the axe DevTools
// browser extension.
const tags = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

export const schemes = ["dark", "light"] as const;
export type Scheme = (typeof schemes)[number];

// Mantine reads the colour scheme from local storage before it renders, so
// this must run before the page loads. Reduced motion skips Mantine's
// transitions, so axe never checks a dialog part way through fading in.
export async function useScheme(page: Page, scheme: Scheme) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((value) => {
    window.localStorage.setItem("mantine-color-scheme-value", value);
  }, scheme);
}

// Approved filled-control contrast exceptions appear in the HTML report.
// Every other finding still fails, including contrast elsewhere on the page.
export async function expectNoUnexpectedAxeViolations(
  page: Page,
  { soft = false } = {},
) {
  const results = await new AxeBuilder({ page })
    .withTags(tags)
    // The confetti comes from a third-party script we cannot change
    .exclude("#confettipage-canvas")
    .exclude("body > canvas")
    .exclude(
      'a[href="https://confettipage.com"], a[href="https://confettipage.com/"]',
    )
    .analyze();
  const problems: string[] = [];
  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      const data = node.any.find((check) => check.id === "color-contrast")
        ?.data as { fgColor?: unknown; bgColor?: unknown } | undefined;
      const selector =
        node.target.length === 1 && typeof node.target[0] === "string"
          ? node.target[0]
          : null;
      if (
        violation.id === "color-contrast" &&
        selector &&
        isApprovedContrastPair(data?.fgColor, data?.bgColor)
      ) {
        const approvedControl = await page
          .locator(selector)
          .evaluate((element) => {
            const control = element.closest(
              ".mantine-Button-root, .mantine-ActionIcon-root, .mantine-Badge-root, .mantine-SegmentedControl-label[data-active], .mantine-Chip-label[data-checked]",
            );
            if (!control) return false;
            return [null, "filled"].includes(
              control.getAttribute("data-variant"),
            );
          });
        if (approvedControl) {
          test.info().annotations.push({
            type: "approved-contrast-exception",
            description: `${selector}: white text on an approved original filled-control colour`,
          });
          continue;
        }
      }
      problems.push(
        `${violation.id} (${violation.impact ?? "unknown"}): ${node.target.join(" ")}\n` +
          `  ${node.html.slice(0, 200)}\n` +
          `  ${node.failureSummary?.replaceAll("\n", "\n  ") ?? ""}\n` +
          `  ${violation.helpUrl}`,
      );
    }
  }
  const message = `${page.url()}\n\n${problems.join("\n\n")}`;
  if (soft) expect.soft(problems, message).toEqual([]);
  else expect(problems, message).toEqual([]);
}
