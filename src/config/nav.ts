/**
 * Navigation config — single source of truth for header/footer nav.
 * Only routes that exist are listed; no dead links, ever.
 * Phase 4 adds: /reservations, /about, /contact, legal pages …
 */
export type NavItem = {
  title: string;
  href: string;
  description?: string;
};

/** Main header navigation (public). */
export const mainNav: NavItem[] = [
  { title: "Speisekarte", href: "/menu" },
  { title: "Dubai", href: "/dubai" },
  { title: "Türkisch", href: "/turkish" },
  { title: "Angebote", href: "/offers" },
  { title: "Reservieren", href: "/reservations" },
];

/** Footer: explore column. */
export const footerExploreNav: NavItem[] = [
  { title: "Ganze Speisekarte", href: "/menu" },
  { title: "Beliebte Gerichte", href: "/popular" },
  { title: "Neu auf der Karte", href: "/new" },
  { title: "Vegetarisch", href: "/vegetarian" },
  { title: "Vegan", href: "/vegan" },
  { title: "Halal-Menü", href: "/halal" },
];

/** Footer: service column. */
export const footerServiceNav: NavItem[] = [
  { title: "Warenkorb", href: "/cart" },
  { title: "Bestellung verfolgen", href: "/track-order" },
  { title: "Konto erstellen", href: "/register" },
];

/** Footer: company / about column. */
export const footerCompanyNav: NavItem[] = [
  { title: "Über uns", href: "/about" },
  { title: "Kontakt", href: "/contact" },
  { title: "Häufige Fragen", href: "/faq" },
  { title: "Lieferbedingungen", href: "/delivery" },
  { title: "Allergene", href: "/allergens" },
];

/** Footer: legal links (bottom bar). Germany requires these. */
export const footerLegalNav: NavItem[] = [
  { title: "Impressum", href: "/imprint" },
  { title: "Datenschutz", href: "/privacy" },
  { title: "AGB", href: "/terms" },
  { title: "Widerruf", href: "/refunds" },
  { title: "Cookie-Richtlinie", href: "/cookies" },
];

/** Customer account navigation (sidebar). */
export const accountNav: NavItem[] = [
  { title: "Übersicht", href: "/account" },
  { title: "Bestellungen", href: "/account/orders" },
  { title: "Favoriten", href: "/account/favorites" },
  { title: "Bewertungen", href: "/account/reviews" },
  { title: "Reservierungen", href: "/account/reservations" },
  { title: "Adressen", href: "/account/addresses" },
  { title: "Treuepunkte & Gutscheine", href: "/account/loyalty" },
  { title: "Benachrichtigungen", href: "/account/notifications" },
  { title: "Einstellungen", href: "/account/settings" },
];

/** Admin dashboard navigation, grouped for the sidebar. */
export const adminNavGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Betrieb",
    items: [
      { title: "Übersicht", href: "/admin" },
      { title: "Bestellungen", href: "/admin/orders" },
      { title: "Live-Chat", href: "/admin/chat" },
      { title: "Reservierungen", href: "/admin/reservations" },
      { title: "Bewertungen", href: "/admin/reviews" },
    ],
  },
  {
    title: "Katalog",
    items: [
      { title: "Speisekarte", href: "/admin/menu" },
      { title: "Gutscheine", href: "/admin/coupons" },
      { title: "Liefergebiete", href: "/admin/zones" },
    ],
  },
  {
    title: "Verwaltung",
    items: [
      { title: "Kunden", href: "/admin/customers" },
      { title: "Rollen & Rechte", href: "/admin/roles" },
      { title: "Analysen", href: "/admin/analytics" },
      { title: "Inhalte & Einstellungen", href: "/admin/content" },
      { title: "Audit-Log", href: "/admin/audit" },
    ],
  },
];
