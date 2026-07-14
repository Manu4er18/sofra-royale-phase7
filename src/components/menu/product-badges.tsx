import { Flame, Leaf, Sprout, WheatOff } from "lucide-react";

import type { ProductCardData } from "@/lib/services/catalog";
import { Badge } from "@/components/ui/badge";

/** Status badges (top-left corner of cards / detail header). */
export function StatusBadges({
  product,
}: {
  product: Pick<
    ProductCardData,
    | "isNew"
    | "isPopular"
    | "isChefRecommendation"
    | "isDailySpecial"
    | "basePrice"
    | "discountPrice"
    | "isAvailable"
    | "stockStatus"
  >;
}) {
  const soldOut =
    !product.isAvailable || product.stockStatus === "OUT_OF_STOCK";
  const discountPercent =
    product.discountPrice != null && product.discountPrice < product.basePrice
      ? Math.round(100 - (product.discountPrice / product.basePrice) * 100)
      : null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {soldOut ? <Badge variant="destructive">Ausverkauft</Badge> : null}
      {discountPercent ? (
        <Badge variant="destructive">−{discountPercent} %</Badge>
      ) : null}
      {product.isNew ? <Badge variant="gold">Neu</Badge> : null}
      {product.isPopular ? <Badge>Beliebt</Badge> : null}
      {product.isChefRecommendation ? (
        <Badge variant="secondary">Chef-Empfehlung</Badge>
      ) : null}
      {product.isDailySpecial ? (
        <Badge variant="success">Tagesangebot</Badge>
      ) : null}
    </div>
  );
}

/** Dietary + spice icons row. */
export function DietaryBadges({
  product,
  className,
}: {
  product: Pick<
    ProductCardData,
    "isVegetarian" | "isVegan" | "isGlutenFree" | "isHalal" | "spiceLevel"
  >;
  className?: string;
}) {
  const spicy =
    product.spiceLevel === "HOT" || product.spiceLevel === "EXTRA_HOT";
  const items: Array<{ icon: typeof Leaf; label: string }> = [];

  if (product.isVegan) items.push({ icon: Sprout, label: "Vegan" });
  else if (product.isVegetarian)
    items.push({ icon: Leaf, label: "Vegetarisch" });
  if (product.isGlutenFree) items.push({ icon: WheatOff, label: "Glutenfrei" });
  if (spicy) items.push({ icon: Flame, label: "Scharf" });

  if (items.length === 0 && !product.isHalal) return null;

  return (
    <div className={className}>
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {product.isHalal ? (
          <span className="rounded-full border border-success/40 px-2 py-0.5 font-medium text-success">
            Halal
          </span>
        ) : null}
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <item.icon className="h-3.5 w-3.5" aria-hidden />
            {item.label}
          </span>
        ))}
      </span>
    </div>
  );
}
