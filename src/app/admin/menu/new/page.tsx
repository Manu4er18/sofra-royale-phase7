import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Admin — Neues Gericht",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  cuisineId: "",
  basePrice: "",
  discountPrice: "",
  calories: "",
  preparationTime: "20",
  portionSize: "",
  spiceLevel: "NONE",
  status: "DRAFT",
  stockQuantity: "",
  lowStockThreshold: "5",
  isAvailable: true,
  isFeatured: false,
  isPopular: false,
  isNew: true,
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  isHalal: true,
  isChefRecommendation: false,
  isDailySpecial: false,
  metaTitle: "",
  metaDescription: "",
};

export default async function NewProductPage() {
  const [categories, cuisines] = await Promise.all([
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.cuisine.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/admin/menu">
            <ChevronLeft /> Zur Speisekarte
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold">Neues Gericht</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nach dem Erstellen können Sie Bilder, Portionen, Optionen und Extras
          hinzufügen.
        </p>
      </div>
      <ProductForm
        initial={EMPTY}
        categories={categories}
        cuisines={cuisines}
      />
    </div>
  );
}
