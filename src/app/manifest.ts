import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/** PWA-lite web app manifest (installable, themed). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#241a10",
    lang: "de",
    categories: ["food", "shopping"],
  };
}
