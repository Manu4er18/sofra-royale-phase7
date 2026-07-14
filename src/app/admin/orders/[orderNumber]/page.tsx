import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/components/order/order-status-timeline";
import { OrderSummaryCard } from "@/components/order/order-summary-card";
import {
  OrderStatusControls,
  RefundDialog,
  StaffNoteForm,
} from "@/components/admin/order-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin — Bestelldetails",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type AddressSnapshot = Partial<
  Record<
    | "recipientName"
    | "street"
    | "houseNumber"
    | "postalCode"
    | "city"
    | "deliveryNotes"
    | "phone",
    string
  >
>;

export default async function AdminOrderDetailPage(props: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await props.params;
  const order = await db.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      payments: true,
      refunds: true,
      deliveryZone: { select: { name: true, estimatedMinutes: true } },
      user: { select: { name: true, email: true, phone: true } },
    },
  });
  if (!order) notFound();

  const address = (order.addressSnapshot ?? null) as AddressSnapshot | null;
  const payment = order.payments[0];
  const refunded = order.refunds
    .filter((r) => r.status !== "FAILED")
    .reduce((sum, r) => sum + r.amount, 0);
  const refundable =
    payment?.status === "SUCCEEDED" || payment?.status === "PARTIALLY_REFUNDED"
      ? order.total - refunded
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/admin/orders">
            <ChevronLeft /> Alle Bestellungen
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{order.orderNumber}</h1>
          <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDateTime(order.createdAt)} ·{" "}
          {order.deliveryMethod === "DELIVERY"
            ? `Lieferung${order.deliveryZone ? ` (${order.deliveryZone.name})` : ""}`
            : order.deliveryMethod === "PICKUP"
              ? "Abholung"
              : "Vor Ort"}
          {order.scheduledFor
            ? ` · Wunschzeit ${formatDateTime(order.scheduledFor)}`
            : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status ändern</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrderStatusControls
            orderId={order.id}
            status={order.status}
            deliveryMethod={order.deliveryMethod}
          />
          {refundable > 0 ? (
            <RefundDialog orderId={order.id} maxRefundable={refundable} />
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <OrderSummaryCard order={order} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {order.statusHistory.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold"
                      aria-hidden
                    />
                    <span>
                      <span className="font-medium">
                        {ORDER_STATUS_LABEL[entry.toStatus]}
                      </span>
                      {entry.note ? (
                        <span className="text-muted-foreground">
                          {" "}
                          — {entry.note}
                        </span>
                      ) : null}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kunde</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="text-foreground">
                {order.user?.name ?? order.guestName ?? "Gast"}
              </p>
              <p>{order.user?.email ?? order.guestEmail}</p>
              <p>{order.user?.phone ?? order.guestPhone}</p>
              {order.customerNotes ? (
                <p className="mt-2 italic">„{order.customerNotes}“</p>
              ) : null}
            </CardContent>
          </Card>

          {address ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lieferadresse</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-foreground">{address.recipientName}</p>
                <p>
                  {address.street} {address.houseNumber}
                </p>
                <p>
                  {address.postalCode} {address.city}
                </p>
                <p>{address.phone}</p>
                {address.deliveryNotes ? (
                  <p className="mt-2 italic">„{address.deliveryNotes}“</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zahlung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                {payment?.provider === "STRIPE"
                  ? `Stripe ${payment.paymentMethodBrand ? `(${payment.paymentMethodBrand} •••• ${payment.paymentMethodLast4})` : ""}`
                  : payment?.provider === "CASH_ON_DELIVERY"
                    ? "Bar bei Lieferung"
                    : "Bei Abholung / vor Ort"}{" "}
                · Status: {payment?.status ?? "—"}
              </p>
              {order.refunds.length > 0 ? (
                <ul className="space-y-1">
                  {order.refunds.map((refund) => (
                    <li key={refund.id}>
                      Erstattet: {formatPrice(refund.amount)} ({refund.status})
                      {refund.reason ? ` — ${refund.reason}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team-Notiz</CardTitle>
            </CardHeader>
            <CardContent>
              <StaffNoteForm
                orderId={order.id}
                initialNote={order.staffNotes ?? ""}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
