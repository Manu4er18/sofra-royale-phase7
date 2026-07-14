import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderForUser } from "@/lib/services/order";
import { ReviewDialog } from "@/components/account/review-dialog";
import { OrderLiveStatus } from "@/components/order/order-live-status";
import {
  ORDER_STATUS_LABEL,
  OrderStatusTimeline,
} from "@/components/order/order-status-timeline";
import { OrderSummaryCard } from "@/components/order/order-summary-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Bestelldetails",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const METHOD_LABEL = {
  DELIVERY: "Lieferung",
  PICKUP: "Abholung",
  DINE_IN: "Vor Ort",
} as const;

type AddressSnapshot = Partial<
  Record<
    | "recipientName"
    | "street"
    | "houseNumber"
    | "addressLine2"
    | "postalCode"
    | "city"
    | "deliveryNotes"
    | "phone",
    string
  >
>;

export default async function OrderDetailPage(props: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await props.params;
  const session = await auth();
  if (!session?.user) return null; // layout guard

  const order = await getOrderForUser(
    orderNumber.toUpperCase(),
    session.user.id,
  );
  if (!order) notFound();

  const address = (order.addressSnapshot ?? null) as AddressSnapshot | null;
  const payment = order.payments[0];

  // Review CTAs for completed orders — skip already-reviewed products.
  const canReview =
    order.status === "DELIVERED" || order.status === "COMPLETED";
  const reviewableItems = canReview
    ? order.items.filter((item) => item.productId !== null)
    : [];
  const existingReviews = canReview
    ? await db.review.findMany({
        where: {
          userId: session.user.id,
          productId: {
            in: reviewableItems.map((i) => i.productId!),
          },
        },
        select: { productId: true },
      })
    : [];
  const reviewedProductIds = new Set(existingReviews.map((r) => r.productId));

  return (
    <div className="space-y-8">
      <OrderLiveStatus orderNumber={order.orderNumber} />
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/account/orders">
            <ChevronLeft /> Alle Bestellungen
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{order.orderNumber}</h1>
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
        <p className="mt-1 text-sm text-muted-foreground">
          Bestellt am {formatDateTime(order.createdAt)} ·{" "}
          {METHOD_LABEL[order.deliveryMethod]}
          {order.estimatedReadyAt && order.status !== "CANCELLED"
            ? ` · voraussichtlich ${formatDateTime(order.estimatedReadyAt)}`
            : ""}
        </p>
      </div>

      <OrderStatusTimeline
        status={order.status}
        deliveryMethod={order.deliveryMethod}
      />

      {canReview && reviewableItems.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wie hat es geschmeckt?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {reviewableItems.map((item) =>
              reviewedProductIds.has(item.productId!) ? (
                <Button key={item.id} variant="outline" size="sm" asChild>
                  <Link href="/account/reviews">
                    „{item.productName}“ bewertet ✓
                  </Link>
                </Button>
              ) : (
                <ReviewDialog
                  key={item.id}
                  productId={item.productId!}
                  productName={item.productName}
                  orderId={order.id}
                  trigger={
                    <Button variant="gold" size="sm">
                      <Star /> „{item.productName}“ bewerten
                    </Button>
                  }
                />
              ),
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <OrderSummaryCard order={order} />

        <div className="space-y-6">
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
                {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
                <p>
                  {address.postalCode} {address.city}
                </p>
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
            <CardContent className="text-sm text-muted-foreground">
              <p>
                {payment?.provider === "STRIPE"
                  ? `Online-Zahlung${payment.paymentMethodBrand ? ` (${payment.paymentMethodBrand} •••• ${payment.paymentMethodLast4})` : ""}`
                  : payment?.provider === "CASH_ON_DELIVERY"
                    ? "Barzahlung bei Lieferung"
                    : "Bezahlung bei Abholung / vor Ort"}
              </p>
              {order.customerNotes ? (
                <p className="mt-3">
                  <span className="font-medium text-foreground">
                    Ihre Anmerkung:
                  </span>{" "}
                  {order.customerNotes}
                </p>
              ) : null}
            </CardContent>
          </Card>

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
      </div>
    </div>
  );
}
