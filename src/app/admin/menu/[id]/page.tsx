import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";

import { db } from "@/lib/db";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/product-form";
import {
  ProductConfigEditor,
  type ProductConfigValues,
} from "@/components/admin/product-config-editor";
import { ProductImages } from "@/components/admin/product-images";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Admin — Gericht bearbeiten",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const toEuros = (cents: number) => (cents / 100).toFixed(2);

export default async function EditProductPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const [product, categories, cuisines] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] },
        variations: { orderBy: { sortOrder: "asc" } },
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        },
        addons: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.cuisine.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  const formValues: ProductFormValues = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    categoryId: product.categoryId,
    cuisineId: product.cuisineId,
    basePrice: toEuros(product.basePrice),
    discountPrice: product.discountPrice ? toEuros(product.discountPrice) : "",
    calories: product.calories?.toString() ?? "",
    preparationTime: product.preparationTime.toString(),
    portionSize: product.portionSize ?? "",
    spiceLevel: product.spiceLevel,
    status: product.status,
    stockQuantity: product.stockQuantity?.toString() ?? "",
    lowStockThreshold: product.lowStockThreshold.toString(),
    isAvailable: product.isAvailable,
    isFeatured: product.isFeatured,
    isPopular: product.isPopular,
    isNew: product.isNew,
    isVegetarian: product.isVegetarian,
    isVegan: product.isVegan,
    isGlutenFree: product.isGlutenFree,
    isHalal: product.isHalal,
    isChefRecommendation: product.isChefRecommendation,
    isDailySpecial: product.isDailySpecial,
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
  };

  const configValues: ProductConfigValues = {
    variations: product.variations.map((v) => ({
      name: v.name,
      price: toEuros(v.price),
      isDefault: v.isDefault,
    })),
    optionGroups: product.optionGroups.map((g) => ({
      name: g.name,
      minSelect: g.minSelect.toString(),
      maxSelect: g.maxSelect.toString(),
      isRequired: g.isRequired,
      options: g.options.map((o) => ({
        name: o.name,
        priceDelta: toEuros(o.priceDelta),
        isDefault: o.isDefault,
      })),
    })),
    addons: product.addons.map((a) => ({
      name: a.name,
      price: toEuros(a.price),
      maxQuantity: a.maxQuantity.toString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/admin/menu">
              <ChevronLeft /> Zur Speisekarte
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold">{product.name}</h1>
        </div>
        {product.status === "PUBLISHED" ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/menu/${product.slug}`} target="_blank">
              Vorschau <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <ProductForm
        initial={formValues}
        categories={categories}
        cuisines={cuisines}
      />

      <ProductImages productId={product.id} images={product.images} />

      <ProductConfigEditor productId={product.id} initial={configValues} />
    </div>
  );
}
