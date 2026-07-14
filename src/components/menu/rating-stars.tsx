import { Star, StarHalf } from "lucide-react";

import { cn } from "@/lib/utils";

/** Accessible star rating (read-only). */
export function RatingStars({
  rating,
  reviewCount,
  className,
  showCount = true,
}: {
  rating: number;
  reviewCount?: number;
  className?: string;
  showCount?: boolean;
}) {
  if (rating <= 0) {
    return showCount ? (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Noch keine Bewertungen
      </span>
    ) : null;
  }

  const full = Math.floor(rating);
  const half = rating - full >= 0.5;

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={`Bewertung: ${rating.toFixed(1)} von 5 Sternen`}
    >
      <span className="flex text-gold" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => {
          if (i < full) {
            return <Star key={i} className="h-3.5 w-3.5 fill-current" />;
          }
          if (i === full && half) {
            return (
              <span key={i} className="relative">
                <Star className="h-3.5 w-3.5 text-muted-foreground/40" />
                <StarHalf className="absolute inset-0 h-3.5 w-3.5 fill-current" />
              </span>
            );
          }
          return (
            <Star key={i} className="h-3.5 w-3.5 text-muted-foreground/40" />
          );
        })}
      </span>
      <span className="text-xs font-medium">{rating.toFixed(1)}</span>
      {showCount && reviewCount !== undefined ? (
        <span className="text-xs text-muted-foreground">({reviewCount})</span>
      ) : null}
    </span>
  );
}
