"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requireRole, AuthorizationError } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import {
  adminCouponSchema,
  adminFaqSchema,
  adminZoneSchema,
  contactSettingsSchema,
  heroSettingsSchema,
  hoursSettingsSchema,
} from "@/lib/validations/admin";
import { getErrorMessage } from "@/lib/utils";

export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

const toCents = (euros: number) => Math.round(euros * 100);

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export async function upsertCoupon(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = adminCouponSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Bitte Eingaben überprüfen.",
      };
    }
    const input = parsed.data;

    const codeTaken = await db.coupon.findFirst({
      where: { code: input.code, id: { not: input.id ?? "" } },
      select: { id: true },
    });
    if (codeTaken) {
      return { success: false, error: "Dieser Code ist bereits vergeben." };
    }

    // PERCENTAGE stores the raw percent; FIXED_AMOUNT stores cents.
    const value =
      input.type === "FIXED_AMOUNT"
        ? toCents(input.value)
        : input.type === "PERCENTAGE"
          ? Math.round(input.value)
          : 0;

    const data = {
      code: input.code,
      description: input.description || null,
      type: input.type,
      value,
      minOrderAmount: toCents(input.minOrderAmount),
      maxDiscountAmount:
        input.maxDiscountAmount != null && input.maxDiscountAmount > 0
          ? toCents(input.maxDiscountAmount)
          : null,
      usageLimit: input.usageLimit ?? null,
      usageLimitPerUser: input.usageLimitPerUser ?? null,
      isFirstOrderOnly: input.isFirstOrderOnly,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: input.isActive,
    };

    const coupon = input.id
      ? await db.coupon.update({ where: { id: input.id }, data })
      : await db.coupon.create({ data });

    await logAudit({
      userId: staff.id,
      action: input.id ? "coupon.updated" : "coupon.created",
      entity: "Coupon",
      entityId: coupon.id,
      changes: { code: input.code },
    });

    revalidatePath("/admin/coupons");
    return { success: true, message: "Gutschein gespeichert." };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[upsertCoupon]", getErrorMessage(error));
    return { success: false, error: "Speichern fehlgeschlagen." };
  }
}

export async function toggleCouponActive(
  rawId: unknown,
): Promise<AdminActionResult> {
  try {
    await requireRole("MANAGER");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success) return { success: false, error: "Ungültig." };
    const coupon = await db.coupon.findUnique({ where: { id: parsed.data } });
    if (!coupon) return { success: false, error: "Gutschein nicht gefunden." };
    await db.coupon.update({
      where: { id: coupon.id },
      data: { isActive: !coupon.isActive },
    });
    revalidatePath("/admin/coupons");
    return {
      success: true,
      message: coupon.isActive ? "Deaktiviert." : "Aktiviert.",
    };
  } catch (error) {
    console.error("[toggleCouponActive]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

export async function deleteCoupon(rawId: unknown): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success) return { success: false, error: "Ungültig." };
    const usage = await db.couponUsage.count({
      where: { couponId: parsed.data },
    });
    if (usage > 0) {
      // Preserve reporting integrity — deactivate instead of hard delete.
      await db.coupon.update({
        where: { id: parsed.data },
        data: { isActive: false },
      });
      await logAudit({
        userId: staff.id,
        action: "coupon.deactivated",
        entity: "Coupon",
        entityId: parsed.data,
      });
      revalidatePath("/admin/coupons");
      return {
        success: true,
        message: "Bereits genutzt — daher nur deaktiviert (Reporting bleibt).",
      };
    }
    await db.coupon.delete({ where: { id: parsed.data } });
    await logAudit({
      userId: staff.id,
      action: "coupon.deleted",
      entity: "Coupon",
      entityId: parsed.data,
    });
    revalidatePath("/admin/coupons");
    return { success: true, message: "Gutschein gelöscht." };
  } catch (error) {
    console.error("[deleteCoupon]", getErrorMessage(error));
    return { success: false, error: "Löschen fehlgeschlagen." };
  }
}

// ---------------------------------------------------------------------------
// Delivery zones
// ---------------------------------------------------------------------------

export async function upsertZone(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = adminZoneSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Bitte Eingaben überprüfen.",
      };
    }
    const input = parsed.data;

    const data = {
      name: input.name,
      postalCodes: input.postalCodes,
      deliveryFee: toCents(input.deliveryFee),
      minOrderAmount: toCents(input.minOrderAmount),
      freeDeliveryThreshold:
        input.freeDeliveryThreshold != null && input.freeDeliveryThreshold > 0
          ? toCents(input.freeDeliveryThreshold)
          : null,
      estimatedMinutes: input.estimatedMinutes,
      isActive: input.isActive,
    };

    const zone = input.id
      ? await db.deliveryZone.update({ where: { id: input.id }, data })
      : await db.deliveryZone.create({ data });

    await logAudit({
      userId: staff.id,
      action: input.id ? "zone.updated" : "zone.created",
      entity: "DeliveryZone",
      entityId: zone.id,
      changes: { name: input.name, codes: input.postalCodes.length },
    });

    revalidatePath("/admin/zones");
    return { success: true, message: "Liefergebiet gespeichert." };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[upsertZone]", getErrorMessage(error));
    return { success: false, error: "Speichern fehlgeschlagen." };
  }
}

