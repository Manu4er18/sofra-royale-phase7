"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";

export type LoyaltyActionResult =
  | { success: true; couponCode: string; value: number }
  | { success: false; error: string };

type LoyaltyRules = {
  pointsPerEuro: number;
  /** Points per 1 € of redemption value. */
  redeemRate: number;
  minRedeem: number;
  expiryMonths: number;
};

const DEFAULT_RULES: LoyaltyRules = {
  pointsPerEuro: 1,
  redeemRate: 100,
  minRedeem: 200,
  expiryMonths: 12,
};

export async function getLoyaltyRules(): Promise<LoyaltyRules> {
  const setting = await db.siteSetting.findUnique({
    where: { key: "loyalty.rules" },
  });
  if (setting && typeof setting.value === "object" && setting.value) {
    const v = setting.value as Record<string, unknown>;
    return {
      pointsPerEuro: Number(v.pointsPerEuro) || DEFAULT_RULES.pointsPerEuro,
      redeemRate: Number(v.redeemRate) || DEFAULT_RULES.redeemRate,
      minRedeem: Number(v.minRedeem) || DEFAULT_RULES.minRedeem,
      expiryMonths: Number(v.expiryMonths) || DEFAULT_RULES.expiryMonths,
    };
  }
  return DEFAULT_RULES;
}

/**
 * Redeem loyalty points into a personal fixed-amount coupon.
 * Atomic: the balance check + deduction run in one transaction with a
 * conditional update, so double-submits can't overdraw.
 */
export async function redeemPoints(
  rawInput: unknown,
): Promise<LoyaltyActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Bitte melden Sie sich an." };
    }
    const userId = session.user.id;

    const rules = await getLoyaltyRules();
    const parsed = z
      .number()
      .int()
      .min(rules.minRedeem)
      .max(100_000)
      .multipleOf(rules.redeemRate)
      .safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: `Einlösbar ab ${rules.minRedeem} Punkten, in Schritten von ${rules.redeemRate}.`,
      };
    }
    const points = parsed.data;
    // redeemRate points = 1 € → value in cents:
    const valueCents = Math.round((points / rules.redeemRate) * 100);

    const account = await db.loyaltyAccount.findUnique({ where: { userId } });
    if (!account || account.balance < points) {
      return { success: false, error: "Nicht genügend Punkte." };
    }

    const code = `TREUE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + rules.expiryMonths);

    const result = await db.$transaction(async (tx) => {
      // Conditional decrement — fails silently if balance changed.
      const updated = await tx.loyaltyAccount.updateMany({
        where: { id: account.id, balance: { gte: points } },
        data: { balance: { decrement: points } },
      });
      if (updated.count === 0) {
        throw new Error("Nicht genügend Punkte.");
      }
      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: "REDEEM",
          points: -points,
          note: `Eingelöst gegen Gutschein ${code}`,
        },
      });
      const coupon = await tx.coupon.create({
        data: {
          code,
          description: `Treuepunkte-Gutschein (${points} Punkte)`,
          type: "FIXED_AMOUNT",
          value: valueCents,
          customerId: userId,
          usageLimit: 1,
          usageLimitPerUser: 1,
          expiresAt,
          isActive: true,
        },
      });
      await tx.notification.create({
        data: {
          userId,
          type: "PROMOTION",
          title: "Gutschein erstellt",
          body: `Ihr Treuepunkte-Gutschein ${code} über ${(valueCents / 100).toFixed(2)} € ist bereit.`,
          href: "/account/loyalty",
        },
      });
      return coupon;
    });

    revalidatePath("/account/loyalty");
    return { success: true, couponCode: result.code, value: valueCents };
  } catch (error) {
    console.error("[redeemPoints]", getErrorMessage(error));
    return { success: false, error: getErrorMessage(error) };
  }
}
