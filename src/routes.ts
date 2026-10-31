import type { MetadataRoute } from "next";

// The one list of pages. The sitemap, the accessibility and SEO tests and the
// Lighthouse checks all read from it, so add any new page here.

export const siteUrl = "https://www.almostyellow.co.uk";

interface PublicRoute {
  path: string;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  priority: number;
}

export const publicRoutes: PublicRoute[] = [
  { path: "/", changeFrequency: "yearly", priority: 0.6 },
  { path: "/games", changeFrequency: "monthly", priority: 0.8 },
  { path: "/games/irishbingo", changeFrequency: "yearly", priority: 1 },
  { path: "/games/snakesandladders", changeFrequency: "yearly", priority: 0.9 },
  { path: "/games/boomboompirate", changeFrequency: "yearly", priority: 0.9 },
  { path: "/games/uno", changeFrequency: "yearly", priority: 0.2 },
  { path: "/decisionmaker", changeFrequency: "yearly", priority: 0.8 },
  { path: "/cocktails", changeFrequency: "monthly", priority: 0.9 },
  { path: "/films", changeFrequency: "weekly", priority: 0.9 },
  { path: "/whiskyjournal", changeFrequency: "weekly", priority: 0.7 },
];

// Pages behind sign-in, kept out of search engines. Pages with an ID in the
// path are listed with a placeholder, and the tests fill in a fixture ID.
export const adminRoutes = [
  "/admin",
  "/admin/login",
  "/admin/chopinliszt",
  "/admin/holidays",
  "/admin/films/add",
  "/admin/films/[id]/edit",
  "/admin/whiskyjournal/add",
  "/admin/whiskyjournal/[id]/edit",
];
