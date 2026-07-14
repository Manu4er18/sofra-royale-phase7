import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { getContactSettings } from "@/lib/services/settings";
import { ProsePage, LegalTemplateNotice } from "@/components/shared/prose-page";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description:
    "Informationen zur Verarbeitung personenbezogener Daten bei Sofra Royale (DSGVO).",
  alternates: { canonical: `${siteConfig.url}/privacy` },
};

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const contact = await getContactSettings();

  return (
    <ProsePage
      title="Datenschutzerklärung"
      eyebrow="Ihre Daten sind bei uns sicher"
      intro="Wir verarbeiten personenbezogene Daten nur im Rahmen der gesetzlichen Bestimmungen (DSGVO/BDSG)."
    >
      <LegalTemplateNotice />

      <h2>1. Verantwortlicher</h2>
      <p>
        {siteConfig.name} GmbH, {contact.address}. E-Mail: {contact.email}.
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>
          <strong>Kontodaten:</strong> Name, E-Mail, Telefonnummer,
          verschlüsseltes Passwort (bcrypt) — zur Kontoführung.
        </li>
        <li>
          <strong>Bestelldaten:</strong> Lieferadresse, Bestellinhalt,
          Zahlungsstatus — zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
        </li>
        <li>
          <strong>Zahlungsdaten:</strong> Die Zahlungsabwicklung erfolgt über
          Stripe. Wir speichern <strong>keine</strong> vollständigen
          Kartendaten.
        </li>
        <li>
          <strong>Nutzungsdaten:</strong> Login-Verlauf und Aktivitäten zur
          Sicherheit und Betrugsprävention.
        </li>
      </ul>

      <h2>3. Auftragsverarbeiter</h2>
      <p>
        Wir setzen sorgfältig ausgewählte Dienstleister ein, u.&nbsp;a.
        Stripe (Zahlungen), Cloudinary (Medien), Resend (E-Mail), Twilio
        (SMS, optional) und Pusher (Echtzeit). Mit allen bestehen
        Auftragsverarbeitungsverträge.
      </p>

      <h2>4. Speicherdauer</h2>
      <p>
        Bestell- und Rechnungsdaten bewahren wir gemäß handels- und
        steuerrechtlicher Pflichten auf. Bei Kontolöschung werden Ihre
        personenbezogenen Daten anonymisiert; Belege bleiben in
        anonymisierter Form erhalten.
      </p>

      <h2>5. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
        Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch
        sowie ein Beschwerderecht bei einer Aufsichtsbehörde. Wenden Sie sich
        hierfür an {contact.email}.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Wir verwenden technisch notwendige Cookies (z.&nbsp;B. Anmeldung,
        Warenkorb). Details finden Sie in unserer{" "}
        <Link href="/cookies">Cookie-Richtlinie</Link>.
      </p>
    </ProsePage>
  );
}
