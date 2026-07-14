import "server-only";

import type { SeatingArea } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Reservation availability. Capacity is the summed seat count of active
 * tables per area; a slot is bookable while confirmed/pending
 * reservations plus the new party still fit. Blackout dates block whole
 * days. (Table auto-assignment happens in the admin dashboard, Phase 5.)
 */

export async function getAreaCapacity(area: SeatingArea): Promise<number> {
  const agg = await db.restaurantTable.aggregate({
    where: { area, isActive: true },
    _sum: { capacity: true },
  });
  return agg._sum.capacity ?? 0;
}

export async function isBlackoutDate(date: Date): Promise<string | null> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const blackout = await db.reservationBlackout.findFirst({
    where: { date: { gte: dayStart, lt: dayEnd } },
  });
  return blackout ? (blackout.reason ?? "Geschlossen") : null;
}

export async function checkAvailability(params: {
  date: Date;
  timeSlot: string;
  area: SeatingArea;
  guests: number;
}): Promise<{ available: boolean; reason?: string }> {
  const blackoutReason = await isBlackoutDate(params.date);
  if (blackoutReason) {
    return {
      available: false,
      reason: `An diesem Tag sind wir leider geschlossen (${blackoutReason}).`,
    };
  }

  const capacity = await getAreaCapacity(params.area);
  if (capacity === 0) {
    return {
      available: false,
      reason:
        params.area === "OUTDOOR"
          ? "Die Terrasse ist derzeit nicht buchbar."
          : "Derzeit sind keine Tische buchbar.",
    };
  }

  const dayStart = new Date(params.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const booked = await db.reservation.aggregate({
    where: {
      date: { gte: dayStart, lt: dayEnd },
      timeSlot: params.timeSlot,
      area: params.area,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    _sum: { guests: true },
  });
  const taken = booked._sum.guests ?? 0;

  if (taken + params.guests > capacity) {
    return {
      available: false,
      reason:
        "Für diese Uhrzeit sind leider keine Plätze mehr frei — bitte wählen Sie eine andere Zeit.",
    };
  }
  return { available: true };
}
