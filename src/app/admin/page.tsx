import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  Euro,
  ReceiptText,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  getKpis,
  getLowStockProducts,
  getRecentOrders,
  rangeFromDays,
} from "@/lib/services/analytics";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/components/order/order-status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin — Übersicht",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const range = rangeFromDays(30);
  const [kpis, recentOrders, lowStock, pendingReviews, pendingReservations] =
    await Promise.all([
      getKpis(range),
      getRecentOrders(8),
      getLowStockProducts(6),
      db.review.count({ where: { status: "PENDING" } }),
      db.reservation.count({ where: { status: "PENDING" } }),
    ]);

  const stats = [
    {
      icon: Euro,
      label: "Umsatz (30 Tage)",
      value: formatPrice(kpis.revenue),
      hint: `${kpis.revenueOrders} umsatzwirksame Bestellungen`,
    },
    {
      icon: TrendingUp,
      label: "Ø Bestellwert",
      value: formatPrice(kpis.averageOrderValue),
      hint: `${formatPrice(kpis.tips)} Trinkgeld gesamt`,
    },
    {
      icon: ReceiptText,
      label: "Bestellungen (30 Tage)",
      value: String(kpis.orderCount),
      hint: `${kpis.cancelledCount} storniert`,
    },
    {
      icon: Users,
      label: "Neue Kunden",
      value: String(kpis.newCustomers),
      hint: "in den letzten 30 Tagen",
    },
    {
      icon: CalendarCheck,
      label: "Reservierungen",
      value: String(kpis.reservationCount),
      hint: `${pendingReservations} warten auf Bestätigung`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Übersicht</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Letzte 30 Tage · Live aus der Datenbank
          </p>
        </div>
        <Button variant="gold" size="sm" asChild>
          <Link href="/admin/analytics">Detaillierte Analysen</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gold" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{stat.value}</p>
              <CardDescription className="mt-1">{stat.hint}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingReviews > 0 || pendingReservations > 0 ? (
        <div className="flex flex-wrap gap-3">
          {pendingReviews > 0 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/reviews">
                {pendingReviews} Bewertung(en) prüfen
              </Link>
            </Button>
          ) : null}
          {pendingReservations > 0 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/reservations">
                {pendingReservations} Reservierung(en) bestätigen
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Neueste Bestellungen</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine Bestellungen.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/orders/${order.orderNumber}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-accent/50"
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{order.orderNumber}</span>
                        <span className="ml-2 text-muted-foreground">
                          {order.user?.name ?? order.guestName ?? "Gast"}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary">
                          {ORDER_STATUS_LABEL[order.status]}
                        </Badge>
                        <span className="font-medium">
                          {formatPrice(order.total)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Niedriger Bestand</CardTitle>
            <CardDescription>
              Gerichte mit Bestandsverfolgung unter dem Schwellwert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Alles ausreichend verfügbar.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lowStock.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Link
                      href={`/admin/menu/${product.id}`}
                      className="hover:underline"
                    >
                      {product.name}
                    </Link>
                    <Badge
                      variant={
                        product.stockStatus === "OUT_OF_STOCK"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {product.stockQuantity} übrig
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
