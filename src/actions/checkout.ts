"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validations/checkout";
import {
  computeQuote,
  toClientQuote,
  type ClientQuote,
} from "@/lib/services/checkout";
import { getAppliedCouponCode, getOrCreateCart } from "@/lib/services/cart";
import { createOrder, OrderError } from "@/lib/services/order";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { absoluteUrl, notify } from "@/lib/notifications/notify";
import { orderConfirmationEmail } from "@/emails/templates";
import { getErrorMessage, formatPrice } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Live quote for the checkout UI
// ---------------------------------------------------------------------------

const quoteRequestSchema = z.object({
  deliveryMethod: z.enum(["DELIVERY", "PICKUP", "DINE_IN"]),
  postalCode: z.string().trim().max(10).optional(),
  tip: z.number().int().min(0).max(50_000).optional(),
});

export type QuoteResult =
  | { success: true; quote: ClientQuote }
  | { success: false; error: string };

/** Recompute totals server-side for the review step. */
export async function getCheckoutQuote(
  rawInput: unknown,
): Promise<QuoteResult> {
  try {
    const parsed = quoteRequestSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: "Ungültige Anfrage." };
    }
    const session = await auth();
    const couponCode = await getAppliedCouponCode();

    const quote = await computeQuote({
      deliveryMethod: parsed.data.deliveryMethod,
      postalCode: parsed.data.postalCode ?? null,
      couponCode,
      tip: parsed.data.tip ?? 0,
      userId: session?.user?.id ?? null,
    });
    return { success: true, quote: toClientQuote(quote) };
  } catch (error) {
    console.error("[getCheckoutQuote]", getErrorMessage(error));
    return {
      success: false,
      error: "Die Summen konnten nicht berechnet werden.",
    };
  }
}

// ---------------------------------------------------------------------------
// Place order
// ---------------------------------------------------------------------------

export type PlaceOrderResult =
  | {
      success: true;
      orderNumber: string;
      requiresPayment: boolean;
      clientSecret?: string;
    }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function placeOrder(rawInput: unknown): Promise<PlaceOrderResult> {
  try {
    const parsed = checkoutSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Bitte überprüfen Sie Ihre Angaben.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }
    const input = parsed.data;
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // Rate limit: 5 orders / 10 min per identity.
    if (
      !checkRateLimit(`order:${userId ?? input.contact.email}`, 5, 10 * 60_000)
    ) {
      return {
        success: false,
        error: "Zu viele Bestellversuche — bitte kurz warten.",
      };
    }

    if (input.paymentProvider === "STRIPE" && !isStripeConfigured()) {
      return {
        success: false,
        error:
          "Online-Zahlung ist derzeit nicht verfügbar. Bitte wählen Sie Barzahlung.",
      };
    }

    // ---- resolve delivery address --------------------------------------
    let addressSnapshot: Record<string, string> | null = null;
    let addressId: string | null = null;
    let postalCode: string | null = null;

    if (input.deliveryMethod === "DELIVERY") {
      if (input.addressId) {
        if (!userId) {
          return { success: false, error: "Bitte melden Sie sich an." };
        }
        const saved = await db.address.findFirst({
          where: { id: input.addressId, userId },
        });
        if (!saved) {
          return { success: false, error: "Adresse nicht gefunden." };
        }
        addressId = saved.id;
        postalCode = saved.postalCode;
        addressSnapshot = {
          recipientName: saved.recipientName,
          street: saved.street,
          houseNumber: saved.houseNumber,
          addressLine2: saved.addressLine2 ?? "",
          postalCode: saved.postalCode,
          city: saved.city,
          deliveryNotes: saved.deliveryNotes ?? "",
          phone: saved.phone,
        };
      } else if (input.address) {
        postalCode = input.address.postalCode;
        addressSnapshot = {
          recipientName: input.address.recipientName,
          street: input.address.street,
          houseNumber: input.address.houseNumber,
          addressLine2: input.address.addressLine2 ?? "",
          postalCode: input.address.postalCode,
          city: input.address.city,
          deliveryNotes: input.address.deliveryNotes ?? "",
          phone: input.contact.phone,
        };
        if (userId && input.saveAddress) {
          const created = await db.address.create({
            data: {
              userId,
              recipientName: input.address.recipientName,
              street: input.address.street,
              houseNumber: input.address.houseNumber,
              addressLine2: input.address.addressLine2 ?? null,
              postalCode: input.address.postalCode,
              city: input.address.city,
              deliveryNotes: input.address.deliveryNotes ?? null,
              phone: input.contact.phone,
            },
          });
          addressId = created.id;
        }
      }
    }

    // ---- authoritative quote -------------------------------------------
    const couponCode = await getAppliedCouponCode();
    const quote = await computeQuote({
      deliveryMethod: input.deliveryMethod,
      postalCode,
      couponCode,
      tip: input.tip,
      userId,
      guestEmail: userId ? null : input.contact.email,
    });
    if (!quote.ok) {
      return {
        success: false,
        error: quote.errors[0] ?? "Die Bestellung ist nicht möglich.",
      };
    }

    // ---- transactional creation ------------------------------------------
    const order = await createOrder({
      input,
      quote,
      userId,
      addressSnapshot,
      addressId,
    });

    // Un-pin the coupon from the (now empty) cart.
    const cart = await getOrCreateCart();
    await db.cart.update({
      where: { id: cart.id },
      data: { couponId: null },
    });

    // ---- Stripe PaymentIntent --------------------------------------------
    if (input.paymentProvider === "STRIPE") {
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.create({
        amount: order.total,
        currency: "eur",
        automatic_payment_methods: { enabled: true },
        receipt_email: userId
          ? (session?.user?.email ?? undefined)
          : input.contact.email,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
      });
      const payment = order.payments[0];
      if (payment) {
        await db.payment.update({
          where: { id: payment.id },
          data: { stripePaymentIntentId: intent.id },
        });
      }
      revalidatePath("/", "layout");
      return {
        success: true,
        orderNumber: order.orderNumber,
        requiresPayment: true,
        clientSecret: intent.client_secret ?? undefined,
      };
    }

    // COD / pay-at-pickup: order is already CONFIRMED → send the
    // confirmation now (prepaid orders get theirs from markOrderPaid).
    if (userId) {
      const email = session?.user?.email
        ? orderConfirmationEmail({
            name: session.user.name ?? "Gast",
            orderNumber: order.orderNumber,
            total: formatPrice(order.total),
            trackUrl: absoluteUrl(`/account/orders/${order.orderNumber}`),
            isPrepaid: false,
          })
        : undefined;
      await notify({
        userId,
        type: "ORDER",
        title: "Bestellung bestätigt",
        body: `Ihre Bestellung ${order.orderNumber} ist bei uns eingegangen.`,
        href: `/account/orders/${order.orderNumber}`,
        email:
          session?.user?.email && email
            ? {
                to: session.user.email,
                subject: email.subject,
                html: email.html,
              }
            : undefined,
      });
    }

    revalidatePath("/", "layout");
    return {
      success: true,
      orderNumber: order.orderNumber,
      requiresPayment: false,
    };
  } catch (error) {
    if (error instanceof OrderError) {
      return { success: false, error: error.message };
    }
    console.error("[placeOrder]", getErrorMessage(error));
    return {
      success: false,
      error: "Die Bestellung konnte nicht abgeschlossen werden.",
    };
  }
}
