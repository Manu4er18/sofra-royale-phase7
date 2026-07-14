"use client";

import * as React from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Accessible interactive 1–5 star picker (radio group semantics). */
export function RatingInput({
  value,
  onChange,
  name = "rating",
}: {
  value: number;
  onChange: (value: number) => void;
  name?: string;
}) {
  const [hovered, setHovered] = React.useState(0);

  return (
    <div
      role="radiogroup"
      aria-label="Bewertung in Sternen"
      className="flex gap-1"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((stars) => {
        const active = (hovered || value) >= stars;
        return (
          <label key={stars} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={stars}
              checked={value === stars}
              onChange={() => onChange(stars)}
              className="sr-only"
              aria-label={`${stars} ${stars === 1 ? "Stern" : "Sterne"}`}
            />
            <Star
              onMouseEnter={() => setHovered(stars)}
              className={cn(
                "h-7 w-7 transition-colors",
                active
                  ? "fill-gold text-gold"
                  : "text-muted-foreground/40 hover:text-gold",
              )}
              aria-hidden
            />
          </label>
        );
      })}
    </div>
  );
}
