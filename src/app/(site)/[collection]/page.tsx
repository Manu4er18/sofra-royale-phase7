import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  parseProductFilters,
  type ProductFilters,
} from "@/lib/validations/catalog";
import { getCategoryBySlug, getCuisineBySlug } from "@/lib/services/catalog";
import { ProductListing } from "@/components/menu/product-listing";

/**
 * Pretty top-level listing URLs, one dynamic route resolving in order:
 *   1. curated collections  (/offers, /popular, /new, /vegetarian …)
 *   2. cuisines             (/dubai, /turkish)
 *   3. categories           (/grill, /desserts, /kaffee-tee …)
 * Unknown slugs → 404. Static routes (/menu, /cart …) always win over
 * this dynamic segment, so no collisions are possible.
 */

type CollectionConfig = {
  title: string;
  eyebrow: string;
  description: string;
  filters: Partial<ProductFilters>;
  showTaxonomy?: boolean;
};

const COLLECTIONS: Record<string, CollectionConfig> = {
  offers: {
    title: "Aktuelle Angebote",
    eyebrow: "Sparen & genießen",
    description:
      "Rabattierte Gerichte und Tagesangebote — solange der Vorrat reicht.",
    filters: { offers: true },
  },
  popular: {
    title: "Beliebte Gerichte",
    eyebrow: "Von Gästen gewählt",
    description: "Die meistbestellten Gerichte unserer Gäste.",
    filters: { popular: true },
  },
  new: {
    title: "Neu auf der Karte",
    eyebrow: "Frisch kreiert",
    description: "Unsere neuesten Kreationen — probieren Sie zuerst.",
    filters: { isNew: true },
  },
  vegetarian: {
    title: "Vegetarische Gerichte",
    eyebrow: "Grün genießen",
    description: "Fleischfreie Vielfalt von Meze bis Dessert.",
    filters: { vegetarian: true },
  },
  vegan: {
    title: "Vegane Gerichte",
    eyebrow: "Rein pflanzlich",
    description: "Vegane Gerichte ohne Kompromisse beim Geschmack.",
    filters: { vegan: true },
  },
  halal: {
    title: "Halal-Menü",
    eyebrow: "100 % zertifiziert",
    description:
      "Unsere gesamte Küche ist halal — hier finden Sie alle Gerichte im Überblick.",
    filters: { halal: true },
  },
};

async function resolveCollection(
  slug: string,
): Promise<CollectionConfig | null> {
  const curated = COLLECTIONS[slug];
  if (curated) return curated;

  const cuisine = await getCuisineBySlug(slug);
  if (cuisine) {
    return {
      title: cuisine.name,
      eyebrow: "Küche",
      description:
        cuisine.description ?? `Alle Gerichte der Küche „${cuisine.name}“.`,
      filters: { cuisine: slug },
      showTaxonomy: false,
    };
  }

  const category = await getCategoryBySlug(slug);
  if (category) {
    return {
      title: category.name,
      eyebrow: "Kategorie",
      description:
        category.description ??
        `Alle Gerichte der Kategorie „${category.name}“.`,
      filters: { category: slug },
      showTaxonomy: false,
    };
  }

  return null;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection } = await props.params;
  const config = await resolveCollection(collection);
  if (!config) return { title: "Nicht gefunden" };
  return { title: config.title, description: config.description };
}

export default async function CollectionPage(props: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ collection }, rawSearchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const config = await resolveCollection(collection);
  if (!config) notFound();

  // Route presets always override URL params (no unfiltering a collection).
  const filters = {
    ...parseProductFilters(rawSearchParams),
    ...config.filters,
  };

  return (
    <div className="container py-10">
      <header className="mb-8 max-w-2xl">
        <p className="text-sm uppercase tracking-widest text-gold">
          {config.eyebrow}
        </p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
          {config.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{config.description}</p>
      </header>

      <ProductListing
        filters={filters}
        basePath={`/${collection}`}
        rawSearchParams={rawSearchParams}
        showTaxonomy={config.showTaxonomy ?? true}
      />
    </div>
  );
}
