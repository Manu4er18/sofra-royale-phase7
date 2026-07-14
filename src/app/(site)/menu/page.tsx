import type { Metadata } from "next";

import { parseProductFilters } from "@/lib/validations/catalog";
import { ProductListing } from "@/components/menu/product-listing";

export const metadata: Metadata = {
  title: "Speisekarte",
  description:
    "Die komplette Speisekarte von Sofra Royale: Dubai-Spezialitäten, türkische Grillklassiker, Meze, Desserts und mehr — filtern nach Küche, Preis, vegan, halal und Schärfe.",
};

// Filters come from searchParams → always dynamic.
export const dynamic = "force-dynamic";

export default async function MenuPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await props.searchParams;
  const filters = parseProductFilters(rawSearchParams);

  return (
    <div className="container py-10">
      <header className="mb-8 max-w-2xl">
        <p className="text-sm uppercase tracking-widest text-gold">
          Sofra Royale
        </p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
          Unsere Speisekarte
        </h1>
        <p className="mt-3 text-muted-foreground">
          Von Machboos bis Mantı — entdecken Sie die ganze Sofra. Alle Gerichte
          sind halal; Filter helfen bei Allergien und Vorlieben.
        </p>
      </header>

      <ProductListing
        filters={filters}
        basePath="/menu"
        rawSearchParams={rawSearchParams}
      />
    </div>
  );
}
