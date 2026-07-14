import type { Metadata } from "next";

import { db } from "@/lib/db";
import { ZoneManager, type ZoneRow } from "@/components/admin/zone-manager";

export const metadata: Metadata = {
  title: "Admin — Liefergebiete",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function AdminZonesPage() {
  const zones = await db.deliveryZone.findMany({ orderBy: { name: "asc" } });
  const rows: ZoneRow[] = zones.map((z) => ({
    id: z.id,
    name: z.name,
    postalCodes: z.postalCodes,
    deliveryFee: z.deliveryFee,
    minOrderAmount: z.minOrderAmount,
    freeDeliveryThreshold: z.freeDeliveryThreshold,
    estimatedMinutes: z.estimatedMinutes,
    isActive: z.isActive,
  }));
  return <ZoneManager zones={rows} />;
}
