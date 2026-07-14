import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import {
  BlackoutManager,
  ReservationControls,
} from "@/components/admin/reservation-controls";
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
  title: "Admin — Reservierungen",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const STATUS = {
  PENDING: { label: "Angefragt", variant: "secondary" as const },
  CONFIRMED: { label: "Bestätigt", variant: "success" as const },
  CANCELLED: { label: "Storniert", variant: "destructive" as const },
  COMPLETED: { label: "Erschienen", variant: "outline" as const },
  NO_SHOW: { label: "No-Show", variant: "destructive" as const },
};

const FILTERS = [
  { key: "upcoming", label: "Anstehend" },
  { key: "pending", label: "Zu bestätigen" },
  { key: "all", label: "Alle" },
];

export default async function AdminReservationsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const filter =
    typeof searchParams.filter === "string" ? searchParams.filter : "upcoming";

  const where: Prisma.ReservationWhereInput = {};
  if (filter === "pending") where.status = "PENDING";
  else if (filter === "upcoming") {
    where.date = { gte: new Date(new Date().setHours(0, 0, 0, 0)) };
    where.status = { in: ["PENDING", "CONFIRMED"] };
  }

  const [reservations, tables, blackouts] = await Promise.all([
    db.reservation.findMany({
      where,
      orderBy: { date: filter === "upcoming" ? "asc" : "desc" },
      take: 100,
      include: { table: { select: { name: true } } },
    }),
    db.restaurantTable.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, capacity: true, area: true },
    }),
    db.reservationBlackout.findMany({ orderBy: { date: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Reservierungen</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sperrtage</CardTitle>
          <CardDescription>
            An diesen Tagen sind keine Online-Reservierungen möglich.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BlackoutManager
            blackouts={blackouts.map((b) => ({
              id: b.id,
              date: b.date.toISOString(),
              reason: b.reason,
            }))}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "gold" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/admin/reservations?filter=${f.key}`}>{f.label}</Link>
          </Button>
        ))}
      </div>

      {reservations.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Keine Reservierungen für diesen Filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {reservations.map((reservation) => (
            <li key={reservation.id}>
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {new Intl.DateTimeFormat("de-DE", {
                          weekday: "short",
                          day: "2-digit",
                          month: "long",
                        }).format(reservation.date)}{" "}
                        · {reservation.timeSlot} Uhr · {reservation.guests}{" "}
                        {reservation.guests === 1 ? "Gast" : "Gäste"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {reservation.name} · {reservation.phone} ·{" "}
                        {reservation.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reservation.area === "INDOOR" ? "Innen" : "Terrasse"}
                        {reservation.table
                          ? ` · ${reservation.table.name}`
                          : ""}
                        {reservation.specialRequests
                          ? ` · „${reservation.specialRequests}“`
                          : ""}
                      </p>
                    </div>
                    <Badge variant={STATUS[reservation.status].variant}>
                      {STATUS[reservation.status].label}
                    </Badge>
                  </div>
                  <ReservationControls
                    reservationId={reservation.id}
                    status={reservation.status}
                    currentTableId={reservation.tableId}
                    tables={tables}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
