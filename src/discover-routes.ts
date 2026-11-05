// Node-only: the static sitemap and test runners discover pages from source.
// Keep browser-safe settings in routes.ts.
import { globSync } from "node:fs";
import { join } from "node:path";

export function routesFromPages(pages: string[]) {
  const paths = new Set<string>();
  for (const file of pages) {
    const segments = file.replaceAll("\\", "/").split("/");
    if (segments.at(-1) !== "page.tsx") continue;
    segments.pop();
    if (segments.some((segment) => segment.startsWith("_"))) continue;
    const route = segments.filter(
      (segment) => !/^\([^.)][^/]*\)$/.test(segment),
    );
    const path = `/${route.join("/")}`;
    if (
      route.some(
        (segment) => segment.startsWith("@") || segment.startsWith("("),
      )
    ) {
      throw new Error(`Unsupported parallel or intercepting page: ${file}`);
    }
    if (
      route[0] !== "admin" &&
      route.some((segment) => segment.includes("["))
    ) {
      throw new Error(
        `Public dynamic page needs explicit sitemap URLs: ${file}`,
      );
    }
    if (paths.has(path)) throw new Error(`Duplicate page URL: ${path}`);
    paths.add(path);
  }
  const sorted = [...paths].sort();
  return {
    publicRoutes: sorted
      .filter((path) => path !== "/admin" && !path.startsWith("/admin/"))
      .map((path) => ({ path })),
    adminRoutes: sorted.filter(
      (path) => path === "/admin" || path.startsWith("/admin/"),
    ),
  };
}

export function discoverRoutes(projectRoot = process.cwd()) {
  const app = join(projectRoot, "src", "app");
  const pages = globSync("**/page.tsx", { cwd: app });
  if (pages.length === 0)
    throw new Error(`No App Router pages found in ${app}`);
  return routesFromPages(pages);
}
