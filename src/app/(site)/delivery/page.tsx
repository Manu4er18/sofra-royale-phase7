import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { getActiveZones } from "@/lib/services/delivery";
import { formatPrice } from "@/lib/utils";
import { ProsePage } from "@/components/shared/prose-page";

export const metadata: Metadata = {
  title: "Lieferbedingungen",
  description:
    "Liefergebiete, Liefergebühren, Mindestbestellwerte und Lieferzeiten bei Sofra Royale.",
  alternates: { canonical: `${siteConfig.url}/delivery` },
};

export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  const zones = await getActiveZones();

  return (
    <ProsePage
      title="Lieferbedingungen"
      eyebrow="Lieferung & Abholung"
      intro="Wir liefern innerhalb unserer ausgewiesenen Gebiete. Ihre Postleitzahl prüfen wir automatisch im Checkout."
    >
      <h2>Liefergebiete</h2>
      {zones.length === 0 ? (
        <p>
          Derzeit sind keine Liefergebiete aktiv. Abholung ist jederzeit
          möglich.
        </p>
      ) : (
        <div className="not-prose overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Gebiet</th>
                <th className="px-4 py-3 text-right">Liefergebühr</th>
                <th className="px-4 py-3 text-right">Mindestbestellwert</th>
                <th className="px-4 py-3 text-right">Gratis ab</th>
                <th className="px-4 py-3 text-right">Zeit</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {zone.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatPrice(zone.deliveryFee)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatPrice(zone.minOrderAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {zone.freeDeliveryThreshold
                      ? formatPrice(zone.freeDeliveryThreshold)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ca. {zone.estimatedMinutes} Min.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Abholung</h2>
      <p>
        Bestellungen zur Abholung sind ohne Mindestbestellwert möglich. Ihre
        Bestellung ist in der Regel innerhalb von etwa 25&nbsp;Minuten
        abholbereit.
      </p>

      <h2>Lieferzeiten</h2>
      <p>
        Die angegebenen Lieferzeiten sind Richtwerte und können bei hohem
        Andrang abweichen. Sie können den Status Ihrer Bestellung jederzeit in
        Echtzeit verfolgen — unter <Link href="/track-order">Bestellung
        verfolgen</Link> oder in Ihrem Konto.
      </p>
    </ProsePage>
  );
}
