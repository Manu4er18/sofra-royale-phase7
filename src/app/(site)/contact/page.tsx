import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { siteConfig } from "@/config/site";
import { getContactSettings } from "@/lib/services/settings";
import { ProsePage } from "@/components/shared/prose-page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "So erreichen Sie Sofra Royale — Adresse, Telefon, E-Mail, Öffnungszeiten und Live-Chat.",
  alternates: { canonical: `${siteConfig.url}/contact` },
};

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const contact = await getContactSettings();

  const items = [
    { icon: MapPin, label: "Adresse", value: contact.address },
    {
      icon: Phone,
      label: "Telefon",
      value: contact.phone,
      href: `tel:${contact.phone.replace(/\s/g, "")}`,
    },
    {
      icon: Mail,
      label: "E-Mail",
      value: contact.email,
      href: `mailto:${contact.email}`,
    },
    {
      icon: Clock,
      label: "Öffnungszeiten",
      value: "Mo–Do 11:30–22:30 · Fr–Sa 11:30–23:30 · So 12:00–22:00",
    },
  ];

  return (
    <ProsePage
      title="Kontakt"
      eyebrow="Wir sind für Sie da"
      intro="Fragen zu Ihrer Bestellung, einer Reservierung oder Allergenen? Melden Sie sich — am schnellsten über den Live-Chat unten rechts."
    >
      <ul className="not-prose grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex gap-3 rounded-lg border bg-card p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
              <item.icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm">
              <span className="block font-semibold text-foreground">
                {item.label}
              </span>
              {item.href ? (
                <a href={item.href} className="text-muted-foreground">
                  {item.value}
                </a>
              ) : (
                <span className="text-muted-foreground">{item.value}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <h2>Reservierung & Bestellung</h2>
      <p>
        Einen Tisch reservieren Sie am besten direkt über unsere{" "}
        <Link href="/reservations">Reservierungsseite</Link>. Bestellungen zur
        Lieferung oder Abholung nehmen wir über die{" "}
        <Link href="/menu">Speisekarte</Link> entgegen.
      </p>

      <div className="not-prose pt-2">
        <Button variant="gold" asChild>
          <Link href="/reservations">
            <MessageCircle className="h-4 w-4" /> Tisch reservieren
          </Link>
        </Button>
      </div>
    </ProsePage>
  );
}
