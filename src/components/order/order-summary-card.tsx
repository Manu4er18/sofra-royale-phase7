import Image from "next/image";
import { ImageOff } from "lucide-react";

import type { OrderDetail } from "@/lib/services/order";
import { formatPrice } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

type Selection = { group: string; value: string; priceDelta: number };

function parseSelections(raw: unknown): Selection[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (s): s is Selection =>
      typeof s === "object" && s !== null && "group" in s && "value" in s,
  );
}

/** Itemized order summary with money breakdown — snapshot data only. */
export function OrderSummaryCard({ order }: { order: OrderDetail }) {
  return (
    <div className="rounded-lg border bg-card">
      <ul className="divide-y px-5">
        {order.items.map((item) => {
          const selections = parseSelections(item.selections);
          return (
            <li key={item.id} className="flex gap-4 py-4">
              <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageOff className="h-5 w-5" aria-hidden />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">
                    {item.quantity}× {item.productName}
                  </p>
                  <p className="shrink-0 font-medium">
                    {formatPrice(item.lineTotal)}
                  </p>
                </div>
                {item.variationName ? (
                  <p className="text-xs text-muted-foreground">
                    {item.variationName}
                  </p>
                ) : null}
                {selections.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {selections
                      .map((s) =>
                        s.group === "Extras"
                          ? `+ ${s.value}`
                          : `${s.group}: ${s.value}`,
                      )
                      .join(" · ")}
                  </p>
                ) : null}
                {item.specialInstructions ? (
                  <p className="text-xs italic text-muted-foreground">
                    „{item.specialInstructions}“
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Separator />
      <dl className="space-y-1.5 p-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Zwischensumme</dt>
          <dd>{formatPrice(order.subtotal)}</dd>
        </div>
        {order.discountTotal > 0 ? (
          <div className="flex justify-between text-success">
            <dt>Rabatt{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
            <dd>−{formatPrice(order.discountTotal)}</dd>
          </div>
        ) : null}
        {order.deliveryMethod === "DELIVERY" ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Lieferung</dt>
            <dd>
              {order.deliveryFee === 0
                ? "Gratis"
                : formatPrice(order.deliveryFee)}
            </dd>
          </div>
        ) : null}
        {order.serviceFee > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Servicegebühr</dt>
            <dd>{formatPrice(order.serviceFee)}</dd>
          </div>
        ) : null}
        {order.tipAmount > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Trinkgeld</dt>
            <dd>{formatPrice(order.tipAmount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between pt-1 text-base font-semibold">
          <dt>Gesamt</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
        <p className="text-xs text-muted-foreground">
          inkl. {formatPrice(order.taxTotal)} MwSt.
        </p>
      </dl>
    </div>
  );
}
