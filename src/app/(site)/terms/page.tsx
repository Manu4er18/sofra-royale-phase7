import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { ProsePage, LegalTemplateNotice } from "@/components/shared/prose-page";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen (AGB)",
  description: "Die AGB für Bestellungen und Reservierungen bei Sofra Royale.",
  alternates: { canonical: `${siteConfig.url}/terms` },
};

export default function TermsPage() {
  return (
    <ProsePage title="Allgemeine Geschäftsbedingungen" eyebrow="AGB">
      <LegalTemplateNotice />

      <h2>1. Geltungsbereich</h2>
      <p>
        Diese AGB gelten für alle Bestellungen und Reservierungen über die
        Website von {siteConfig.name}.
      </p>

      <h2>2. Vertragsschluss</h2>
      <p>
        Die Darstellung der Gerichte stellt kein bindendes Angebot dar. Mit
        Absenden der Bestellung geben Sie ein verbindliches Angebot ab. Der
        Vertrag kommt mit unserer Bestätigung (per E-Mail bzw. im Konto)
        zustande.
      </p>

      <h2>3. Preise & Zahlung</h2>
      <p>
        Alle Preise verstehen sich inklusive der gesetzlichen
        Mehrwertsteuer. Es gelten die zum Zeitpunkt der Bestellung
        angezeigten Preise. Zahlungsarten: Online-Zahlung (Karte, Apple Pay,
        Google Pay über Stripe), Barzahlung bei Lieferung oder Zahlung bei
        Abholung.
      </p>

      <h2>4. Lieferung & Abholung</h2>
      <p>
        Lieferungen erfolgen nur innerhalb unserer ausgewiesenen
        Liefergebiete. Es gelten die jeweils angezeigten Mindestbestellwerte
        und Liefergebühren. Näheres in unseren{" "}
        <Link href="/delivery">Lieferbedingungen</Link>.
      </p>

      <h2>5. Widerruf</h2>
      <p>
        Für schnell verderbliche Waren und frisch zubereitete Speisen ist das
        Widerrufsrecht gesetzlich ausgeschlossen. Einzelheiten und Ausnahmen
        finden Sie in unserer <Link href="/refunds">Widerrufsbelehrung</Link>.
      </p>

      <h2>6. Reservierungen</h2>
      <p>
        Reservierungsanfragen werden vom Restaurant bestätigt. Bei
        Verhinderung bitten wir um rechtzeitige Absage über Ihr Konto oder
        telefonisch.
      </p>

      <h2>7. Haftung</h2>
      <p>
        Wir haften nach den gesetzlichen Bestimmungen. Bitte beachten Sie
        unsere <Link href="/allergens">Allergen-Informationen</Link>; Spuren
        weiterer Allergene können nicht ausgeschlossen werden.
      </p>
    </ProsePage>
  );
}
