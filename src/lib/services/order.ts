import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CheckoutQuote } from "@/lib/services/checkout";
import type { CheckoutInput } from "@/lib/validations/checkout";
import { channels, trigger } from "@/lib/realtime/server";
import { absoluteUrl, notify } from "@/lib/notifications/notify";
import { orderConfirmationEmail } from "@/emails/templates";
import { formatPrice } from "@/lib/utils";
import {
  formatOrderNumber,
  loyaltyPointsFor as computeLoyaltyPoints,
} from "@/lib/pricing";

/**
 * Order service — transactional order lifecycle.
 *
 * Creation runs in ONE transaction: stock is re-checked and decremented,
 * coupon limits are enforced atomically, items are snapshotted, status
 * history and the payment row are written together. Any failure rolls
 * everything back.
 */

export class OrderError extends Error {}

// ---------------------------------------------------------------------------
// Order number: SR-<year>-<6 digits>, unique with retry.
// ---------------------------------------------------------------------------

function candidateOrderNumber(): string {
  return formatOrderNumber(
    new Date().getFullYear(),
    Math.floor(Math.random() * 1_000_000),
  );
}

async function generateOrderNumber(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = candidateOrderNumber();
    const exists = await tx.order.findUnique({ where: { orderNumber } });
    if (!exists) return orderNumber;
  }
  throw new OrderError("Bestellnummer konnte nicht erzeugt werden.");
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export async function createOrder(params: {
  input: CheckoutInput;
  quote: CheckoutQuote;
  userId: string | null;
  addressSnapshot: Record<string, string> | null;
  addressId: string | null;
}) {
  const { input, quote, userId, addressSnapshot, addressId } = params;

  if (!quote.ok || quote.cart.lines.length === 0) {
    throw new OrderError(
      quote.errors[0] ?? "Die Bestellung kann nicht erstellt werden.",
    );
  }

  return db.$transaction(async (tx) => {
    // ---- stock: verify + decrement atomically -------------------------
    for (const line of quote.cart.lines) {
      const product = await tx.product.findUnique({
        where: { id: line.productId },
        select: {
          id: true,
          isAvailable: true,
          stockStatus: true,
          stockQuantity: true,
          lowStockThreshold: true,
          name: true,
        },
      });
      if (
        !product ||
        !product.isAvailable ||
        product.stockStatus === "OUT_OF_STOCK"
      ) {
        throw new OrderError(`„${line.name}“ ist leider nicht mehr verfügbar.`);
      }
      if (product.stockQuantity !== null) {
        if (product.stockQuantity < line.quantity) {
          throw new OrderError(
            `„${line.name}“ ist nur noch ${product.stockQuantity}× verfügbar.`,
          );
        }
        const remaining = product.stockQuantity - line.quantity;
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: remaining,
            stockStatus:
              remaining <= 0
                ? "OUT_OF_STOCK"
                : remaining <= product.lowStockThreshold
                  ? "LOW_STOCK"
                  : "IN_STOCK",
            isAvailable: remaining > 0,
          },
        });
      }
    }

    // ---- coupon: atomic usage increment --------------------------------
    let couponId: string | null = null;
    if (quote.couponCode) {
      const coupon = await tx.coupon.findUnique({
        where: { code: quote.couponCode },
      });
      if (!coupon || !coupon.isActive) {
        throw new OrderError("Der Gutschein ist nicht mehr gültig.");
      }
      const claimed = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          OR: [
            { usageLimit: null },
            { usedCount: { lt: coupon.usageLimit ?? 0 } },
          ],
        },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count === 0) {
        throw new OrderError(
          "Der Gutschein wurde soeben vollständig eingelöst.",
        );
      }
      couponId = coupon.id;
    }

    // ---- order + items ----------------------------------------------------
    const orderNumber = await generateOrderNumber(tx);
    const isPrepaid = input.paymentProvider === "STRIPE";
    const initialStatus = isPrepaid ? "PAYMENT_PENDING" : "CONFIRMED";

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        guestEmail: userId ? null : input.contact.email,
        guestPhone: userId ? null : input.contact.phone,
        guestName: userId ? null : input.contact.name,
        status: initialStatus,
        deliveryMethod: input.deliveryMethod,
        addressId,
        addressSnapshot: addressSnapshot ?? undefined,
        deliveryZoneId: quote.zone?.zoneId ?? null,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        customerNotes: input.customerNotes || null,
        subtotal: quote.subtotal,
        discountTotal: quote.discount,
        deliveryFee: quote.deliveryFee,
        serviceFee: quote.serviceFee,
        taxTotal: quote.taxTotal,
        tipAmount: quote.tip,
        total: quote.total,
        couponId,
        couponCode: quote.couponCode,
        estimatedReadyAt: input.scheduledFor
          ? new Date(input.scheduledFor)
          : new Date(Date.now() + quote.estimatedMinutes * 60_000),
        items: {
          create: quote.cart.lines.map((line) => ({
            productId: line.productId,
            productName: line.name,
            productSlug: line.slug,
            imageUrl: line.imageUrl,
            variationName: line.variationName,
            selections: line.selections,
            specialInstructions: line.specialInstructions,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            lineTotal: line.lineTotal,
            taxRate: quote.lineTaxRates.get(line.itemId) ?? 7,
          })),
        },
        statusHistory: {
          create: [
            { toStatus: "PENDING", note: "Bestellung erstellt." },
            {
              fromStatus: "PENDING",
              toStatus: initialStatus,
              note: isPrepaid
                ? "Warten auf Online-Zahlung."
                : "Bestellung bestätigt — Zahlung bei Übergabe.",
            },
          ],
        },
        payments: {
          create: {
            provider: input.paymentProvider,
            status: "PENDING",
            amount: quote.total,
          },
        },
      },
      include: { payments: true },
    });

    if (couponId) {
      await tx.couponUsage.create({
        data: {
          couponId,
          userId,
          orderId: order.id,
          discountApplied: quote.discount,
        },
      });
    }

    // ---- clear the cart -----------------------------------------------------
    await tx.cartItem.deleteMany({
      where: { id: { in: quote.cart.lines.map((l) => l.itemId) } },
    });

    await tx.activityLog.create({
      data: {
        userId,
        action: "order.created",
        metadata: { orderNumber, total: quote.total },
      },
    });

    return order;
  });
}

