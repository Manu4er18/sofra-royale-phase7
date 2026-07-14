import "server-only";

import type { DeliveryMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { getCartSummary, type CartSummary } from "@/lib/services/cart";
import { checkCoupon } from "@/lib/services/coupon";
import { getZoneForPostalCode, type ZoneQuote } from "@/lib/services/delivery";
import { containedVat, lineVatRate, VAT_STANDARD } from "@/lib/pricing";

/**
 * Checkout quote engine — the ONE place order totals are computed.
 * Used by the checkout UI (live preview) and by order creation, so the
 * amount the customer sees is exactly the amount that gets charged.
 *
 * German VAT model: prices are gross; taxTotal reports the contained
 * VAT (7 % food for delivery/pickup, 19 % for drinks and all dine-in).
 */

/** Category slugs taxed at the standard drink rate. */
const DRINK_CATEGORY_SLUGS = new Set(["getraenke", "kaffee-tee"]);

export type QuoteLineTax = { lineTotal: number; taxRate: number };

export type CheckoutQuote = {
  ok: boolean;
  /** Human-readable blockers (empty cart, below minimum …). */
  errors: string[];
  cart: CartSummary;
  deliveryMethod: DeliveryMethod;
  zone: ZoneQuote | null;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  couponFreeDelivery: boolean;
  deliveryFee: number;
  serviceFee: number;
  tip: number;
  taxTotal: number;
  total: number;
  lineTaxRates: Map<string, number>;
  estimatedMinutes: number;
};

export async function computeQuote(input: {
  deliveryMethod: DeliveryMethod;
  postalCode?: string | null;
  couponCode?: string | null;
  tip?: number;
  userId?: string | null;
  guestEmail?: string | null;
}): Promise<CheckoutQuote> {
  const cart = await getCartSummary();
  const errors: string[] = [];
  const tip = Math.max(0, Math.round(input.tip ?? 0));

  if (cart.lines.length === 0) {
    errors.push("Ihr Warenkorb ist leer.");
  }
  const unavailable = cart.lines.filter((l) => !l.isAvailable);
  if (unavailable.length > 0) {
    errors.push(
      `Momentan nicht verfügbar: ${unavailable.map((l) => l.name).join(", ")}. Bitte entfernen Sie diese Artikel.`,
    );
  }

  // ---- delivery zone ------------------------------------------------
  let zone: ZoneQuote | null = null;
  if (input.deliveryMethod === "DELIVERY") {
    if (!input.postalCode) {
      errors.push("Bitte geben Sie Ihre Postleitzahl an.");
    } else {
      zone = await getZoneForPostalCode(input.postalCode);
      if (!zone) {
        errors.push(
          `Leider liefern wir noch nicht an die PLZ ${input.postalCode}. Abholung ist jederzeit möglich.`,
        );
      }
    }
  }

  // ---- coupon --------------------------------------------------------
  let discount = 0;
  let couponFreeDelivery = false;
  let couponCode: string | null = null;
  if (input.couponCode && cart.lines.length > 0) {
    const check = await checkCoupon({
      code: input.couponCode,
      cart,
      userId: input.userId,
      guestEmail: input.guestEmail,
    });
    if (check.ok) {
      discount = check.discount;
      couponFreeDelivery = check.freeDelivery;
      couponCode = check.coupon.code;
    } else {
      errors.push(check.reason);
    }
  }

  const goodsAfterDiscount = Math.max(0, cart.subtotal - discount);

  // ---- minimum order & delivery fee -----------------------------------
  let deliveryFee = 0;
  if (input.deliveryMethod === "DELIVERY" && zone) {
    if (goodsAfterDiscount < zone.minOrderAmount) {
      errors.push(
        `Mindestbestellwert für ${zone.zoneName}: ${(zone.minOrderAmount / 100).toFixed(2)} €.`,
      );
    }
    const freeByThreshold =
      zone.freeDeliveryThreshold !== null &&
      goodsAfterDiscount >= zone.freeDeliveryThreshold;
    deliveryFee = couponFreeDelivery || freeByThreshold ? 0 : zone.deliveryFee;
  }

  // ---- service fee (configurable via SiteSetting, default 0) ----------
  let serviceFee = 0;
  const feeSetting = await db.siteSetting.findUnique({
    where: { key: "checkout.fees" },
  });
  if (feeSetting && typeof feeSetting.value === "object" && feeSetting.value) {
    const percent = Number(
      (feeSetting.value as Record<string, unknown>)["serviceFeePercent"] ?? 0,
    );
    if (Number.isFinite(percent) && percent > 0) {
      serviceFee = Math.round((goodsAfterDiscount * percent) / 100);
    }
  }

  // ---- contained VAT ----------------------------------------------------
  // Discount is applied proportionally across lines for tax purposes.
  const lineTaxRates = new Map<string, number>();
  let taxTotal = 0;
  if (cart.subtotal > 0) {
    const categoryRows = await db.product.findMany({
      where: { id: { in: cart.lines.map((l) => l.productId) } },
      select: { id: true, category: { select: { slug: true } } },
    });
    const drinkProduct = new Set(
      categoryRows
        .filter((r) => DRINK_CATEGORY_SLUGS.has(r.category.slug))
        .map((r) => r.id),
    );
    const discountFactor = goodsAfterDiscount / cart.subtotal;
    for (const line of cart.lines) {
      const rate = lineVatRate({
        dineIn: input.deliveryMethod === "DINE_IN",
        isDrink: drinkProduct.has(line.productId),
      });
      lineTaxRates.set(line.itemId, rate);
      const effectiveLine = line.lineTotal * discountFactor;
      taxTotal += containedVat(effectiveLine, rate);
    }
    // Delivery + service fees carry the standard-rate contained VAT.
    taxTotal += containedVat(deliveryFee + serviceFee, VAT_STANDARD);
    taxTotal = Math.round(taxTotal);
  }

  const total = goodsAfterDiscount + deliveryFee + serviceFee + tip;

  return {
    ok: errors.length === 0,
    errors,
    cart,
    deliveryMethod: input.deliveryMethod,
    zone,
    subtotal: cart.subtotal,
    discount,
    couponCode,
    couponFreeDelivery,
    deliveryFee,
    serviceFee,
    tip,
    taxTotal,
    total,
    lineTaxRates,
    estimatedMinutes:
      input.deliveryMethod === "DELIVERY" ? (zone?.estimatedMinutes ?? 45) : 25,
  };
}

/** Serializable quote for client components (Map stripped). */
export type ClientQuote = Omit<CheckoutQuote, "lineTaxRates" | "cart"> & {
  itemCount: number;
};

export function toClientQuote(quote: CheckoutQuote): ClientQuote {
  const { lineTaxRates: _ltr, cart, ...rest } = quote;
  return { ...rest, itemCount: cart.itemCount };
}
