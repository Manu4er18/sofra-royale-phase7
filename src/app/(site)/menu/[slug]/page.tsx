import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock3, Flame } from "lucide-react";

import { getProductBySlug } from "@/lib/services/catalog";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { siteConfig } from "@/config/site";
import { breadcrumbJsonLd } from "@/lib/seo";
import { FavoriteButton } from "@/components/product/favorite-button";
import { ProductGallery } from "@/components/product/product-gallery";
import {
  ProductConfigurator,
  type ConfiguratorProduct,
} from "@/components/product/product-configurator";
import { ReviewList } from "@/components/product/review-list";
import { ReviewDialog } from "@/components/account/review-dialog";
import { ProductGrid } from "@/components/menu/product-grid";
import { Price } from "@/components/menu/price";
import { RatingStars } from "@/components/menu/rating-stars";
import { DietaryBadges, StatusBadges } from "@/components/menu/product-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

const SPICE_LABEL: Record<string, string> = {
  NONE: "Nicht scharf",
  MILD: "Mild",
  MEDIUM: "Mittelscharf",
  HOT: "Scharf",
  EXTRA_HOT: "Sehr scharf",
};

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Nicht gefunden" };

  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
    alternates: { canonical: `${siteConfig.url}/menu/${product.slug}` },
  };
}

export default async function ProductDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Favorite state for the heart button.
  const session = await auth();
  const isFavorite = session?.user?.id
    ? !!(await db.favorite.findUnique({
        where: {
          userId_productId: {
            userId: session.user.id,
            productId: product.id,
          },
        },
      }))
    : false;

  const isOrderable =
    product.isAvailable && product.stockStatus !== "OUT_OF_STOCK";

  const configuratorProduct: ConfiguratorProduct = {
    id: product.id,
    name: product.name,
    basePrice: product.basePrice,
    discountPrice: product.discountPrice,
    isOrderable,
    variations: product.variations.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      isDefault: v.isDefault,
    })),
    optionGroups: product.optionGroups.map((g) => ({
      id: g.id,
      name: g.name,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      isRequired: g.isRequired,
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name,
        priceDelta: o.priceDelta,
        isDefault: o.isDefault,
      })),
    })),
    addons: product.addons.map((a) => ({
      id: a.id,
      name: a.name,
      price: a.price,
      maxQuantity: a.maxQuantity,
    })),
  };

  const related = product.relatedTo.map((r) => r.related);
  const effectivePrice =
    product.discountPrice !== null && product.discountPrice < product.basePrice
      ? product.discountPrice
      : product.basePrice;

  // Product structured data (schema.org) for rich results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: product.name,
    description: product.shortDescription,
    image: product.images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      price: (effectivePrice / 100).toFixed(2),
      priceCurrency: product.currency,
      availability: isOrderable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.averageRating.toFixed(1),
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    ...(product.calories
      ? {
          nutrition: {
            "@type": "NutritionInformation",
            calories: `${product.calories} kcal`,
          },
        }
      : {}),
  };

  return (
    <div className="container space-y-14 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Startseite", url: siteConfig.url },
              { name: "Speisekarte", url: `${siteConfig.url}/menu` },
              {
                name: product.category.name,
                url: `${siteConfig.url}/${product.category.slug}`,
              },
              {
                name: product.name,
                url: `${siteConfig.url}/menu/${product.slug}`,
              },
            ]),
          ),
        }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Brotkrumen" className="-mb-8">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground">
              Startseite
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <li>
            <Link href="/menu" className="hover:text-foreground">
              Speisekarte
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <li>
            <Link
              href={`/${product.category.slug}`}
              className="hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <li aria-current="page" className="font-medium text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery
          images={product.images}
          videos={product.videos}
          productName={product.name}
        />

        <div className="space-y-5">
          <StatusBadges product={product} />

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-widest text-gold">
                {product.cuisine.name}
              </p>
              <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
                {product.name}
              </h1>
            </div>
            <FavoriteButton
              productId={product.id}
              initialIsFavorite={isFavorite}
              isLoggedIn={!!session?.user}
              className="mt-1 shrink-0"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Price
              basePrice={
                product.variations.length > 0
                  ? (product.variations.find((v) => v.isDefault) ??
                      product.variations[0])!.price
                  : product.basePrice
              }
              discountPrice={
                product.variations.length > 0 ? null : product.discountPrice
              }
              className="text-2xl"
            />
            <RatingStars
              rating={product.averageRating}
              reviewCount={product.reviewCount}
            />
          </div>

          <p className="text-muted-foreground">{product.description}</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" aria-hidden />
              ca. {product.preparationTime} Min.
            </span>
            {product.calories ? <span>{product.calories} kcal</span> : null}
            {product.portionSize ? <span>{product.portionSize}</span> : null}
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-4 w-4" aria-hidden />
              {SPICE_LABEL[product.spiceLevel]}
            </span>
          </div>

          <DietaryBadges product={product} />

          <Separator />

          <ProductConfigurator product={configuratorProduct} />
        </div>
      </div>

      {/* Ingredients & allergens */}
      <section
        aria-labelledby="ingredients-heading"
        className="grid gap-8 rounded-lg border bg-card p-6 sm:grid-cols-2"
      >
        <div>
          <h2 id="ingredients-heading" className="text-lg font-semibold">
            Zutaten
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {product.ingredients.map((pi) => (
              <li key={pi.ingredientId}>
                <Badge variant="secondary" className="font-normal">
                  {pi.ingredient.name}
                  {pi.isRemovable ? (
                    <span className="ml-1 text-muted-foreground">
                      (abwählbar)
                    </span>
                  ) : null}
                </Badge>
              </li>
            ))}
            {product.ingredients.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Zutatenliste auf Anfrage.
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Allergene</h2>
          {product.allergens.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {product.allergens.map((pa) => (
                <li key={pa.allergenId}>
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning/20 text-xs font-semibold text-warning-foreground dark:text-warning">
                    {pa.allergen.code}
                  </span>
                  {pa.allergen.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Keine deklarationspflichtigen Allergene.
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Spuren anderer Allergene können nicht ausgeschlossen werden. Fragen?
            Unser Team berät Sie gern.
          </p>
        </div>
      </section>

      <ReviewList
        reviews={product.reviews}
        averageRating={product.averageRating}
        reviewCount={product.reviewCount}
      />
      <div className="-mt-4">
        <ReviewDialog
          productId={product.id}
          productName={product.name}
          trigger={
            <Button type="button" variant="gold">
              Bewertung schreiben
            </Button>
          }
        />
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="space-y-6">
          <h2 id="related-heading" className="text-2xl font-semibold">
            Passt gut dazu
          </h2>
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  );
}
