import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { siteConfig } from "@/config/site";
import { getOrderByNumber } from "@/lib/services/order";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { formatPrice } from "@/lib/utils";
import { StripePaymentForm } from "@/components/checkout/stripe-payment-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Bezahlen",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/**
 * Stripe Elements payment page. The client secret is fetched
 * server-side from the PaymentIntent stored on the order — it never
 * travels through URLs.
 */
export default async function PaymentPage(props: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await props.params;
  const order = await getOrderByNumber(orderNumber.toUpperCase());
  if (!order) notFound();

  // Already handled? Send to the result page instead of double-charging.
  if (order.status !== "PAYMENT_PENDING") {
    redirect(`/checkout/result?order=${order.orderNumber}`);
  }
  if (!isStripeConfigured()) {
    redirect(`/checkout/result?order=${order.orderNumber}&issue=config`);
  }

  const payment = order.payments[0];
  if (!payment?.stripePaymentIntentId) {
    redirect(
      `/checkout/result?order=${order.orderNumber}&issue=missing-intent`,
    );
  }

  const intent = await getStripe().paymentIntents.retrieve(
    payment.stripePaymentIntentId,
  );
  if (intent.status === "succeeded") {
    redirect(`/checkout/result?order=${order.orderNumber}`);
  }
  if (!intent.client_secret) {
    redirect(
      `/checkout/result?order=${order.orderNumber}&issue=missing-intent`,
    );
  }

  const returnUrl = `${siteConfig.url}/checkout/result?order=${order.orderNumber}`;

  return (
    <div className="container max-w-xl py-12">
      <Card>
        <CardHeader className="text-center">
          <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <CardTitle className="text-2xl">Sichere Zahlung</CardTitle>
          <CardDescription>
            Bestellung {order.orderNumber} ·{" "}
            {order.items.reduce((n, i) => n + i.quantity, 0)} Artikel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="space-y-1.5 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <dt className="text-muted-foreground">
                  {item.quantity}× {item.productName}
                </dt>
                <dd>{formatPrice(item.lineTotal)}</dd>
              </div>
            ))}
            <Separator className="my-2" />
            {order.deliveryFee > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Lieferung</dt>
                <dd>{formatPrice(order.deliveryFee)}</dd>
              </div>
            ) : null}
            {order.discountTotal > 0 ? (
              <div className="flex justify-between text-success">
                <dt>Rabatt</dt>
                <dd>−{formatPrice(order.discountTotal)}</dd>
              </div>
            ) : null}
            {order.tipAmount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Trinkgeld</dt>
                <dd>{formatPrice(order.tipAmount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-semibold">
              <dt>Gesamt</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </dl>

          <StripePaymentForm
            clientSecret={intent.client_secret!}
            orderNumber={order.orderNumber}
            amount={order.total}
            returnUrl={returnUrl}
          />

          <p className="text-center text-sm">
            <Link
              href="/cart"
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Abbrechen und zurück
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
