import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";

import { trackOrderSchema } from "@/lib/validations/checkout";
import { getOrderForGuest } from "@/lib/services/order";
import {
  ORDER_STATUS_LABEL,
  OrderStatusTimeline,
} from "@/components/order/order-status-timeline";
import { OrderSummaryCard } from "@/components/order/order-summary-card";
import { OrderLiveStatus } from "@/components/order/order-live-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Bestellung verfolgen",
  description:
    "Verfolgen Sie Ihre Sofra-Royale-Bestellung mit Bestellnummer und E-Mail-Adresse.",
};

export const dynamic = "force-dynamic";

/**
 * Guest order tracking via GET form (shareable, works without JS).
 * Requires BOTH the order number and the matching e-mail — order
 * numbers alone are guessable and must not leak order contents.
 */
export default async function TrackOrderPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const raw = {
    orderNumber:
      typeof searchParams.number === "string" ? searchParams.number : "",
    email: typeof searchParams.email === "string" ? searchParams.email : "",
  };
  const hasQuery = raw.orderNumber !== "" || raw.email !== "";
  const parsed = trackOrderSchema.safeParse(raw);

  const order = parsed.success
    ? await getOrderForGuest(parsed.data.orderNumber, parsed.data.email)
    : null;

  return (
    <div className="container max-w-3xl space-y-10 py-12">
      <header className="text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
          <PackageSearch className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-3xl font-semibold">Bestellung verfolgen</h1>
        <p className="mt-2 text-muted-foreground">
          Geben Sie Ihre Bestellnummer und die E-Mail-Adresse der Bestellung
          ein.
        </p>
      </header>

      <form
        method="get"
        className="mx-auto grid max-w-lg gap-4 rounded-lg border bg-card p-6 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div className="space-y-1.5">
          <Label htmlFor="track-number">Bestellnummer</Label>
          <Input
            id="track-number"
            name="number"
            placeholder="SR-2026-000123"
            defaultValue={raw.orderNumber}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="track-email">E-Mail</Label>
          <Input
            id="track-email"
            name="email"
            type="email"
            placeholder="ihre@email.de"
            defaultValue={raw.email}
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="gold" className="w-full sm:w-auto">
            Suchen
          </Button>
        </div>
      </form>

      {hasQuery && !parsed.success ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {parsed.error.issues[0]?.message ?? "Ungültige Eingabe."}
        </p>
      ) : null}

      {hasQuery && parsed.success && !order ? (
        <p className="text-center text-sm text-muted-foreground" role="status">
          Keine Bestellung gefunden. Bitte prüfen Sie Bestellnummer und
          E-Mail-Adresse.
        </p>
      ) : null}

      {order ? (
        <div className="space-y-6">
          <OrderLiveStatus orderNumber={order.orderNumber} />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <h2 className="text-xl font-semibold">{order.orderNumber}</h2>
            <Badge
              variant={
                order.status === "CANCELLED"
                  ? "destructive"
                  : order.status === "COMPLETED" || order.status === "DELIVERED"
                    ? "success"
                    : "secondary"
              }
            >
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
          </div>
          <OrderStatusTimeline
            status={order.status}
            deliveryMethod={order.deliveryMethod}
          />
          <OrderSummaryCard order={order} />
        </div>
      ) : null}
    </div>
  );
}
