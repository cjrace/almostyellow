import { test, expect } from "../playwright";
import { siteUrl } from "../../src/routes";
import { discoverRoutes } from "../../src/discover-routes";

const { publicRoutes } = discoverRoutes();

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

    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical?.replace(/\/$/, "")).toBe(
      `${siteUrl}${path === "/" ? "" : path}`,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /.+/,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", /.+/);
    const image = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    expect(new URL(image ?? "").origin).toBe(siteUrl);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

    if (path === "/") {
      const json = await page
        .locator('script[type="application/ld+json"]')
        .textContent();
      expect(JSON.parse(json ?? "")).toEqual({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Almost Yellow",
        url: siteUrl,
      });
    }
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
  expect(sitemap).not.toMatch(/<lastmod>|<priority>|<changefreq>/);
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    ([, url]) => url,
  );
  expect(urls.toSorted()).toEqual(
    publicRoutes.map(({ path }) => `${siteUrl}${path}`).toSorted(),
  );
});
