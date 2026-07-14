import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/** robots.txt — block private areas, expose the sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/checkout",
        "/cart",
        "/api/",
        "/track-order",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
