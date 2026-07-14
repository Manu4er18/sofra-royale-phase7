"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { addToCart } from "@/actions/cart";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export type ConfiguratorProduct = {
  id: string;
  name: string;
  basePrice: number;
  discountPrice: number | null;
  isOrderable: boolean;
  variations: Array<{
    id: string;
    name: string;
    price: number;
    isDefault: boolean;
  }>;
  optionGroups: Array<{
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    isRequired: boolean;
    options: Array<{
      id: string;
      name: string;
      priceDelta: number;
      isDefault: boolean;
    }>;
  }>;
  addons: Array<{
    id: string;
    name: string;
    price: number;
    maxQuantity: number;
  }>;
};

/**
 * Interactive meal configurator: size/portion, options, add-ons,
 * quantity and special instructions with a live total.
 *
 * The computed price here is DISPLAY ONLY — the server recalculates
 * everything in the addToCart action from catalog data.
 */
export function ProductConfigurator({
  product,
}: {
  product: ConfiguratorProduct;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const defaultVariation =
    product.variations.find((v) => v.isDefault) ?? product.variations[0];
  const [variationId, setVariationId] = React.useState<string | undefined>(
    defaultVariation?.id,
  );

  // groupId -> selected option IDs
  const [optionSelections, setOptionSelections] = React.useState<
    Record<string, string[]>
  >(() => {
    const initial: Record<string, string[]> = {};
    for (const group of product.optionGroups) {
      const defaults = group.options
        .filter((o) => o.isDefault)
        .map((o) => o.id)
        .slice(0, group.maxSelect);
      initial[group.id] = defaults;
    }
    return initial;
  });

  // addonId -> quantity
  const [addonQuantities, setAddonQuantities] = React.useState<
    Record<string, number>
  >({});

  const [quantity, setQuantity] = React.useState(1);
  const [instructions, setInstructions] = React.useState("");

  // ------- live price (mirrors server logic in lib/services/cart) -------
  const effectiveBase =
    product.discountPrice !== null && product.discountPrice < product.basePrice
      ? product.discountPrice
      : product.basePrice;
  const variation = product.variations.find((v) => v.id === variationId);
  let unitPrice = variation ? variation.price : effectiveBase;
  for (const group of product.optionGroups) {
    for (const optionId of optionSelections[group.id] ?? []) {
      const option = group.options.find((o) => o.id === optionId);
      if (option) unitPrice += option.priceDelta;
    }
  }
  for (const addon of product.addons) {
    const qty = addonQuantities[addon.id] ?? 0;
    unitPrice += addon.price * qty;
  }
  const total = unitPrice * quantity;

  // ------- validation -------
  const missingGroups = product.optionGroups.filter((group) => {
    const count = (optionSelections[group.id] ?? []).length;
    return group.isRequired && count < Math.max(1, group.minSelect);
  });

  function toggleOption(groupId: string, optionId: string, maxSelect: number) {
    setOptionSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  function setAddonQty(addonId: string, max: number, delta: number) {
    setAddonQuantities((prev) => {
      const next = Math.max(0, Math.min(max, (prev[addonId] ?? 0) + delta));
      return { ...prev, [addonId]: next };
    });
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await addToCart({
        productId: product.id,
        variationId,
        quantity,
        selections: {
          options: Object.entries(optionSelections)
            .filter(([, ids]) => ids.length > 0)
            .map(([groupId, optionIds]) => ({ groupId, optionIds })),
          addons: Object.entries(addonQuantities)
            .filter(([, qty]) => qty > 0)
            .map(([addonId, qty]) => ({ addonId, quantity: qty })),
        },
        specialInstructions: instructions.trim() || undefined,
      });

      if (!result.success) {
        toast.error("Nicht hinzugefügt", { description: result.error });
        return;
      }

      toast.success(`${product.name} ist im Warenkorb`, {
        action: {
          label: "Zum Warenkorb",
          onClick: () => router.push("/cart"),
        },
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* -------- Variations (size / portion) -------- */}
      {product.variations.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Portion wählen</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {product.variations.map((v) => (
              <label
                key={v.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 text-sm transition-colors",
                  variationId === v.id
                    ? "border-gold bg-gold/10"
                    : "hover:bg-accent",
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="variation"
                    value={v.id}
                    checked={variationId === v.id}
                    onChange={() => setVariationId(v.id)}
                    className="accent-current"
                  />
                  {v.name}
                </span>
                <span className="font-medium">{formatPrice(v.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {/* -------- Option groups -------- */}
      {product.optionGroups.map((group) => (
        <fieldset key={group.id} className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">
            {group.name}
            {group.isRequired ? (
              <span className="ml-1 text-destructive" aria-hidden>
                *
              </span>
            ) : (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                optional
              </span>
            )}
            {group.maxSelect > 1 ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (max. {group.maxSelect})
              </span>
            ) : null}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.options.map((option) => {
              const selected = (optionSelections[group.id] ?? []).includes(
                option.id,
              );
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md border px-4 py-2.5 text-sm transition-colors",
                    selected ? "border-gold bg-gold/10" : "hover:bg-accent",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {group.maxSelect === 1 ? (
                      <input
                        type="radio"
                        name={`group-${group.id}`}
                        checked={selected}
                        onChange={() =>
                          toggleOption(group.id, option.id, group.maxSelect)
                        }
                        className="accent-current"
                      />
                    ) : (
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() =>
                          toggleOption(group.id, option.id, group.maxSelect)
                        }
                      />
                    )}
                    {option.name}
                  </span>
                  {option.priceDelta !== 0 ? (
                    <span className="text-muted-foreground">
                      {option.priceDelta > 0 ? "+" : "−"}
                      {formatPrice(Math.abs(option.priceDelta))}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* -------- Add-ons -------- */}
      {product.addons.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Extras</legend>
          <div className="space-y-2">
            {product.addons.map((addon) => {
              const qty = addonQuantities[addon.id] ?? 0;
              return (
                <div
                  key={addon.id}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-4 py-2.5 text-sm",
                    qty > 0 && "border-gold bg-gold/10",
                  )}
                >
                  <span>
                    {addon.name}
                    <span className="ml-2 text-muted-foreground">
                      +{formatPrice(addon.price)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`${addon.name} entfernen`}
                      disabled={qty === 0}
                      onClick={() =>
                        setAddonQty(addon.id, addon.maxQuantity, -1)
                      }
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-5 text-center tabular-nums">{qty}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`${addon.name} hinzufügen`}
                      disabled={qty >= addon.maxQuantity}
                      onClick={() =>
                        setAddonQty(addon.id, addon.maxQuantity, 1)
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {/* -------- Special instructions -------- */}
      <div className="space-y-2">
        <Label htmlFor="special-instructions" className="text-sm font-semibold">
          Besondere Wünsche{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <textarea
          id="special-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value.slice(0, 300))}
          rows={2}
          placeholder="z. B. ohne Zwiebeln, Sauce separat …"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <Separator />

      {/* -------- Quantity + CTA -------- */}
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="Menge"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Menge verringern"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-lg font-semibold tabular-nums">
            {quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Menge erhöhen"
            disabled={quantity >= 20}
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Button
          type="button"
          variant="gold"
          size="lg"
          className="flex-1"
          loading={isPending}
          disabled={!product.isOrderable || missingGroups.length > 0}
          onClick={handleSubmit}
        >
          <ShoppingBag />
          {product.isOrderable
            ? `In den Warenkorb — ${formatPrice(total)}`
            : "Momentan nicht verfügbar"}
        </Button>
      </div>

      {missingGroups.length > 0 && product.isOrderable ? (
        <p className="text-sm text-destructive" role="status">
          Bitte wählen Sie: {missingGroups.map((g) => g.name).join(", ")}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Preise inkl. MwSt. Der Gesamtpreis wird bei der Bestellung serverseitig
        geprüft.{" "}
        <Link href="/cart" className="underline underline-offset-4">
          Zum Warenkorb
        </Link>
      </p>
    </div>
  );
}
