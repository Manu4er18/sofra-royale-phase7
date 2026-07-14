"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

import { db } from "@/lib/db";
import {
  requireRole,
  AuthorizationError,
  hasMinimumRole,
} from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications/notify";
import { reservationConfirmedEmail } from "@/emails/templates";
import { getErrorMessage } from "@/lib/utils";

export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

async function recomputeAggregates(productId: string) {
  const agg = await db.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });
  await db.product.update({
    where: { id: productId },
    data: { averageRating: agg._avg.rating ?? 0, reviewCount: agg._count },
  });
}

export async function moderateReview(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("STAFF");
    const parsed = z
      .object({
        reviewId: z.string().cuid(),
        status: z.enum(["APPROVED", "REJECTED", "HIDDEN", "PENDING"]),
      })
      .safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültige Eingabe." };

    const review = await db.review.findUnique({
      where: { id: parsed.data.reviewId },
    });
    if (!review) return { success: false, error: "Bewertung nicht gefunden." };

    await db.review.update({
      where: { id: review.id },
      data: { status: parsed.data.status },
    });
    await recomputeAggregates(review.productId);

    if (parsed.data.status === "APPROVED") {
      await db.notification.create({
        data: {
          userId: review.userId,
          type: "SYSTEM",
          title: "Bewertung veröffentlicht",
          body: "Vielen Dank! Ihre Bewertung ist jetzt online.",
          href: "/account/reviews",
        },
      });
    }
    await logAudit({
      userId: staff.id,
      action: `review.${parsed.data.status.toLowerCase()}`,
      entity: "Review",
      entityId: review.id,
    });

    revalidatePath("/admin/reviews");
    revalidatePath("/", "layout");
    return { success: true, message: "Bewertung aktualisiert." };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[moderateReview]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

export async function replyToReview(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("STAFF");
    const parsed = z
      .object({
        reviewId: z.string().cuid(),
        body: z.string().trim().min(2).max(2000),
      })
      .safeParse(rawInput);
    if (!parsed.success)
      return { success: false, error: "Antwort erforderlich." };

    const review = await db.review.findUnique({
      where: { id: parsed.data.reviewId },
    });
    if (!review) return { success: false, error: "Bewertung nicht gefunden." };

    await db.reviewReply.create({
      data: {
        reviewId: review.id,
        authorId: staff.id,
        body: parsed.data.body,
      },
    });
    await db.notification.create({
      data: {
        userId: review.userId,
        type: "SYSTEM",
        title: "Antwort auf Ihre Bewertung",
        body: "Das Sofra-Royale-Team hat auf Ihre Bewertung geantwortet.",
        href: "/account/reviews",
      },
    });
    await logAudit({
      userId: staff.id,
      action: "review.replied",
      entity: "Review",
      entityId: review.id,
    });

    revalidatePath("/admin/reviews");
    revalidatePath("/", "layout");
    return { success: true, message: "Antwort veröffentlicht." };
  } catch (error) {
    console.error("[replyToReview]", getErrorMessage(error));
    return { success: false, error: "Antwort fehlgeschlagen." };
  }
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

export async function updateReservationStatus(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("STAFF");
    const parsed = z
      .object({
        reservationId: z.string().cuid(),
        status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
        tableId: z.string().cuid().optional(),
        staffNotes: z.string().trim().max(500).optional(),
      })
      .safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültige Eingabe." };

    const reservation = await db.reservation.findUnique({
      where: { id: parsed.data.reservationId },
    });
    if (!reservation)
      return { success: false, error: "Reservierung nicht gefunden." };

    await db.reservation.update({
      where: { id: reservation.id },
      data: {
        status: parsed.data.status,
        tableId: parsed.data.tableId ?? reservation.tableId,
        staffNotes: parsed.data.staffNotes ?? reservation.staffNotes,
      },
    });

    if (reservation.userId && parsed.data.status === "CONFIRMED") {
      const dateLabel = `${reservation.date.toLocaleDateString("de-DE")} um ${reservation.timeSlot} Uhr`;
      const account = await db.user.findUnique({
        where: { id: reservation.userId },
        select: { email: true, name: true },
      });
      const email = account?.email
        ? reservationConfirmedEmail({
            name: account.name ?? reservation.name,
            dateLabel,
            guests: reservation.guests,
          })
        : undefined;
      await notify({
        userId: reservation.userId,
        type: "RESERVATION",
        title: "Reservierung bestätigt",
        body: `Ihr Tisch am ${dateLabel} ist bestätigt. Wir freuen uns!`,
        href: "/account/reservations",
        email:
          account?.email && email
            ? { to: account.email, subject: email.subject, html: email.html }
            : undefined,
      });
    }
    if (reservation.userId && parsed.data.status === "CANCELLED") {
      await notify({
        userId: reservation.userId,
        type: "RESERVATION",
        title: "Reservierung storniert",
        body: "Ihre Reservierung wurde storniert. Bei Fragen rufen Sie uns gern an.",
        href: "/account/reservations",
      });
    }
    await logAudit({
      userId: staff.id,
      action: `reservation.${parsed.data.status.toLowerCase()}`,
      entity: "Reservation",
      entityId: reservation.id,
    });

    revalidatePath("/admin/reservations");
    revalidatePath("/", "layout");
    return { success: true, message: "Reservierung aktualisiert." };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[updateReservationStatus]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

export async function addBlackoutDate(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().trim().max(120).optional(),
      })
      .safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültiges Datum." };

    const date = new Date(`${parsed.data.date}T00:00:00`);
    await db.reservationBlackout.upsert({
      where: { date },
      create: { date, reason: parsed.data.reason || null },
      update: { reason: parsed.data.reason || null },
    });
    await logAudit({
      userId: staff.id,
      action: "reservation.blackout_added",
      entity: "ReservationBlackout",
      changes: { date: parsed.data.date },
    });

    revalidatePath("/admin/reservations");
    return { success: true, message: "Sperrtag gespeichert." };
  } catch (error) {
    console.error("[addBlackoutDate]", getErrorMessage(error));
    return {
      success: false,
      error: "Sperrtag konnte nicht gespeichert werden.",
    };
  }
}

