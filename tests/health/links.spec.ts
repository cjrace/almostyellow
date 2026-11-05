import { test, expect } from "../playwright";
import { discoverRoutes } from "../../src/discover-routes";
import { localResourceUrls } from "./targets";
import { writeHealthReport } from "./reports";

const checked = new Map<string, number>();

test.describe("A visitor following public links and viewing images", () => {
  for (const { path } of discoverRoutes().publicRoutes) {
    test(`${path} has working internal links and images`, async ({
      page,
      request,
    }) => {
      const response = await page.goto(path);
      expect(response?.ok()).toBe(true);
      const values = await page
        .locator("a[href], img")
        .evaluateAll((elements) =>
          elements.map((element) =>
            element instanceof HTMLImageElement
              ? element.currentSrc || element.src
              : (element.getAttribute("href") ?? ""),
          ),
        );
      const problems: string[] = [];
      for (const url of localResourceUrls(values, page.url())) {
        let status = checked.get(url);
        if (status === undefined) {
          // Redirects fail rather than following a redirect to a live site.
          status = (await request.get(url, { maxRedirects: 0 })).status();
          checked.set(url, status);
        }
        if (status < 200 || status >= 300)
          problems.push(`${status.toString()} ${url}`);
      }
      writeHealthReport(
        "links.md",
        `- ${path}: ${problems.length === 0 ? "passed" : problems.join("; ")}\n`,
      );
      expect(problems).toEqual([]);
    });
  }
});
