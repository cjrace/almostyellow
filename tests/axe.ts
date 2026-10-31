import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

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

// Fails with one entry per problem, so the report says what to fix. A soft
// check carries on, for tests that look at several pages in turn.
export async function expectNoAxeViolations(page: Page, { soft = false } = {}) {
  const results = await new AxeBuilder({ page })
    .withTags(tags)
    // The confetti comes from a third-party script we cannot change
    .exclude("#confettipage-canvas")
    .exclude("body > canvas")
    .exclude('a[href$="confettipage.com"]')
    .analyze();
  const problems = results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} (${violation.impact ?? "unknown"}): ${node.target.join(" ")}\n` +
        `  ${node.html.slice(0, 200)}\n` +
        `  ${node.failureSummary?.replaceAll("\n", "\n  ") ?? ""}\n` +
        `  ${violation.helpUrl}`,
    ),
  );
  const message = `${page.url()}\n\n${problems.join("\n\n")}`;
  if (soft) expect.soft(problems, message).toEqual([]);
  else expect(problems, message).toEqual([]);
}
