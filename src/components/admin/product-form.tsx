"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { suggestSlug, upsertProduct } from "@/actions/admin/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  cuisineId: string;
  basePrice: string;
  discountPrice: string;
  calories: string;
  preparationTime: string;
  portionSize: string;
  spiceLevel: string;
  status: string;
  stockQuantity: string;
  lowStockThreshold: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  isNew: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isHalal: boolean;
  isChefRecommendation: boolean;
  isDailySpecial: boolean;
  metaTitle: string;
  metaDescription: string;
};

type Taxonomy = { id: string; name: string };

const FLAGS: Array<{ key: keyof ProductFormValues; label: string }> = [
  { key: "isAvailable", label: "Verfügbar" },
  { key: "isFeatured", label: "Empfohlen (Startseite)" },
  { key: "isPopular", label: "Beliebt" },
  { key: "isNew", label: "Neu" },
  { key: "isChefRecommendation", label: "Chef-Empfehlung" },
  { key: "isDailySpecial", label: "Tagesangebot" },
  { key: "isVegetarian", label: "Vegetarisch" },
  { key: "isVegan", label: "Vegan" },
  { key: "isGlutenFree", label: "Glutenfrei" },
  { key: "isHalal", label: "Halal" },
];

/** Create/edit form for a product's core data (client, server-validated). */
export function ProductForm({
  initial,
  categories,
  cuisines,
}: {
  initial: ProductFormValues;
  categories: Taxonomy[];
  cuisines: Taxonomy[];
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [isPending, startTransition] = React.useTransition();
  const isNew = !initial.id;

  function set<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function autoSlug() {
    if (!form.name || form.slug) return;
    const { slug } = await suggestSlug(form.name);
    if (slug) set("slug", slug);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertProduct({
        id: form.id,
        name: form.name,
        slug: form.slug,
        shortDescription: form.shortDescription,
        description: form.description,
        categoryId: form.categoryId,
        cuisineId: form.cuisineId,
        basePrice: form.basePrice,
        discountPrice: form.discountPrice === "" ? null : form.discountPrice,
        calories: form.calories === "" ? null : form.calories,
        preparationTime: form.preparationTime,
        portionSize: form.portionSize,
        spiceLevel: form.spiceLevel,
        status: form.status,
        stockQuantity: form.stockQuantity === "" ? null : form.stockQuantity,
        lowStockThreshold: form.lowStockThreshold,
        isAvailable: form.isAvailable,
        isFeatured: form.isFeatured,
        isPopular: form.isPopular,
        isNew: form.isNew,
        isVegetarian: form.isVegetarian,
        isVegan: form.isVegan,
        isGlutenFree: form.isGlutenFree,
        isHalal: form.isHalal,
        isChefRecommendation: form.isChefRecommendation,
        isDailySpecial: form.isDailySpecial,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      if (isNew && result.id) {
        router.push(`/admin/menu/${result.id}`);
      }
      router.refresh();
    });
  }

  const selectClass =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grunddaten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Name</Label>
            <Input
              id="p-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              onBlur={autoSlug}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-slug">Slug (URL)</Label>
            <Input
              id="p-slug"
              required
              value={form.slug}
              onChange={(e) =>
                set(
                  "slug",
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-category">Kategorie</Label>
            <select
              id="p-category"
              required
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                Wählen …
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-cuisine">Küche</Label>
            <select
              id="p-cuisine"
              required
              value={form.cuisineId}
              onChange={(e) => set("cuisineId", e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                Wählen …
              </option>
              {cuisines.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="p-short">Kurzbeschreibung (Karte)</Label>
            <Input
              id="p-short"
              required
              maxLength={200}
              value={form.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="p-desc">Beschreibung (Detailseite)</Label>
            <textarea
              id="p-desc"
              required
              rows={4}
              maxLength={5000}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preis, Küche & Bestand</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-price">Grundpreis (€)</Label>
            <Input
              id="p-price"
              required
              inputMode="decimal"
              value={form.basePrice}
              onChange={(e) => set("basePrice", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-discount">Angebotspreis (€, optional)</Label>
            <Input
              id="p-discount"
              inputMode="decimal"
              value={form.discountPrice}
              onChange={(e) => set("discountPrice", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-status">Status</Label>
            <select
              id="p-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className={selectClass}
            >
              <option value="DRAFT">Entwurf</option>
              <option value="PUBLISHED">Veröffentlicht</option>
              <option value="ARCHIVED">Archiviert</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-prep">Zubereitung (Min.)</Label>
            <Input
              id="p-prep"
              inputMode="numeric"
              value={form.preparationTime}
              onChange={(e) => set("preparationTime", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-cal">Kalorien (kcal, optional)</Label>
            <Input
              id="p-cal"
              inputMode="numeric"
              value={form.calories}
              onChange={(e) => set("calories", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-portion">Portion (z. B. 450 g)</Label>
            <Input
              id="p-portion"
              value={form.portionSize}
              onChange={(e) => set("portionSize", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-spice">Schärfegrad</Label>
            <select
              id="p-spice"
              value={form.spiceLevel}
              onChange={(e) => set("spiceLevel", e.target.value)}
              className={selectClass}
            >
              <option value="NONE">Nicht scharf</option>
              <option value="MILD">Mild</option>
              <option value="MEDIUM">Mittel</option>
              <option value="HOT">Scharf</option>
              <option value="EXTRA_HOT">Sehr scharf</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-stock">Bestand (leer = unbegrenzt)</Label>
            <Input
              id="p-stock"
              inputMode="numeric"
              value={form.stockQuantity}
              onChange={(e) => set("stockQuantity", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-lowstock">Warnschwelle</Label>
            <Input
              id="p-lowstock"
              inputMode="numeric"
              value={form.lowStockThreshold}
              onChange={(e) => set("lowStockThreshold", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kennzeichnungen</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FLAGS.map((flag) => (
            <label key={flag.key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form[flag.key] as boolean}
                onCheckedChange={(c) =>
                  set(
                    flag.key,
                    (c === true) as ProductFormValues[typeof flag.key],
                  )
                }
              />
              {flag.label}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO (optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-meta-title">Meta-Titel</Label>
            <Input
              id="p-meta-title"
              maxLength={120}
              value={form.metaTitle}
              onChange={(e) => set("metaTitle", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-meta-desc">Meta-Beschreibung</Label>
            <Input
              id="p-meta-desc"
              maxLength={200}
              value={form.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" variant="gold" size="lg" loading={isPending}>
        {isNew ? "Gericht erstellen" : "Änderungen speichern"}
      </Button>
    </form>
  );
}
