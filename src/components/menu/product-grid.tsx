import { SearchX } from "lucide-react";

import type { ProductCardData } from "@/lib/services/catalog";
import { ProductCard } from "@/components/menu/product-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/** Responsive product grid with a friendly empty state. */
export function ProductGrid({
  products,
  emptyHint = "Passen Sie Ihre Filter an oder entdecken Sie die ganze Karte.",
}: {
  products: ProductCardData[];
  emptyHint?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <SearchX className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="font-display text-lg font-semibold">
            Keine Gerichte gefunden
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {emptyHint}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/menu">Ganze Speisekarte anzeigen</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
