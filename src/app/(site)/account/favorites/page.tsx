import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { productCardSelect } from "@/lib/services/catalog";
import { ProductGrid } from "@/components/menu/product-grid";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Favoriten",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) return null;

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { select: productCardSelect } },
  });
  const products = favorites.map((f) => f.product).filter((p) => p !== null);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Heart className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Noch keine Favoriten</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            Tippen Sie auf das Herz auf einer Gerichtseite, um es hier zu
            speichern.
          </p>
        </div>
        <Button variant="gold" asChild>
          <Link href="/menu">Speisekarte entdecken</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        Favoriten{" "}
        <span className="text-lg font-normal text-muted-foreground">
          ({products.length})
        </span>
      </h1>
      <ProductGrid
        products={products}
        emptyHint="Tippen Sie auf das Herz auf einer Gerichtseite."
      />
      <p className="text-sm text-muted-foreground">
        Zum Entfernen öffnen Sie das Gericht und tippen erneut auf das Herz.
      </p>
    </div>
  );
}
