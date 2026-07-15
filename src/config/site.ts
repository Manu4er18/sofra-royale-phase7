/**
 * Global site configuration.
 *
 * Static, deploy-time values only. Anything the restaurant owner should
 * edit at runtime (opening hours, contact details, hero content …) lives
 * in the `SiteSetting` table and is managed via the admin CMS (Phase 5).
 */
export const siteConfig = {
  name: "Sofra Royale",
  tagline: "Dubai & Turkish Fine Dining",
  description:
    "Sofra Royale vereint Dubai Fine Dining mit türkischer Küche: halal Premium-Gerichte, Grill-Spezialitäten, Mezze, Desserts, Lieferung, Abholung und Reservierung.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  defaultLocale: "de" as const,
  locales: ["de", "ru", "en", "tg"] as const,
  currency: "EUR",
  links: {
    instagram: "https://instagram.com/sofraroyale",
    facebook: "https://facebook.com/sofraroyale",
    tiktok: "https://tiktok.com/@sofraroyale",
  },
} as const;

export type SiteConfig = typeof siteConfig;
