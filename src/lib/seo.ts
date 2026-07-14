import { siteConfig } from "@/config/site";

/**
 * Structured-data (schema.org JSON-LD) builders.
 * Emitted as <script type="application/ld+json"> for rich results.
 */

/** Restaurant / LocalBusiness — homepage + footer-level identity. */
export function restaurantJsonLd(contact?: {
  address?: string;
  phone?: string;
  email?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    servesCuisine: ["Emirati", "Turkish", "Middle Eastern", "Halal"],
    priceRange: "€€",
    telephone: contact?.phone ?? "+49 211 555 012 34",
    email: contact?.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Königsallee 42",
      postalCode: "40212",
      addressLocality: "Düsseldorf",
      addressCountry: "DE",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "11:30",
        closes: "22:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Friday", "Saturday"],
        opens: "11:30",
        closes: "23:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "12:00",
        closes: "22:00",
      },
    ],
    acceptsReservations: `${siteConfig.url}/reservations`,
    sameAs: [siteConfig.links.instagram, siteConfig.links.facebook],
  };
}

/** BreadcrumbList for a page's ancestry. */
export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Serialize JSON-LD safely for dangerouslySetInnerHTML. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
