import type { Metadata } from "next";
import Link from "next/link";

import {
  getBestSellers,
  getDailyRevenue,
  getKpis,
  getRevenueBreakdown,
  getRevenueByPaymentMethod,
  rangeFromDays,
} from "@/lib/services/analytics";
import { formatPrice } from "@/lib/utils";
import { BreakdownBars, RevenueBars } from "@/components/admin/revenue-bars";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin — Analysen",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  STRIPE: "Online (Stripe)",
  CASH_ON_DELIVERY: "Bar bei Lieferung",
  PAY_AT_PICKUP: "Bei Abholung/vor Ort",
};

const RANGES = [
  { days: 7, label: "7 Tage" },
  { days: 30, label: "30 Tage" },
  { days: 90, label: "90 Tage" },
];

export default async function AdminAnalyticsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const days = Number(
    typeof searchParams.days === "string" ? searchParams.days : "30",
  );
  const activeDays = [7, 30, 90].includes(days) ? days : 30;
  const range = rangeFromDays(activeDays);

  const [kpis, daily, bestSellers, breakdown, byPayment] = await Promise.all([
    getKpis(range),
    getDailyRevenue(range),
    getBestSellers(range),
    getRevenueBreakdown(range),
    getRevenueByPaymentMethod(range),
  ]);

  const kpiCards = [
    { label: "Umsatz", value: formatPrice(kpis.revenue) },
    { label: "Bestellungen", value: String(kpis.orderCount) },
    { label: "Ø Bestellwert", value: formatPrice(kpis.averageOrderValue) },
    { label: "Storniert", value: String(kpis.cancelledCount) },
    { label: "Neue Kunden", value: String(kpis.newCustomers) },
    { label: "Trinkgeld gesamt", value: formatPrice(kpis.tips) },
    { label: "Rabatte gesamt", value: formatPrice(kpis.discounts) },
    { label: "Reservierungen", value: String(kpis.reservationCount) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Analysen</h1>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              variant={activeDays === r.days ? "gold" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`/admin/analytics?days=${r.days}`}>{r.label}</Link>
            </Button>
          ))}
          <a
            href={`/api/admin/export?type=orders&days=${activeDays}`}
            className="text-sm text-primary underline underline-offset-4 dark:text-gold"
          >
            CSV
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tagesumsatz</CardTitle>
          <CardDescription>
            Umsatzwirksame Bestellungen (bezahlt / zur Zahlung bei Übergabe).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueBars data={daily} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bestseller</CardTitle>
          </CardHeader>
          <CardContent>
            {bestSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Verkäufe im Zeitraum.
              </p>
            ) : (
              <ol className="space-y-2 text-sm">
                {bestSellers.map((item, i) => (
                  <li
                    key={item.slug}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0 truncate">
                      <span className="mr-2 text-muted-foreground">
                        {i + 1}.
                      </span>
                      {item.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {item.quantity}× · {formatPrice(item.revenue)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Umsatz nach Zahlungsart</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBars
              data={byPayment.map((p) => ({
                name: PAYMENT_LABEL[p.provider] ?? p.provider,
                revenue: p.amount,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Umsatz nach Kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBars data={breakdown.byCategory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Umsatz nach Küche</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBars data={breakdown.byCuisine} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
