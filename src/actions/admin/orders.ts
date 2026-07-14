"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole, AuthorizationError } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { ORDER_TRANSITIONS } from "@/lib/order-transitions";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { channels, trigger } from "@/lib/realtime/server";
import { absoluteUrl, notify } from "@/lib/notifications/notify";
import { orderStatusEmail } from "@/emails/templates";
import { getErrorMessage } from "@/lib/utils";

export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

const statusInputSchema = z.object({
  orderId: z.string().cuid(),
  toStatus: z.enum([
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
  ]),
  note: z.string().trim().max(300).optional(),
});

function revalidateOrderViews() {
  revalidatePath("/admin/orders", "layout");
  revalidatePath("/admin");
}

export async function updateOrderStatus(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("STAFF");
    const parsed = statusInputSchema.safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültige Eingabe." };
    const { orderId, toStatus, note } = parsed.data;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        user: { select: { email: true, name: true, phone: true } },
      },
    });
    if (!order) return { success: false, error: "Bestellung nicht gefunden." };

    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(toStatus)) {
      return {
        success: false,
        error: `Übergang ${order.status} → ${toStatus} ist nicht zulässig.`,
      };
    }
    // Method-specific guardrails.
    if (
      toStatus === "OUT_FOR_DELIVERY" &&
      order.deliveryMethod !== "DELIVERY"
    ) {
      return { success: false, error: "Keine Lieferbestellung." };
    }
    if (
      toStatus === "READY_FOR_PICKUP" &&
      order.deliveryMethod === "DELIVERY"
    ) {
      return {
        success: false,
        error: "Lieferbestellungen gehen „In Zustellung“.",
      };
    }

    await db.$transaction(async (tx) => {
      // Cancelling restocks tracked items + releases the coupon.
      if (toStatus === "CANCELLED") {
        for (const item of order.items) {
          if (!item.productId) continue;
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stockQuantity: true },
          });
          if (product && product.stockQuantity !== null) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: { increment: item.quantity },
                stockStatus: "IN_STOCK",
                isAvailable: true,
              },
            });
          }
        }
        if (order.couponId) {
          await tx.coupon.update({
            where: { id: order.couponId },
            data: { usedCount: { decrement: 1 } },
          });
        }
        const payment = order.payments[0];
        if (payment && payment.status === "PENDING") {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "CANCELLED" },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: toStatus,
          deliveredAt: toStatus === "DELIVERED" ? new Date() : undefined,
          completedAt: toStatus === "COMPLETED" ? new Date() : undefined,
          cancelledAt: toStatus === "CANCELLED" ? new Date() : undefined,
          cancellationReason:
            toStatus === "CANCELLED"
              ? (note ?? "Vom Restaurant storniert.")
              : undefined,
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus,
              note: note || null,
              changedBy: staff.id,
            },
          },
        },
      });
    });

    // ---- customer-facing dispatch (outside the transaction) -----------
    const statusLabel =
      toStatus === "CANCELLED"
        ? "Storniert"
        : toStatus === "OUT_FOR_DELIVERY"
          ? "Unterwegs zu Ihnen"
          : toStatus === "READY_FOR_PICKUP"
            ? "Abholbereit"
            : toStatus === "DELIVERED"
              ? "Zugestellt — guten Appetit!"
              : toStatus === "PREPARING"
                ? "Wird zubereitet"
                : toStatus === "COMPLETED"
                  ? "Abgeschlossen"
                  : "Bestätigt";
    const trackUrl = absoluteUrl(`/account/orders/${order.orderNumber}`);

    // Live push to anyone watching this order (customer detail / tracking).
    void trigger(channels.order(order.orderNumber), "status", {
      status: toStatus,
      statusLabel,
    });

    // In-app + email (+ SMS for out-for-delivery) to account holders.
    if (order.userId) {
      const email = order.user?.email
        ? orderStatusEmail({
            name: order.user.name ?? "Gast",
            orderNumber: order.orderNumber,
            statusLabel,
            message:
              toStatus === "CANCELLED"
                ? "Ihre Bestellung wurde storniert. Bei Fragen sind wir für Sie da."
                : `Ihre Bestellung hat einen neuen Status: ${statusLabel}.`,
            trackUrl,
          })
        : undefined;
      await notify({
        userId: order.userId,
        type: "ORDER",
        title: `Bestellung ${order.orderNumber}`,
        body: statusLabel,
        href: `/account/orders/${order.orderNumber}`,
        email: order.user?.email
          ? { to: order.user.email, subject: email!.subject, html: email!.html }
          : undefined,
        sms:
          toStatus === "OUT_FOR_DELIVERY" && order.user?.phone
            ? {
                to: order.user.phone,
                body: `Sofra Royale: Ihre Bestellung ${order.orderNumber} ist unterwegs zu Ihnen!`,
              }
            : undefined,
      });
    }

    await logAudit({
      userId: staff.id,
      action: `order.status.${toStatus.toLowerCase()}`,
      entity: "Order",
      entityId: orderId,
      changes: { from: order.status, to: toStatus, note: note ?? null },
    });

    revalidateOrderViews();
    return { success: true, message: "Status aktualisiert." };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message };
    }
    console.error("[updateOrderStatus]", getErrorMessage(error));
    return { success: false, error: "Statusänderung fehlgeschlagen." };
  }
}

