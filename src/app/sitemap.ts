import type { MetadataRoute } from "next";
import { siteUrl } from "@/routes";
import { discoverRoutes } from "@/discover-routes";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return discoverRoutes().publicRoutes.map(({ path }) => ({
    url: `${siteUrl}${path}`,
  }));
}