// ---------------------------------------------------------------------------
// Lifecycle transitions (used by webhook + admin later)
// ---------------------------------------------------------------------------

/** Loyalty: 1 point per full euro of the order total. */
const loyaltyPointsFor = computeLoyaltyPoints;

export async function markOrderPaid(params: {
  orderId: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string | null;
  paymentMethodBrand?: string | null;
  paymentMethodLast4?: string | null;
}) {
  let transitioned = false;
  return db
    .$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: params.orderId },
        include: { payments: true, items: true },
      });
      if (!order) throw new OrderError("Bestellung nicht gefunden.");
      // Idempotency: webhooks may retry.
      if (order.status !== "PAYMENT_PENDING" && order.status !== "PENDING") {
        return order;
      }
      transitioned = true;

      const payment = order.payments[0];
      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            paidAt: new Date(),
            stripePaymentIntentId:
              params.stripePaymentIntentId ?? payment.stripePaymentIntentId,
            stripeChargeId: params.stripeChargeId ?? undefined,
            paymentMethodBrand: params.paymentMethodBrand ?? undefined,
            paymentMethodLast4: params.paymentMethodLast4 ?? undefined,
          },
        });
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CONFIRMED",
          statusHistory: {
            create: [
              {
                fromStatus: order.status,
                toStatus: "PAID",
                note: "Zahlung eingegangen.",
              },
              {
                fromStatus: "PAID",
                toStatus: "CONFIRMED",
                note: "Bestellung bestätigt — die Küche legt los.",
              },
            ],
          },
        },
      });

      // Popularity counters for "best sellers".
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { orderCount: { increment: item.quantity } },
          });
        }
      }

      // Loyalty earn for account holders.
      if (order.userId) {
        const points = loyaltyPointsFor(order.total);
        if (points > 0) {
          const account = await tx.loyaltyAccount.upsert({
            where: { userId: order.userId },
            create: { userId: order.userId, balance: 0 },
            update: {},
          });
          await tx.loyaltyAccount.update({
            where: { id: account.id },
            data: {
              balance: { increment: points },
              lifetimeEarned: { increment: points },
            },
          });
          await tx.loyaltyTransaction.create({
            data: {
              accountId: account.id,
              orderId: order.id,
              type: "EARN",
              points,
              note: `Bestellung ${order.orderNumber}`,
            },
          });
        }
      }

      return updated;
    })
    .then(async (result) => {
      // Post-commit dispatch: realtime status + confirmation email.
      // Only when THIS call performed the transition (idempotent webhook
      // retries set transitioned=false → no duplicate emails).
      if (transitioned && result.status === "CONFIRMED") {
        void trigger(channels.order(result.orderNumber), "status", {
          status: "CONFIRMED",
          statusLabel: "Zahlung eingegangen — bestätigt",
        });
        if (result.userId) {
          const user = await db.user.findUnique({
            where: { id: result.userId },
            select: { email: true, name: true },
          });
          const email = user?.email
            ? orderConfirmationEmail({
                name: user.name ?? "Gast",
                orderNumber: result.orderNumber,
                total: formatPrice(result.total),
                trackUrl: absoluteUrl(`/account/orders/${result.orderNumber}`),
                isPrepaid: true,
              })
            : undefined;
          await notify({
            userId: result.userId,
            type: "PAYMENT",
            title: "Zahlung eingegangen",
            body: `Ihre Bestellung ${result.orderNumber} ist bestätigt.`,
            href: `/account/orders/${result.orderNumber}`,
            email:
              user?.email && email
                ? { to: user.email, subject: email.subject, html: email.html }
                : undefined,
          });
        }
      }
      return result;
    });
}

