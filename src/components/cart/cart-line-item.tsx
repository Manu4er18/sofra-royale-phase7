"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { removeCartItem, updateCartItem } from "@/actions/cart";
import type { PricedCartLine } from "@/lib/services/cart";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** One cart line with quantity stepper and remove button. */
export function CartLineItem({ line }: { line: PricedCartLine }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function mutate(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Aktion fehlgeschlagen.");
      }
      router.refresh();
    });
  }

  return (
    <div
      className="flex gap-4 py-5"
      data-pending={isPending ? "" : undefined}
      aria-busy={isPending}
    >
      <Link
        href={`/menu/${line.slug}`}
        className="relative h-24 w-28 shrink-0 overflow-hidden rounded-md bg-muted"
        aria-label={`${line.name} ansehen`}
      >
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.imageAlt}
            fill
            sizes="112px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-6 w-6" aria-hidden />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/menu/${line.slug}`}
            className="font-display text-base font-semibold hover:underline"
          >
            {line.name}
          </Link>
          <span className="shrink-0 font-semibold">
            {formatPrice(line.lineTotal)}
          </span>
        </div>

        {line.variationName ? (
          <p className="text-xs text-muted-foreground">{line.variationName}</p>
        ) : null}
        {line.selections.length > 0 ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {line.selections
              .map((s) =>
                s.group === "Extras"
                  ? `+ ${s.value}`
                  : `${s.group}: ${s.value}`,
              )
              .join(" · ")}
          </p>
        ) : null}
        {line.specialInstructions ? (
          <p className="text-xs italic text-muted-foreground">
            „{line.specialInstructions}“
          </p>
        ) : null}
        {!line.isAvailable ? (
          <Badge variant="destructive" className="w-fit">
            Momentan nicht verfügbar
          </Badge>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div
            className="flex items-center gap-1.5"
            role="group"
            aria-label={`Menge für ${line.name}`}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Menge verringern"
              disabled={isPending || line.quantity <= 1}
              onClick={() =>
                mutate(() =>
                  updateCartItem({
                    itemId: line.itemId,
                    quantity: line.quantity - 1,
                  }),
                )
              }
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-7 text-center text-sm font-medium tabular-nums">
              {line.quantity}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Menge erhöhen"
              disabled={isPending || line.quantity >= 20}
              onClick={() =>
                mutate(() =>
                  updateCartItem({
                    itemId: line.itemId,
                    quantity: line.quantity + 1,
                  }),
                )
              }
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <span className="ml-2 text-xs text-muted-foreground">
              à {formatPrice(line.unitPrice)}
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => mutate(() => removeCartItem(line.itemId))}
          >
            <Trash2 /> Entfernen
          </Button>
        </div>
      </div>
    </div>
  );
}
