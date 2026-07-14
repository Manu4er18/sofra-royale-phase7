import { cn, formatPrice } from "@/lib/utils";

/** Price display with strikethrough original when discounted. */
export function Price({
  basePrice,
  discountPrice,
  className,
}: {
  basePrice: number;
  discountPrice?: number | null;
  className?: string;
}) {
  const hasDiscount = discountPrice != null && discountPrice < basePrice;
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={cn("font-semibold", hasDiscount && "text-destructive")}>
        {formatPrice(hasDiscount ? discountPrice : basePrice)}
      </span>
      {hasDiscount ? (
        <s className="text-sm font-normal text-muted-foreground">
          {formatPrice(basePrice)}
        </s>
      ) : null}
    </span>
  );
}
