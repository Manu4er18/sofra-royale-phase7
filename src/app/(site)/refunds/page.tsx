import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { ProsePage, LegalTemplateNotice } from "@/components/shared/prose-page";

export const metadata: Metadata = {
  title: "Widerruf & Erstattungen",
  description:
    "Widerrufsbelehrung und Erstattungsrichtlinie für Bestellungen bei Sofra Royale.",
  alternates: { canonical: `${siteConfig.url}/refunds` },
};

export default function RefundsPage() {
  return (
    <ProsePage title="Widerruf & Erstattungen" eyebrow="Ihre Rechte">
      <LegalTemplateNotice />

      <h2>Ausschluss des Widerrufsrechts</h2>
      <p>
        Bei frisch zubereiteten Speisen und schnell verderblichen Waren ist
        das gesetzliche Widerrufsrecht gemäß § 312g Abs. 2 BGB ausgeschlossen,
        sobald mit der Zubereitung begonnen wurde.
      </p>

      <h2>Stornierung vor Zubereitung</h2>
      <p>
        Solange die Küche noch nicht mit der Zubereitung begonnen hat, können
        Sie Ihre Bestellung stornieren. Kontaktieren Sie uns dazu umgehend
        über den Live-Chat oder telefonisch. Bereits geleistete Zahlungen
        werden in diesem Fall vollständig erstattet.
      </p>

      <h2>Reklamationen</h2>
      <p>
        Sollte mit Ihrer Bestellung etwas nicht in Ordnung sein, melden Sie
        sich bitte zeitnah bei uns. Wir prüfen jeden Fall individuell und
        veranlassen — wo berechtigt — eine ganze oder teilweise Erstattung.
      </p>

      <h2>Ablauf von Erstattungen</h2>
      <p>
        Erstattungen erfolgen über das ursprüngliche Zahlungsmittel. Bei
        Online-Zahlungen wird der Betrag über Stripe zurückgebucht; die
        Gutschrift kann je nach Bank einige Werktage dauern. Barzahlungen
        erstatten wir direkt.
      </p>

      <p>
        Fragen zu einer konkreten Bestellung? Melden Sie sich über den{" "}
        <Link href="/contact">Kontakt</Link> — halten Sie Ihre Bestellnummer
        (Format SR-JJJJ-NNNNNN) bereit. {siteConfig.name} hilft gern.
      </p>
    </ProsePage>
  );
}
