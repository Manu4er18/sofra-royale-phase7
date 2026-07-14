import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { ProsePage, LegalTemplateNotice } from "@/components/shared/prose-page";

export const metadata: Metadata = {
  title: "Cookie-Richtlinie",
  description: "Welche Cookies Sofra Royale verwendet und wofür.",
  alternates: { canonical: `${siteConfig.url}/cookies` },
};

export default function CookiesPage() {
  return (
    <ProsePage title="Cookie-Richtlinie" eyebrow="Transparenz">
      <LegalTemplateNotice />

      <p>
        {siteConfig.name} verwendet ausschließlich technisch notwendige
        Cookies. Wir setzen keine Tracking- oder Werbe-Cookies ein.
      </p>

      <h2>Notwendige Cookies</h2>
      <ul>
        <li>
          <strong>Anmeldung/Session:</strong> hält Sie eingeloggt (Auth.js).
        </li>
        <li>
          <strong>Warenkorb (sr_cart):</strong> merkt sich Ihren Warenkorb —
          auch als Gast.
        </li>
        <li>
          <strong>Chat (sr_chat):</strong> ordnet Gast-Unterhaltungen zu.
        </li>
        <li>
          <strong>Theme:</strong> speichert Ihre Wahl von hellem/dunklem
          Design (lokal im Browser).
        </li>
      </ul>

      <h2>Verwaltung</h2>
      <p>
        Da wir nur notwendige Cookies verwenden, ist keine Einwilligung
        erforderlich. Sie können Cookies jederzeit in Ihren
        Browsereinstellungen löschen; einige Funktionen (Anmeldung,
        Warenkorb) funktionieren dann jedoch nur eingeschränkt.
      </p>
    </ProsePage>
  );
}
