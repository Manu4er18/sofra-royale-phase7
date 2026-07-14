"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { couponCodeSchema } from "@/lib/validations/checkout";
import { getCartSummary, getOrCreateCart } from "@/lib/services/cart";
import { checkCoupon } from "@/lib/services/coupon";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getErrorMessage } from "@/lib/utils";

export type CouponActionResult =
  | { success: true; code: string; discount: number; freeDelivery: boolean }
  | { success: false; error: string };

/**
 * Validate a coupon against the current cart and pin it to the cart.
 * Rate-limited to stop brute-forcing codes.
 */
export async function applyCoupon(
  rawInput: unknown,
): Promise<CouponActionResult> {
  try {
    const parsed = couponCodeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: "Bitte einen gültigen Code eingeben." };
    }

    const session = await auth();
    const limiterKey = `coupon:${session?.user?.id ?? "guest"}`;
    if (!checkRateLimit(limiterKey, 10, 10 * 60_000)) {
      return {
        success: false,
        error: "Zu viele Versuche — bitte kurz warten.",
      };
    }

    const cart = await getCartSummary();
    if (cart.lines.length === 0) {
      return { success: false, error: "Ihr Warenkorb ist leer." };
    }

    const check = await checkCoupon({
      code: parsed.data.code,
      cart,
      userId: session?.user?.id ?? null,
    });
    if (!check.ok) {
      return { success: false, error: check.reason };
    }

    const cartRow = await getOrCreateCart();
    await db.cart.update({
      where: { id: cartRow.id },
      data: { couponId: check.coupon.id },
    });

    revalidatePath("/", "layout");
    return {
      success: true,
      code: check.coupon.code,
      discount: check.discount,
      freeDelivery: check.freeDelivery,
    };
  } catch (error) {
    console.error("[applyCoupon]", getErrorMessage(error));
    return { success: false, error: "Gutschein konnte nicht geprüft werden." };
  }
}

export async function removeCoupon(): Promise<CouponActionResult> {
  try {
    const cartRow = await getOrCreateCart();
    await db.cart.update({
      where: { id: cartRow.id },
      data: { couponId: null },
    });
    revalidatePath("/", "layout");
    return { success: true, code: "", discount: 0, freeDelivery: false };
  } catch (error) {
    console.error("[removeCoupon]", getErrorMessage(error));
    return { success: false, error: "Gutschein konnte nicht entfernt werden." };
  }
}
