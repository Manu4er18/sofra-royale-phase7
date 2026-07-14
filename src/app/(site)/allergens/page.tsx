import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { ProsePage } from "@/components/shared/prose-page";

export const metadata: Metadata = {
  title: "Allergen-Informationen",
  description:
    "Kennzeichnung der 14 Hauptallergene und Hinweise für Gäste mit Unverträglichkeiten bei Sofra Royale.",
  alternates: { canonical: `${siteConfig.url}/allergens` },
};

export const dynamic = "force-dynamic";

export default async function AllergensPage() {
  const allergens = await db.allergen.findMany({ orderBy: { code: "asc" } });

  return (
    <ProsePage
      title="Allergen-Informationen"
      eyebrow="Sicher genießen"
      intro="Auf jeder Gerichtseite finden Sie die enthaltenen Allergene. Fragen Sie unser Team jederzeit — wir beraten Sie gern."
    >
      <h2>Kennzeichnung</h2>
      <p>
        Bei jedem Gericht sind die deklarationspflichtigen Allergene mit
        einem Buchstabencode ausgewiesen. Die Übersicht:
      </p>

      {allergens.length > 0 ? (
        <ul className="not-prose grid gap-2 sm:grid-cols-2">
          {allergens.map((allergen) => (
            <li
              key={allergen.id}
              className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/20 text-xs font-semibold text-warning-foreground dark:text-warning">
                {allergen.code}
              </span>
              <span className="text-foreground">{allergen.name}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <h2>Wichtiger Hinweis</h2>
      <p>
        Unsere Speisen werden in einer Küche zubereitet, in der mit den
        genannten Allergenen gearbeitet wird. Trotz größter Sorgfalt können
        wir Spuren weiterer Allergene nicht vollständig ausschließen. Bei
        schweren Unverträglichkeiten sprechen Sie uns bitte vor der Bestellung
        an.
      </p>

      <p>
        Details zu einem bestimmten Gericht finden Sie direkt auf der{" "}
        <Link href="/menu">Speisekarte</Link>. Für Rückfragen erreichen Sie
        uns über den <Link href="/contact">Kontakt</Link>. {siteConfig.name}{" "}
        wünscht guten Appetit!
      </p>
    </ProsePage>
  );
}