export async function saveStaffNote(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("STAFF");
    const parsed = z
      .object({ orderId: z.string().cuid(), note: z.string().trim().max(1000) })
      .safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültige Eingabe." };

    await db.order.update({
      where: { id: parsed.data.orderId },
      data: { staffNotes: parsed.data.note || null },
    });
    await logAudit({
      userId: staff.id,
      action: "order.staff_note",
      entity: "Order",
      entityId: parsed.data.orderId,
    });

    revalidateOrderViews();
    return { success: true, message: "Notiz gespeichert." };
  } catch (error) {
    console.error("[saveStaffNote]", getErrorMessage(error));
    return { success: false, error: "Notiz konnte nicht gespeichert werden." };
  }
}

/** Full or partial refund via Stripe (MANAGER+). */
export async function refundOrder(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = z
      .object({
        orderId: z.string().cuid(),
        /** Cents; omit for full refund of the remaining amount. */
        amount: z.number().int().min(1).optional(),
        reason: z.string().trim().max(300).optional(),
      })
      .safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültige Eingabe." };
    const { orderId, reason } = parsed.data;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { payments: true, refunds: true },
    });
    if (!order) return { success: false, error: "Bestellung nicht gefunden." };

    const payment = order.payments.find((p) => p.status === "SUCCEEDED");
    if (!payment?.stripePaymentIntentId) {
      return {
        success: false,
        error:
          "Keine erfolgreiche Online-Zahlung vorhanden — Barzahlungen bitte direkt erstatten.",
      };
    }
    if (!isStripeConfigured()) {
      return { success: false, error: "Stripe ist nicht konfiguriert." };
    }

    const alreadyRefunded = order.refunds
      .filter((r) => r.status !== "FAILED")
      .reduce((sum, r) => sum + r.amount, 0);
    const remaining = order.total - alreadyRefunded;
    const amount = parsed.data.amount ?? remaining;
    if (amount <= 0 || amount > remaining) {
      return {
        success: false,
        error: `Erstattbar sind maximal ${(remaining / 100).toFixed(2)} €.`,
      };
    }

    const stripeRefund = await getStripe().refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount,
      reason: "requested_by_customer",
      metadata: { orderId, orderNumber: order.orderNumber },
    });

    const isFull = alreadyRefunded + amount >= order.total;
    await db.$transaction([
      db.refund.create({
        data: {
          orderId,
          paymentId: payment.id,
          amount,
          reason: reason || null,
          status: "SUCCEEDED",
          stripeRefundId: stripeRefund.id,
          processedBy: staff.id,
        },
      }),
      db.payment.update({
        where: { id: payment.id },
        data: { status: isFull ? "REFUNDED" : "PARTIALLY_REFUNDED" },
      }),
      db.order.update({
        where: { id: orderId },
        data: {
          status: isFull ? "REFUNDED" : "PARTIALLY_REFUNDED",
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: isFull ? "REFUNDED" : "PARTIALLY_REFUNDED",
              note: `${(amount / 100).toFixed(2)} € erstattet${reason ? ` — ${reason}` : ""}`,
              changedBy: staff.id,
            },
          },
        },
      }),
      ...(order.userId
        ? [
            db.notification.create({
              data: {
                userId: order.userId,
                type: "PAYMENT",
                title: "Erstattung veranlasst",
                body: `${(amount / 100).toFixed(2)} € für Bestellung ${order.orderNumber} sind auf dem Weg zurück.`,
                href: `/account/orders/${order.orderNumber}`,
              },
            }),
          ]
        : []),
    ]);

    await logAudit({
      userId: staff.id,
      action: "order.refund",
      entity: "Order",
      entityId: orderId,
      changes: {
        amount,
        reason: reason ?? null,
        stripeRefundId: stripeRefund.id,
      },
    });

    revalidateOrderViews();
    return {
      success: true,
      message: `${(amount / 100).toFixed(2)} € erstattet.`,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message };
    }
    console.error("[refundOrder]", getErrorMessage(error));
    return { success: false, error: "Erstattung fehlgeschlagen." };
  }
}
