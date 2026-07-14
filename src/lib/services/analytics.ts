import "server-only";

import { db } from "@/lib/db";

/**
 * Analytics aggregates for the admin dashboard.
 * "Revenue" counts non-cancelled, non-payment-pending orders (paid or
 * to-be-paid-on-handover) within the range, based on Order.total.
 */

export type DateRange = { from: Date; to: Date };

export function rangeFromDays(days: number): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

const REVENUE_STATUSES = [
  "PAID",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
] as const;

export async function getKpis(range: DateRange) {
  const [revenue, orderCount, cancelledCount, newCustomers, reservationCount] =
    await Promise.all([
      db.order.aggregate({
        where: {
          createdAt: { gte: range.from, lte: range.to },
          status: { in: [...REVENUE_STATUSES] },
        },
        _sum: { total: true, tipAmount: true, discountTotal: true },
        _count: true,
        _avg: { total: true },
      }),
      db.order.count({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      db.order.count({
        where: {
          createdAt: { gte: range.from, lte: range.to },
          status: "CANCELLED",
        },
      }),
      db.user.count({
        where: {
          role: "CUSTOMER",
          createdAt: { gte: range.from, lte: range.to },
        },
      }),
      db.reservation.count({
        where: { date: { gte: range.from, lte: range.to } },
      }),
    ]);

  return {
    revenue: revenue._sum.total ?? 0,
    tips: revenue._sum.tipAmount ?? 0,
    discounts: revenue._sum.discountTotal ?? 0,
    revenueOrders: revenue._count,
    averageOrderValue: Math.round(revenue._avg.total ?? 0),
    orderCount,
    cancelledCount,
    newCustomers,
    reservationCount,
  };
}

/** Daily revenue buckets for the bar chart. */
export async function getDailyRevenue(range: DateRange) {
  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: range.from, lte: range.to },
      status: { in: [...REVENUE_STATUSES] },
    },
    select: { createdAt: true, total: true },
  });

  const buckets = new Map<string, number>();
  const cursor = new Date(range.from);
  while (cursor <= range.to) {
    buckets.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + order.total);
  }
  return [...buckets.entries()].map(([date, total]) => ({ date, total }));
}

export async function getBestSellers(range: DateRange, take = 8) {
  const grouped = await db.orderItem.groupBy({
    by: ["productName", "productSlug"],
    where: {
      order: {
        createdAt: { gte: range.from, lte: range.to },
        status: { in: [...REVENUE_STATUSES] },
      },
    },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take,
  });
  return grouped.map((g) => ({
    name: g.productName,
    slug: g.productSlug,
    quantity: g._sum.quantity ?? 0,
    revenue: g._sum.lineTotal ?? 0,
  }));
}

/** Revenue split by category / cuisine (via product lookups). */
export async function getRevenueBreakdown(range: DateRange) {
  const items = await db.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: range.from, lte: range.to },
        status: { in: [...REVENUE_STATUSES] },
      },
    },
    select: {
      lineTotal: true,
      product: {
        select: {
          category: { select: { name: true } },
          cuisine: { select: { name: true } },
        },
      },
    },
  });

  const byCategory = new Map<string, number>();
  const byCuisine = new Map<string, number>();
  for (const item of items) {
    const category = item.product?.category.name ?? "Gelöschte Gerichte";
    const cuisine = item.product?.cuisine.name ?? "Gelöschte Gerichte";
    byCategory.set(category, (byCategory.get(category) ?? 0) + item.lineTotal);
    byCuisine.set(cuisine, (byCuisine.get(cuisine) ?? 0) + item.lineTotal);
  }
  const toSorted = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

  return { byCategory: toSorted(byCategory), byCuisine: toSorted(byCuisine) };
}

export async function getRevenueByPaymentMethod(range: DateRange) {
  const payments = await db.payment.groupBy({
    by: ["provider"],
    where: {
      order: {
        createdAt: { gte: range.from, lte: range.to },
        status: { in: [...REVENUE_STATUSES] },
      },
    },
    _sum: { amount: true },
    _count: true,
  });
  return payments.map((p) => ({
    provider: p.provider,
    amount: p._sum.amount ?? 0,
    count: p._count,
  }));
}

export async function getLowStockProducts(take = 8) {
  return db.product.findMany({
    where: {
      stockQuantity: { not: null },
      OR: [{ stockStatus: "LOW_STOCK" }, { stockStatus: "OUT_OF_STOCK" }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      stockQuantity: true,
      stockStatus: true,
    },
    orderBy: { stockQuantity: "asc" },
    take,
  });
}

export async function getRecentOrders(take = 8) {
  return db.order.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      deliveryMethod: true,
      createdAt: true,
      guestName: true,
      user: { select: { name: true } },
    },
  });
}
