import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { ProsePage } from "@/components/shared/prose-page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Über uns",
  description:
    "Die Geschichte von Sofra Royale — wo die Aromen Dubais auf die Tradition der türkischen Küche treffen.",
  alternates: { canonical: `${siteConfig.url}/about` },
};

export default function AboutPage() {
  return (
    <>
      <div className="relative h-64 w-full overflow-hidden sm:h-80">
        <Image
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop"
          alt="Elegantes Restaurantinterieur mit warmem Licht"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="hero-overlay absolute inset-0" aria-hidden />
      </div>
      <ProsePage
        title="Über Sofra Royale"
        eyebrow="Unsere Geschichte"
        intro="„Sofra“ ist die gedeckte Tafel, an der alle zusammenkommen — und genau dieses Gefühl bringen wir auf den Teller."
      >
        <p>
          {siteConfig.name} entstand aus einer einfachen Idee: Die
          Gastfreundschaft der Golfregion und das Feuer der anatolischen
          Grillkunst an einem Ort zu vereinen. Unser Küchenteam bringt
          Erfahrung aus Dubai, Istanbul und Gaziantep mit — und die
          Überzeugung, dass gutes Essen Menschen zusammenbringt.
        </p>

        <h2>Unsere Küche</h2>
        <p>
          Von langsam geschmortem Machboos mit Safran bis zum Adana Kebap vom
          Holzkohlegrill: Jedes Gericht ist{" "}
          <strong>100&nbsp;% halal</strong> und wird frisch zubereitet. Wir
          setzen auf zertifizierte Zutaten, regionale Frische und
          ausgewählte Importe für die authentischen Aromen, die eine gute
          Sofra ausmachen.
        </p>

        <h2>Unser Versprechen</h2>
        <ul>
          <li>Halal-zertifizierte Zutaten und kein Alkohol in der Küche</li>
          <li>Frische Zubereitung auf Bestellung</li>
          <li>Transparente Angaben zu Allergenen und Kalorien</li>
          <li>Lieferung, Abholung und Reservierung — ganz wie es passt</li>
        </ul>

        <div className="pt-4">
          <Button variant="gold" asChild>
            <Link href="/menu">Speisekarte entdecken</Link>
          </Button>
        </div>
      </ProsePage>
    </>
  );
}
