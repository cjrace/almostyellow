import { siteUrl } from "../../src/routes";

// Rewrite canonical site links to the emulator-backed app. Never request an
// external site or a protected admin page from this public-page check.
export function localResourceUrls(values: string[], pageUrl: string) {
  const origin = new URL(pageUrl).origin;
  const urls = new Set<string>();
  for (const value of values) {
    if (!value.trim()) continue;
    const url = new URL(value, pageUrl);
    if (![origin, siteUrl].includes(url.origin)) continue;
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/"))
      continue;
    url.protocol = new URL(origin).protocol;
    url.host = new URL(origin).host;
    url.hash = "";
    urls.add(url.href);
  }
  return [...urls].sort();
}
