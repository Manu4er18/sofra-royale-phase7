import "server-only";

import type { Coupon } from "@prisma/client";
import { db } from "@/lib/db";
import type { CartSummary } from "@/lib/services/cart";
import { computeCouponDiscount } from "@/lib/pricing";

/**
 * Coupon validation & discount computation.
 *
 * Every rule is enforced server-side on BOTH apply (cart) and order
 * placement (inside the transaction) — an expired/exhausted coupon can
 * never slip into a paid order.
 */

export type CouponCheck =
  | {
      ok: true;
      coupon: Coupon;
      /** Cents off the goods subtotal (0 for FREE_DELIVERY). */
      discount: number;
      freeDelivery: boolean;
    }
  | { ok: false; reason: string };

export async function getCouponByCode(code: string) {
  return db.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: {
      products: { select: { id: true } },
      categories: { select: { id: true } },
    },
  });
}

/**
 * Validate a coupon against the current cart + customer and compute
 * the discount in cents.
 */
export async function checkCoupon(input: {
  code: string;
  cart: CartSummary;
  userId?: string | null;
  guestEmail?: string | null;
}): Promise<CouponCheck> {
  const { cart, userId, guestEmail } = input;
  const coupon = await getCouponByCode(input.code);

  if (!coupon || !coupon.isActive) {
    return { ok: false, reason: "Dieser Gutscheincode ist ungültig." };
  }
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, reason: "Dieser Gutschein ist noch nicht gültig." };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { ok: false, reason: "Dieser Gutschein ist abgelaufen." };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return {
      ok: false,
      reason: "Dieser Gutschein wurde bereits vollständig eingelöst.",
    };
  }
  if (coupon.customerId && coupon.customerId !== userId) {
    return {
      ok: false,
      reason: "Dieser Gutschein ist einem anderen Konto vorbehalten.",
    };
  }
  if (coupon.minOrderAmount > 0 && cart.subtotal < coupon.minOrderAmount) {
    return {
      ok: false,
      reason: `Mindestbestellwert für diesen Gutschein: ${(
        coupon.minOrderAmount / 100
      ).toFixed(2)} €.`,
    };
  }

  // Per-user usage limit (logged-in users; guests limited per order flow).
  if (coupon.usageLimitPerUser !== null && userId) {
    const used = await db.couponUsage.count({
      where: { couponId: coupon.id, userId },
    });
    if (used >= coupon.usageLimitPerUser) {
      return {
        ok: false,
        reason: "Sie haben diesen Gutschein bereits eingelöst.",
      };
    }
  }

  // First-order-only: no prior non-cancelled orders for this identity.
  if (coupon.isFirstOrderOnly) {
    const identity = userId
      ? { userId }
      : guestEmail
        ? { guestEmail: guestEmail.toLowerCase() }
        : null;
    if (identity) {
      const previousOrders = await db.order.count({
        where: { ...identity, status: { notIn: ["CANCELLED"] } },
      });
      if (previousOrders > 0) {
        return {
          ok: false,
          reason: "Dieser Gutschein gilt nur für die erste Bestellung.",
        };
      }
    }
  }

  // Scoping: if the coupon targets products/categories, only matching
  // lines count toward the discountable amount.
  let eligibleSubtotal = cart.subtotal;
  const scopedProductIds = new Set(coupon.products.map((p) => p.id));
  const scopedCategoryIds = new Set(coupon.categories.map((c) => c.id));
  if (scopedProductIds.size > 0 || scopedCategoryIds.size > 0) {
    const productIds = cart.lines.map((l) => l.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true },
    });
    const categoryByProduct = new Map(
      products.map((p) => [p.id, p.categoryId]),
    );
    eligibleSubtotal = cart.lines
      .filter(
        (line) =>
          scopedProductIds.has(line.productId) ||
          scopedCategoryIds.has(categoryByProduct.get(line.productId) ?? ""),
      )
      .reduce((sum, line) => sum + line.lineTotal, 0);
    if (eligibleSubtotal === 0) {
      return {
        ok: false,
        reason:
          "Dieser Gutschein gilt nicht für die Artikel in Ihrem Warenkorb.",
      };
    }
  }

  const { discount, freeDelivery } = computeCouponDiscount({
    type: coupon.type,
    value: coupon.value,
    maxDiscountAmount: coupon.maxDiscountAmount,
    eligibleSubtotal,
  });

  return { ok: true, coupon, discount, freeDelivery };
}