export async function deleteZone(rawId: unknown): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success) return { success: false, error: "Ungültig." };
    await db.deliveryZone.delete({ where: { id: parsed.data } });
    await logAudit({
      userId: staff.id,
      action: "zone.deleted",
      entity: "DeliveryZone",
      entityId: parsed.data,
    });
    revalidatePath("/admin/zones");
    return { success: true, message: "Liefergebiet gelöscht." };
  } catch (error) {
    console.error("[deleteZone]", getErrorMessage(error));
    return { success: false, error: "Löschen fehlgeschlagen." };
  }
}

// ---------------------------------------------------------------------------
// CMS: site settings
// ---------------------------------------------------------------------------

async function saveSetting(
  key: string,
  value: Prisma.InputJsonValue,
  userId: string,
) {
  await db.siteSetting.upsert({
    where: { key },
    create: { key, value, updatedBy: userId },
    update: { value, updatedBy: userId },
  });
  await logAudit({
    userId,
    action: "setting.updated",
    entity: "SiteSetting",
    entityId: key,
  });
}

export async function saveContactSettings(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = contactSettingsSchema.safeParse(rawInput);
    if (!parsed.success)
      return { success: false, error: "Bitte Eingaben überprüfen." };
    await saveSetting("restaurant.contact", parsed.data, staff.id);
    revalidatePath("/", "layout");
    return { success: true, message: "Kontaktdaten gespeichert." };
  } catch (error) {
    console.error("[saveContactSettings]", getErrorMessage(error));
    return { success: false, error: "Speichern fehlgeschlagen." };
  }
}

export async function saveHeroSettings(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = heroSettingsSchema.safeParse(rawInput);
    if (!parsed.success)
      return { success: false, error: "Bitte Eingaben überprüfen." };
    await saveSetting("homepage.hero", parsed.data, staff.id);
    revalidatePath("/", "layout");
    return { success: true, message: "Hero-Bereich gespeichert." };
  } catch (error) {
    console.error("[saveHeroSettings]", getErrorMessage(error));
    return { success: false, error: "Speichern fehlgeschlagen." };
  }
}

export async function saveHoursSettings(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = hoursSettingsSchema.safeParse(rawInput);
    if (!parsed.success)
      return { success: false, error: "Bitte Eingaben überprüfen." };
    await saveSetting("restaurant.hoursText", parsed.data, staff.id);
    revalidatePath("/", "layout");
    return { success: true, message: "Öffnungszeiten gespeichert." };
  } catch (error) {
    console.error("[saveHoursSettings]", getErrorMessage(error));
    return { success: false, error: "Speichern fehlgeschlagen." };
  }
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

export async function upsertFaq(rawInput: unknown): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = adminFaqSchema.safeParse(rawInput);
    if (!parsed.success)
      return { success: false, error: "Bitte Eingaben überprüfen." };
    const input = parsed.data;

    if (input.id) {
      await db.faq.update({
        where: { id: input.id },
        data: {
          question: input.question,
          answer: input.answer,
          category: input.category || null,
          isVisible: input.isVisible,
        },
      });
    } else {
      const count = await db.faq.count();
      await db.faq.create({
        data: {
          question: input.question,
          answer: input.answer,
          category: input.category || null,
          isVisible: input.isVisible,
          sortOrder: count,
        },
      });
    }
    await logAudit({
      userId: staff.id,
      action: input.id ? "faq.updated" : "faq.created",
      entity: "Faq",
      entityId: input.id ?? null,
    });
    revalidatePath("/", "layout");
    return { success: true, message: "FAQ gespeichert." };
  } catch (error) {
    console.error("[upsertFaq]", getErrorMessage(error));
    return { success: false, error: "Speichern fehlgeschlagen." };
  }
}

export async function deleteFaq(rawId: unknown): Promise<AdminActionResult> {
  try {
    await requireRole("MANAGER");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success) return { success: false, error: "Ungültig." };
    await db.faq.delete({ where: { id: parsed.data } });
    revalidatePath("/", "layout");
    return { success: true, message: "FAQ gelöscht." };
  } catch (error) {
    console.error("[deleteFaq]", getErrorMessage(error));
    return { success: false, error: "Löschen fehlgeschlagen." };
  }
}
