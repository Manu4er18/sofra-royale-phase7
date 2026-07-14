import type { Metadata } from "next";
import { Suspense } from "react";

import { parseProductFilters } from "@/lib/validations/catalog";
import { ProductListing } from "@/components/menu/product-listing";
import { SearchBox } from "@/components/search/search-box";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Suche",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function SearchPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await props.searchParams;
  const filters = parseProductFilters(rawSearchParams);
  const query = filters.q ?? "";

  return (
    <div className="container py-10">
      <header className="mb-8 max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold">
          {query ? `Ergebnisse für „${query}“` : "Suche"}
        </h1>
        <Suspense fallback={<Skeleton className="h-10 w-full max-w-md" />}>
          <SearchBox
            autoFocus={!query}
            initialQuery={query}
            className="max-w-md"
          />
        </Suspense>
      </header>

      {query ? (
        <ProductListing
          filters={filters}
          basePath="/search"
          rawSearchParams={rawSearchParams}
        />
      ) : (
        <p className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Suchen Sie nach Gerichten, Zutaten oder Kategorien — zum Beispiel
          „Kebap“, „Safran“ oder „vegan“.
        </p>
      )}
    </div>
  );
}
