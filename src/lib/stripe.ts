import "server-only";

import Stripe from "stripe";

/**
 * Stripe server client (lazy singleton).
 * The secret key must NEVER be imported into client code — this module
 * is guarded by `server-only`.
 */
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY ist nicht gesetzt — siehe README (Stripe Setup).",
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2025-08-27.basil",
      appInfo: { name: "Sofra Royale", version: "0.1.0" },
    });
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
}
