import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/components/order/order-status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Admin — Bestellungen",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const FILTERS: Array<{ key: string; label: string; statuses?: OrderStatus[] }> =
  [
    { key: "all", label: "Alle" },
    {
      key: "active",
      label: "Aktiv",
      statuses: [
        "PENDING",
        "PAID",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "OUT_FOR_DELIVERY",
      ],
    },
    { key: "payment", label: "Zahlung offen", statuses: ["PAYMENT_PENDING"] },
    {
      key: "done",
      label: "Abgeschlossen",
      statuses: ["DELIVERED", "COMPLETED"],
    },
    {
      key: "cancelled",
      label: "Storniert/Erstattet",
      statuses: ["CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
    },
  ];

const METHOD_LABEL = {
  DELIVERY: "Lieferung",
  PICKUP: "Abholung",
  DINE_IN: "Vor Ort",
};

export default async function AdminOrdersPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const filterKey =
    typeof searchParams.filter === "string" ? searchParams.filter : "active";
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[1]!;

  const where: Prisma.OrderWhereInput = {};
  if (filter.statuses) where.status = { in: filter.statuses };
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { guestName: { contains: q, mode: "insensitive" } },
      { guestEmail: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      items: { select: { quantity: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Bestellungen</h1>
        <a
          href="/api/admin/export?type=orders"
          className="text-sm text-primary underline underline-offset-4 dark:text-gold"
        >
          CSV exportieren
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={f.key === filter.key ? "gold" : "outline"}
            size="sm"
            asChild
          >
            <Link
              href={`/admin/orders?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            >
              {f.label}
            </Link>
          </Button>
        ))}
        <form method="get" className="ml-auto flex gap-2">
          <input type="hidden" name="filter" value={filter.key} />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Nr., Name, E-Mail …"
            className="h-9 w-56"
            aria-label="Bestellungen durchsuchen"
          />
          <Button type="submit" variant="secondary" size="sm" className="h-9">
            Suchen
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Bestellung</th>
              <th className="px-4 py-3">Kunde</th>
              <th className="px-4 py-3">Art</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Summe</th>
              <th className="px-4 py-3">Eingang</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Keine Bestellungen für diesen Filter.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b last:border-0 hover:bg-accent/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.orderNumber}`}
                      className="font-medium hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({order.items.reduce((n, i) => n + i.quantity, 0)} Art.)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {order.user?.name ?? order.guestName ?? "Gast"}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {order.user?.email ?? order.guestEmail ?? ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {METHOD_LABEL[order.deliveryMethod]}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        order.status === "CANCELLED" ||
                        order.status === "REFUNDED"
                          ? "destructive"
                          : order.status === "COMPLETED" ||
                              order.status === "DELIVERED"
                            ? "success"
                            : "secondary"
                      }
                    >
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Intl.DateTimeFormat("de-DE", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(order.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Zeigt die letzten 100 Treffer. Vollständige Daten über den CSV-Export.
      </p>
    </div>
  );
}