export async function removeBlackoutDate(
  rawId: unknown,
): Promise<AdminActionResult> {
  try {
    await requireRole("MANAGER");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success) return { success: false, error: "Ungültig." };
    await db.reservationBlackout.delete({ where: { id: parsed.data } });
    revalidatePath("/admin/reservations");
    return { success: true, message: "Sperrtag entfernt." };
  } catch (error) {
    console.error("[removeBlackoutDate]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

// ---------------------------------------------------------------------------
// Customers / staff
// ---------------------------------------------------------------------------

export async function toggleCustomerActive(
  rawId: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success) return { success: false, error: "Ungültiger Kunde." };

    const target = await db.user.findUnique({ where: { id: parsed.data } });
    if (!target) return { success: false, error: "Konto nicht gefunden." };
    // Never lock out equal/higher roles.
    if (hasMinimumRole(target.role, staff.role) && target.id !== staff.id) {
      return {
        success: false,
        error:
          "Konten mit gleicher oder höherer Rolle können Sie nicht sperren.",
      };
    }
    if (target.id === staff.id) {
      return {
        success: false,
        error: "Sie können Ihr eigenes Konto nicht sperren.",
      };
    }

    await db.user.update({
      where: { id: target.id },
      data: { isActive: !target.isActive },
    });
    await logAudit({
      userId: staff.id,
      action: target.isActive ? "user.deactivated" : "user.activated",
      entity: "User",
      entityId: target.id,
    });

    revalidatePath("/admin/customers");
    return {
      success: true,
      message: target.isActive ? "Konto gesperrt." : "Konto entsperrt.",
    };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[toggleCustomerActive]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

/** Change a user's role — SUPER_ADMIN only, cannot create another super-admin above self. */
export async function changeUserRole(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("SUPER_ADMIN");
    const parsed = z
      .object({
        userId: z.string().cuid(),
        role: z.enum(["CUSTOMER", "STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN"]),
      })
      .safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültige Eingabe." };

    if (parsed.data.userId === staff.id) {
      return {
        success: false,
        error: "Ihre eigene Rolle können Sie hier nicht ändern.",
      };
    }
    const target = await db.user.findUnique({
      where: { id: parsed.data.userId },
    });
    if (!target) return { success: false, error: "Konto nicht gefunden." };

    await db.user.update({
      where: { id: target.id },
      data: { role: parsed.data.role as UserRole },
    });
    await logAudit({
      userId: staff.id,
      action: "user.role_changed",
      entity: "User",
      entityId: target.id,
      changes: { from: target.role, to: parsed.data.role },
    });

    revalidatePath("/admin/customers");
    return { success: true, message: "Rolle geändert." };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[changeUserRole]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}
