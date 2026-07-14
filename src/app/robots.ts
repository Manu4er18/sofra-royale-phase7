import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/** robots.txt — allow crawlers and expose the sitemap for indexing. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