export async function markPaymentFailed(params: {
  orderId: string;
  reason?: string | null;
}) {
  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: { payments: true },
  });
  if (!order || order.status !== "PAYMENT_PENDING") return order;

  const payment = order.payments[0];
  if (payment && payment.status === "PENDING") {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: params.reason ?? null },
    });
  }
  return order;
}

/** Cancel an unpaid order and restock its items. */
export async function cancelUnpaidOrder(orderId: string, reason: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });
    if (!order) return null;
    if (order.status !== "PAYMENT_PENDING" && order.status !== "PENDING") {
      return order;
    }

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
    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELLED" },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: "CANCELLED",
            note: reason,
          },
        },
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const orderDetailInclude = {
  items: true,
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  payments: true,
  deliveryZone: { select: { name: true, estimatedMinutes: true } },
} as const;

export type OrderDetail = Prisma.OrderGetPayload<{
  include: typeof orderDetailInclude;
}>;

export async function getOrderForUser(orderNumber: string, userId: string) {
  return db.order.findFirst({
    where: { orderNumber, userId },
    include: orderDetailInclude,
  });
}

export async function getOrdersForUser(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { productName: true, quantity: true } } },
    take: 50,
  });
}

/** Guest tracking: order number + matching e-mail. */
export async function getOrderForGuest(orderNumber: string, email: string) {
  return db.order.findFirst({
    where: {
      orderNumber,
      OR: [{ guestEmail: email }, { user: { email } }],
    },
    include: orderDetailInclude,
  });
}

/** Post-checkout confirmation lookup (no auth context yet). */
export async function getOrderByNumber(orderNumber: string) {
  return db.order.findUnique({
    where: { orderNumber },
    include: orderDetailInclude,
  });
}
