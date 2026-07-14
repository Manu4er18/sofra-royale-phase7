import Image from "next/image";
import Link from "next/link";
import { Clock3, ImageOff } from "lucide-react";

import type { ProductCardData } from "@/lib/services/catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Price } from "@/components/menu/price";
import { RatingStars } from "@/components/menu/rating-stars";
import { DietaryBadges, StatusBadges } from "@/components/menu/product-badges";

/** Menu grid card — links to the product detail page. */
export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-premium-lg">
      <Link
        href={`/menu/${product.slug}`}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${product.name} — Details ansehen`}
      >
        <div className="relative h-52 overflow-hidden bg-muted">
          {image ? (
            <Image
              src={image.url}
              alt={image.altText}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-8 w-8" aria-hidden />
            </span>
          )}
          <div className="absolute left-3 top-3">
            <StatusBadges product={product} />
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg font-semibold leading-snug">
              {product.name}
            </h3>
            <Price
              basePrice={product.basePrice}
              discountPrice={product.discountPrice}
              className="shrink-0"
            />
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">
            {product.shortDescription}
          </p>

          <div className="mt-auto space-y-2 pt-2">
            <DietaryBadges product={product} />
            <div className="flex items-center justify-between">
              <RatingStars
                rating={product.averageRating}
                reviewCount={product.reviewCount}
              />
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" aria-hidden />
                {product.preparationTime} Min.
              </span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
