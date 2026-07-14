"use client";

import { ArrowUpDown } from "lucide-react";

import { useFilterParams } from "@/hooks/use-filter-params";
import type { ProductSort } from "@/lib/validations/catalog";

const SORT_LABELS: Record<ProductSort, string> = {
  relevance: "Relevanz",
  popular: "Beliebtheit",
  rating: "Beste Bewertung",
  newest: "Neuheiten zuerst",
  "price-asc": "Preis aufsteigend",
  "price-desc": "Preis absteigend",
};

/** Sort dropdown driven by the `sort` URL param. */
export function SortSelect() {
  const { searchParams, setParams } = useFilterParams();
  const current = (searchParams.get("sort") ?? "relevance") as ProductSort;

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span className="sr-only">Sortieren nach</span>
      <select
        value={current}
        onChange={(e) =>
          setParams({
            sort: e.target.value === "relevance" ? null : e.target.value,
          })
        }
        className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
