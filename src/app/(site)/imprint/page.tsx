import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { getContactSettings } from "@/lib/services/settings";
import { ProsePage, LegalTemplateNotice } from "@/components/shared/prose-page";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung von Sofra Royale.",
  alternates: { canonical: `${siteConfig.url}/imprint` },
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

export default async function ImprintPage() {
  const contact = await getContactSettings();

  return (
    <ProsePage title="Impressum" eyebrow="Angaben gemäß § 5 TMG">
      <LegalTemplateNotice />

      <h2>Anbieter</h2>
      <p>
        {siteConfig.name} GmbH
        <br />
        {contact.address}
        <br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon: {contact.phone}
        <br />
        E-Mail: {contact.email}
      </p>

      <h2>Vertretungsberechtigte(r)</h2>
      <p>Geschäftsführung: [Name eintragen]</p>

      <h2>Registereintrag</h2>
      <p>
        Handelsregister: [Amtsgericht / HRB-Nummer]
        <br />
        Umsatzsteuer-ID gemäß § 27a UStG: [USt-IdNr.]
      </p>

      <h2>Verantwortlich für den Inhalt gemäß § 55 Abs. 2 RStV</h2>
      <p>[Name und Anschrift der verantwortlichen Person]</p>

      <h2>Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:{" "}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
          ec.europa.eu/consumers/odr
        </a>
        . Wir sind nicht verpflichtet und nicht bereit, an einem
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>
    </ProsePage>
  );
}
