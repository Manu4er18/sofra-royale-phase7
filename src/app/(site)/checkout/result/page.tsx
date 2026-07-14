import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import { auth } from "@/lib/auth";
import { getOrderByNumber, markOrderPaid } from "@/lib/services/order";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { OrderSummaryCard } from "@/components/order/order-summary-card";
import { OrderStatusTimeline } from "@/components/order/order-status-timeline";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Bestellstatus",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/**
 * Post-checkout landing (Stripe return_url + COD confirmation).
 * If Stripe reports success before the webhook has fired, the order is
 * confirmed here as a synchronous fallback — markOrderPaid is
 * idempotent, so webhook retries are harmless.
 */
export default async function CheckoutResultPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const orderNumber = (
    typeof searchParams.order === "string" ? searchParams.order : ""
  ).toUpperCase();
  if (!orderNumber) notFound();

  let order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  // Sync fallback: check the PaymentIntent state directly.
  const payment = order.payments[0];
  if (
    order.status === "PAYMENT_PENDING" &&
    payment?.stripePaymentIntentId &&
    isStripeConfigured()
  ) {
    try {
      const intent = await getStripe().paymentIntents.retrieve(
        payment.stripePaymentIntentId,
      );
      if (intent.status === "succeeded") {
        await markOrderPaid({
          orderId: order.id,
          stripePaymentIntentId: intent.id,
        });
        order = (await getOrderByNumber(orderNumber))!;
      }
    } catch {
      // Webhook remains the source of truth if the sync check fails.
    }
  }

  const session = await auth();
  const isPaidFlow = order.payments[0]?.provider === "STRIPE";
  const succeeded =
    order.status !== "PAYMENT_PENDING" && order.status !== "CANCELLED";
  const cancelled = order.status === "CANCELLED";

  return (
    <div className="container max-w-3xl space-y-8 py-12">
      <div className="text-center">
        {succeeded ? (
          <>
            <CheckCircle2
              className="mx-auto h-14 w-14 text-success"
              aria-hidden
            />
            <h1 className="mt-4 text-3xl font-semibold">
              Vielen Dank, Ihre Bestellung ist da!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Bestellnummer <strong>{order.orderNumber}</strong>
              {isPaidFlow
                ? " — Zahlung erfolgreich."
                : " — Sie zahlen bei Übergabe."}{" "}
              {order.guestEmail || session?.user
                ? "Eine Bestätigung senden wir per E-Mail (ab Phase 6)."
                : null}
            </p>
          </>
        ) : cancelled ? (
          <>
            <XCircle
              className="mx-auto h-14 w-14 text-destructive"
              aria-hidden
            />
            <h1 className="mt-4 text-3xl font-semibold">
              Bestellung storniert
            </h1>
            <p className="mt-2 text-muted-foreground">
              {order.cancellationReason ?? "Die Zahlung wurde abgebrochen."} Ihr
              Warenkorb kann neu befüllt werden — nichts wurde belastet.
            </p>
          </>
        ) : (
          <>
            <Clock3 className="mx-auto h-14 w-14 text-warning" aria-hidden />
            <h1 className="mt-4 text-3xl font-semibold">
              Zahlung noch nicht abgeschlossen
            </h1>
            <p className="mt-2 text-muted-foreground">
              Die Zahlung für {order.orderNumber} ist noch offen oder wird
              gerade verarbeitet.
            </p>
            <Button variant="gold" className="mt-4" asChild>
              <Link href={`/checkout/payment/${order.orderNumber}`}>
                Zahlung jetzt abschließen
              </Link>
            </Button>
          </>
        )}
      </div>

      {succeeded ? (
        <OrderStatusTimeline
          status={order.status}
          deliveryMethod={order.deliveryMethod}
        />
      ) : null}

      <OrderSummaryCard order={order} />

      <div className="flex flex-wrap justify-center gap-3">
        {session?.user ? (
          <Button variant="gold" asChild>
            <Link href={`/account/orders/${order.orderNumber}`}>
              Bestellung verfolgen
            </Link>
          </Button>
        ) : (
          <Button variant="gold" asChild>
            <Link href="/track-order">Bestellung verfolgen</Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/menu">Weiter stöbern</Link>
        </Button>
      </div>
    </div>
  );
}
