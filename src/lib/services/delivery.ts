import "server-only";

import { db } from "@/lib/db";

/**
 * Delivery-zone service. Customers can only order delivery to postal
 * codes covered by an active zone — validated here AND inside the
 * order transaction (never trust a client-side zone check).
 */

export type ZoneQuote = {
  zoneId: string;
  zoneName: string;
  deliveryFee: number;
  minOrderAmount: number;
  freeDeliveryThreshold: number | null;
  estimatedMinutes: number;
};

const POSTAL_CODE_RE = /^\d{5}$/;

export function isValidGermanPostalCode(postalCode: string): boolean {
  return POSTAL_CODE_RE.test(postalCode.trim());
}

/** Find the active delivery zone serving a postal code. */
export async function getZoneForPostalCode(
  postalCode: string,
): Promise<ZoneQuote | null> {
  const trimmed = postalCode.trim();
  if (!isValidGermanPostalCode(trimmed)) return null;

  const zone = await db.deliveryZone.findFirst({
    where: { isActive: true, postalCodes: { has: trimmed } },
  });
  if (!zone) return null;

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    deliveryFee: zone.deliveryFee,
    minOrderAmount: zone.minOrderAmount,
    freeDeliveryThreshold: zone.freeDeliveryThreshold,
    estimatedMinutes: zone.estimatedMinutes,
  };
}

/** All active zones — shown on the delivery info section/page. */
export async function getActiveZones() {
  return db.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: { deliveryFee: "asc" },
  });
}
