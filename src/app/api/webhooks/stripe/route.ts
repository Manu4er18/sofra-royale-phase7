import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import {
  cancelUnpaidOrder,
  markOrderPaid,
  markPaymentFailed,
} from "@/lib/services/order";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the single source of truth for payment state.
 *
 * Security: the raw body signature is verified with the webhook secret;
 * unverifiable events are rejected. Handlers are idempotent (Stripe
 * retries deliveries).
 *
 * Local development:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("[stripe-webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const orderId = intent.metadata.orderId;
        if (orderId) {
          const charge =
            typeof intent.latest_charge === "string"
              ? await getStripe().charges.retrieve(intent.latest_charge)
              : intent.latest_charge;
          await markOrderPaid({
            orderId,
            stripePaymentIntentId: intent.id,
            stripeChargeId: charge?.id ?? null,
            paymentMethodBrand:
              charge?.payment_method_details?.card?.brand ?? null,
            paymentMethodLast4:
              charge?.payment_method_details?.card?.last4 ?? null,
          });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        const orderId = intent.metadata.orderId;
        if (orderId) {
          await markPaymentFailed({
            orderId,
            reason:
              intent.last_payment_error?.message ?? "Zahlung fehlgeschlagen",
          });
        }
        break;
      }
      case "payment_intent.canceled": {
        const intent = event.data.object;
        const orderId = intent.metadata.orderId;
        if (orderId) {
          await cancelUnpaidOrder(orderId, "Zahlung abgebrochen.");
        }
        break;
      }
      default:
        // Unhandled event types are acknowledged (200) so Stripe stops retrying.
        break;
    }
  } catch (error) {
    console.error(`[stripe-webhook] handler failed for ${event.type}`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
