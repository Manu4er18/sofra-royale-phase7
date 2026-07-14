"use client";

import * as React from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";

import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Stripe PaymentElement wrapper. Supports cards plus Apple Pay /
 * Google Pay automatically (automatic_payment_methods on the intent).
 * The publishable key is the ONLY Stripe key that ever reaches the
 * client.
 */
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function PaymentForm({
  orderNumber,
  amount,
  returnUrl,
}: {
  orderNumber: string;
  amount: number;
  returnUrl: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    // Only reached on immediate failure — success redirects away.
    if (error) {
      toast.error("Zahlung fehlgeschlagen", {
        description: error.message ?? "Bitte prüfen Sie Ihre Zahlungsdaten.",
      });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: "tabs" }} aria-label="Zahlungsdaten" />
      <Button
        type="submit"
        variant="gold"
        size="lg"
        className="w-full"
        loading={submitting}
        disabled={!stripe || !elements}
      >
        {formatPrice(amount)} sicher bezahlen
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Bestellung {orderNumber} · Zahlung verschlüsselt über Stripe.
        Kartendaten erreichen niemals unsere Server.
      </p>
    </form>
  );
}

export function StripePaymentForm({
  clientSecret,
  orderNumber,
  amount,
  returnUrl,
}: {
  clientSecret: string;
  orderNumber: string;
  amount: number;
  returnUrl: string;
}) {
  if (!stripePromise) {
    return (
      <p className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
        Online-Zahlung ist nicht konfiguriert
        (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY fehlt).
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#b8860b",
            borderRadius: "8px",
          },
        },
        locale: "de",
      }}
    >
      <PaymentForm
        orderNumber={orderNumber}
        amount={amount}
        returnUrl={returnUrl}
      />
    </Elements>
  );
}
