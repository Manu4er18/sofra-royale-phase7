import { Suspense } from "react";

import {
  getActiveCategories,
  getActiveCuisines,
  listProducts,
} from "@/lib/services/catalog";
import type { ProductFilters } from "@/lib/validations/catalog";
import { ProductGrid } from "@/components/menu/product-grid";
import { FilterPanel } from "@/components/menu/filter-panel";
import { SortSelect } from "@/components/menu/sort-select";
import { Pagination } from "@/components/menu/pagination";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared listing composition for /menu, cuisine, category and
 * collection pages: filter panel + toolbar + grid + pagination.
 */
export async function ProductListing({
  filters,
  basePath,
  rawSearchParams,
  showTaxonomy = true,
}: {
  filters: ProductFilters;
  basePath: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
  showTaxonomy?: boolean;
}) {
  const [{ products, total, page, totalPages }, categories, cuisines] =
    await Promise.all([
      listProducts(filters),
      getActiveCategories(),
      getActiveCuisines(),
    ]);

  return (
    <div className="flex gap-8">
      {/* useSearchParams inside → Suspense boundary required for SSG paths */}
      <Suspense fallback={<Skeleton className="hidden h-96 w-60 lg:block" />}>
        <FilterPanel
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          cuisines={cuisines.map((c) => ({ slug: c.slug, name: c.name }))}
          showTaxonomy={showTaxonomy}
        />
      </Suspense>

      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total === 1 ? "1 Gericht" : `${total} Gerichte`}
          </p>
          <Suspense fallback={<Skeleton className="h-9 w-44" />}>
            <SortSelect />
          </Suspense>
        </div>

        <ProductGrid products={products} />

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath={basePath}
          searchParams={rawSearchParams}
        />
      </div>
    </div>
  );
}

/** Grid skeleton used by listing pages' loading.tsx files. */
export function ListingSkeleton() {
  return (
    <div className="flex gap-8">
      <Skeleton className="hidden h-96 w-60 lg:block" />
      <div className="flex-1 space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-52 w-full rounded-lg" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
