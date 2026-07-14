"use client";

import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { useFilterParams } from "@/hooks/use-filter-params";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type TaxonomyOption = { slug: string; name: string };

const FLAG_FILTERS: Array<{ key: string; label: string }> = [
  { key: "vegetarian", label: "Vegetarisch" },
  { key: "vegan", label: "Vegan" },
  { key: "glutenFree", label: "Glutenfrei" },
  { key: "halal", label: "Halal" },
  { key: "spicy", label: "Scharf" },
  { key: "mild", label: "Mild" },
  { key: "offers", label: "Im Angebot" },
  { key: "isNew", label: "Neuheiten" },
  { key: "popular", label: "Beliebt" },
  { key: "available", label: "Sofort verfügbar" },
];

const RATING_OPTIONS = [4, 3] as const;

function FilterControls({
  categories,
  cuisines,
  showTaxonomy,
}: {
  categories: TaxonomyOption[];
  cuisines: TaxonomyOption[];
  showTaxonomy: boolean;
}) {
  const { searchParams, setParams, toggleFlag, clearAll, isPending } =
    useFilterParams();

  const [minPrice, setMinPrice] = React.useState(searchParams.get("min") ?? "");
  const [maxPrice, setMaxPrice] = React.useState(searchParams.get("max") ?? "");

  // Keep local price inputs in sync when the URL changes externally.
  React.useEffect(() => {
    setMinPrice(searchParams.get("min") ?? "");
    setMaxPrice(searchParams.get("max") ?? "");
  }, [searchParams]);

  const activeCount =
    FLAG_FILTERS.filter((f) => searchParams.get(f.key)).length +
    ["category", "cuisine", "min", "max", "rating"].filter((k) =>
      searchParams.get(k),
    ).length;

  return (
    <div
      className="space-y-6"
      data-pending={isPending ? "" : undefined}
      aria-busy={isPending}
    >
      {showTaxonomy ? (
        <>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Küche</legend>
            {cuisines.map((cuisine) => {
              const checked = searchParams.get("cuisine") === cuisine.slug;
              return (
                <div key={cuisine.slug} className="flex items-center gap-2">
                  <Checkbox
                    id={`cuisine-${cuisine.slug}`}
                    checked={checked}
                    onCheckedChange={() =>
                      setParams({ cuisine: checked ? null : cuisine.slug })
                    }
                  />
                  <Label
                    htmlFor={`cuisine-${cuisine.slug}`}
                    className="cursor-pointer font-normal"
                  >
                    {cuisine.name}
                  </Label>
                </div>
              );
            })}
          </fieldset>
          <Separator />
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Kategorie</legend>
            {categories.map((category) => {
              const checked = searchParams.get("category") === category.slug;
              return (
                <div key={category.slug} className="flex items-center gap-2">
                  <Checkbox
                    id={`category-${category.slug}`}
                    checked={checked}
                    onCheckedChange={() =>
                      setParams({ category: checked ? null : category.slug })
                    }
                  />
                  <Label
                    htmlFor={`category-${category.slug}`}
                    className="cursor-pointer font-normal"
                  >
                    {category.name}
                  </Label>
                </div>
              );
            })}
          </fieldset>
          <Separator />
        </>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Preis (€)</legend>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Min."
            aria-label="Mindestpreis in Euro"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="h-9"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Max."
            aria-label="Höchstpreis in Euro"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-9"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setParams({ min: minPrice || null, max: maxPrice || null })
          }
        >
          Preis anwenden
        </Button>
      </fieldset>

      <Separator />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Bewertung</legend>
        {RATING_OPTIONS.map((stars) => {
          const checked = searchParams.get("rating") === String(stars);
          return (
            <div key={stars} className="flex items-center gap-2">
              <Checkbox
                id={`rating-${stars}`}
                checked={checked}
                onCheckedChange={() =>
                  setParams({ rating: checked ? null : String(stars) })
                }
              />
              <Label
                htmlFor={`rating-${stars}`}
                className="cursor-pointer font-normal"
              >
                Ab {stars} Sternen
              </Label>
            </div>
          );
        })}
      </fieldset>

      <Separator />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Eigenschaften</legend>
        {FLAG_FILTERS.map((filter) => (
          <div key={filter.key} className="flex items-center gap-2">
            <Checkbox
              id={`flag-${filter.key}`}
              checked={!!searchParams.get(filter.key)}
              onCheckedChange={() => toggleFlag(filter.key)}
            />
            <Label
              htmlFor={`flag-${filter.key}`}
              className="cursor-pointer font-normal"
            >
              {filter.label}
            </Label>
          </div>
        ))}
      </fieldset>

      {activeCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-destructive hover:text-destructive"
        >
          <X /> Alle Filter zurücksetzen ({activeCount})
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Filters: sidebar on desktop, sheet on mobile.
 * `showTaxonomy` is false on cuisine/category landing pages where that
 * dimension is fixed by the route.
 */
export function FilterPanel({
  categories,
  cuisines,
  showTaxonomy = true,
}: {
  categories: TaxonomyOption[];
  cuisines: TaxonomyOption[];
  showTaxonomy?: boolean;
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filter">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
          <FilterControls
            categories={categories}
            cuisines={cuisines}
            showTaxonomy={showTaxonomy}
          />
        </div>
      </aside>

      {/* Mobile sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal /> Filter
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterControls
                categories={categories}
                cuisines={cuisines}
                showTaxonomy={showTaxonomy}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
