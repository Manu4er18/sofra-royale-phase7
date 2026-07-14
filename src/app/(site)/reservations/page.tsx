import type { Metadata } from "next";
import { Armchair, Clock, MapPin, Sun } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { FadeIn } from "@/components/shared/fade-in";

export const metadata: Metadata = {
  title: "Tisch reservieren",
  description:
    "Reservieren Sie Ihren Tisch bei Sofra Royale — innen oder auf der Terrasse, für bis zu 12 Personen online.",
};

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const session = await auth();
  let phone = "";
  if (session?.user?.id) {
    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    });
    phone = dbUser?.phone ?? "";
  }

  const infoItems = [
    {
      icon: Clock,
      title: "Öffnungszeiten",
      text: "Mo–Do 11:30–22:30 · Fr–Sa 11:30–23:30 · So 12:00–22:00",
    },
    {
      icon: Armchair,
      title: "Innenbereich",
      text: "Elegante Sofra-Lounge und Tische für 2–8 Personen",
    },
    {
      icon: Sun,
      title: "Terrasse",
      text: "Bei schönem Wetter — beliebte Plätze, früh reservieren",
    },
    {
      icon: MapPin,
      title: "Anfahrt",
      text: "Königsallee 42, 40212 Düsseldorf — U-Bahn Steinstraße/Kö",
    },
  ];

  return (
    <div className="container py-12">
      <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
        <p className="text-sm uppercase tracking-widest text-gold">
          Wir decken die Sofra für Sie
        </p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
          Tisch reservieren
        </h1>
        <p className="mt-3 text-muted-foreground">
          Sichern Sie sich Ihren Platz — die Verfügbarkeit wird sofort geprüft,
          die verbindliche Bestätigung folgt vom Team.
        </p>
      </FadeIn>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <FadeIn>
          <ReservationForm
            defaultName={session?.user?.name ?? ""}
            defaultEmail={session?.user?.email ?? ""}
            defaultPhone={phone}
          />
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="space-y-5 rounded-lg border bg-secondary/40 p-6 dark:bg-card">
            {infoItems.map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                  <item.icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
            <p className="border-t pt-4 text-xs text-muted-foreground">
              Kurzfristige Reservierungen (unter 1 Stunde) und Gruppen über 12
              Personen nehmen wir gern telefonisch entgegen: +49 211 555 012 34.
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
