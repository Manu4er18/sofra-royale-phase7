import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CancelReservationButton } from "@/components/reservations/cancel-reservation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Meine Reservierungen",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const STATUS = {
  PENDING: { label: "Angefragt", variant: "secondary" as const },
  CONFIRMED: { label: "Bestätigt", variant: "success" as const },
  CANCELLED: { label: "Storniert", variant: "destructive" as const },
  COMPLETED: { label: "Abgeschlossen", variant: "outline" as const },
  NO_SHOW: { label: "Nicht erschienen", variant: "destructive" as const },
};

export default async function MyReservationsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const reservations = await db.reservation.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 30,
  });

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <CalendarCheck className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Keine Reservierungen</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            Reservieren Sie Ihren Tisch — innen oder auf der Terrasse.
          </p>
        </div>
        <Button variant="gold" asChild>
          <Link href="/reservations">Jetzt reservieren</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Meine Reservierungen</h1>
        <Button variant="gold" size="sm" asChild>
          <Link href="/reservations">Neue Reservierung</Link>
        </Button>
      </div>
      <ul className="space-y-3">
        {reservations.map((reservation) => {
          const status = STATUS[reservation.status];
          const cancellable =
            (reservation.status === "PENDING" ||
              reservation.status === "CONFIRMED") &&
            reservation.date.getTime() > Date.now();
          return (
            <li key={reservation.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-semibold">
                      {new Intl.DateTimeFormat("de-DE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }).format(reservation.date)}{" "}
                      · {reservation.timeSlot} Uhr
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {reservation.guests}{" "}
                      {reservation.guests === 1 ? "Person" : "Personen"} ·{" "}
                      {reservation.area === "INDOOR"
                        ? "Innenbereich"
                        : "Terrasse"}
                      {reservation.specialRequests
                        ? ` · „${reservation.specialRequests}“`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {cancellable ? (
                      <CancelReservationButton reservationId={reservation.id} />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
