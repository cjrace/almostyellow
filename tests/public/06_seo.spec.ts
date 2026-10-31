import { globSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { adminRoutes, publicRoutes, siteUrl } from "../../src/routes";

// What search engines see is the same in every browser
test.skip(
  ({ browserName, isMobile }) => browserName !== "chromium" || isMobile,
);

test("Every page is in src/routes.ts", () => {
  const routes = globSync("src/app/**/page.tsx").map(
    (file) =>
      file
        .replaceAll("\\", "/")
        .replace(/^src\/app/, "")
        .replace(/\/page\.tsx$/, "")
        // Route groups such as (homepage) are not part of the URL
        .replaceAll(/\/\([^)]+\)/g, "") || "/",
  );
  const listed = [...publicRoutes.map(({ path }) => path), ...adminRoutes];
  expect(routes.toSorted()).toEqual(listed.toSorted());
});

for (const { path } of publicRoutes) {
  test(`${path} can be found and shared`, async ({ page }) => {
    await page.goto(path);

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toHaveCount(1);

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description?.length).toBeGreaterThan(0);
    expect(description?.length).toBeLessThanOrEqual(160);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      path === "/" ? new RegExp(`^${siteUrl}/?$`) : `${siteUrl}${path}`,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /.+/,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", /.+/);
    await expect(
      page.locator('meta[property="og:image"]').first(),
    ).toHaveAttribute("content", new RegExp(`^${siteUrl}/`));
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });
}

test("Every page has its own title and description", async ({ page }) => {
  const titles: string[] = [];
  const descriptions: string[] = [];
  for (const { path } of publicRoutes) {
    await page.goto(path);
    titles.push(await page.title());
    descriptions.push(
      (await page
        .locator('meta[name="description"]')
        .getAttribute("content")) ?? "",
    );
  }
  const repeats = (list: string[]) =>
    list.filter((item, i) => list.indexOf(item) !== i);
  expect(repeats(titles)).toEqual([]);
  expect(repeats(descriptions)).toEqual([]);
});

test("Admin pages are kept out of search engines", async ({ page }) => {
  // Without a session every admin page shows the login page, which still
  // needs to say noindex
  await page.goto("/admin/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("robots.txt blocks admin pages and points to the sitemap", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin/");
  expect(robots).toContain(`Sitemap: ${siteUrl}/sitemap.xml`);
});

test("The sitemap lists every public page and nothing else", async ({
  request,
}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    ([, url]) => url,
  );
  expect(urls.toSorted()).toEqual(
    publicRoutes.map(({ path }) => `${siteUrl}${path}`).toSorted(),
  );
});
