"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { reservationSchema } from "@/lib/validations/reservation";
import { checkAvailability } from "@/lib/services/reservation";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getErrorMessage } from "@/lib/utils";

export type ReservationActionResult =
  | { success: true; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createReservation(
  rawInput: unknown,
): Promise<ReservationActionResult> {
  try {
    const parsed = reservationSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Bitte Eingaben überprüfen.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    const input = parsed.data;

    const session = await auth();
    const identity = session?.user?.id ?? input.email;
    if (!checkRateLimit(`reservation:${identity}`, 5, 60 * 60_000)) {
      return { success: false, error: "Zu viele Anfragen — bitte später." };
    }

    const date = new Date(`${input.date}T${input.timeSlot}:00`);
    const availability = await checkAvailability({
      date,
      timeSlot: input.timeSlot,
      area: input.area,
      guests: input.guests,
    });
    if (!availability.available) {
      return {
        success: false,
        error: availability.reason ?? "Keine Verfügbarkeit.",
      };
    }

    const reservation = await db.reservation.create({
      data: {
        userId: session?.user?.id ?? null,
        name: input.name,
        email: input.email,
        phone: input.phone,
        date,
        timeSlot: input.timeSlot,
        guests: input.guests,
        area: input.area,
        specialRequests: input.specialRequests || null,
        status: "PENDING",
      },
    });

    if (session?.user?.id) {
      await db.notification.create({
        data: {
          userId: session.user.id,
          type: "RESERVATION",
          title: "Reservierungsanfrage eingegangen",
          body: `${input.guests} Personen am ${date.toLocaleDateString("de-DE")} um ${input.timeSlot} Uhr — wir bestätigen in Kürze.`,
          href: "/account/reservations",
        },
      });
    }
    await db.activityLog.create({
      data: {
        userId: session?.user?.id ?? null,
        action: "reservation.created",
        metadata: { reservationId: reservation.id },
      },
    });

    revalidatePath("/account/reservations");
    return {
      success: true,
      message:
        "Ihre Reservierungsanfrage ist eingegangen! Wir bestätigen sie schnellstmöglich.",
    };
  } catch (error) {
    console.error("[createReservation]", getErrorMessage(error));
    return {
      success: false,
      error: "Die Reservierung konnte nicht angelegt werden.",
    };
  }
}

export async function cancelReservation(
  rawReservationId: unknown,
): Promise<ReservationActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Bitte melden Sie sich an." };
    }
    const parsed = z.string().cuid().safeParse(rawReservationId);
    if (!parsed.success) {
      return { success: false, error: "Ungültige Reservierung." };
    }

    const reservation = await db.reservation.findFirst({
      where: { id: parsed.data, userId: session.user.id },
    });
    if (!reservation) {
      return { success: false, error: "Reservierung nicht gefunden." };
    }
    if (
      reservation.status === "CANCELLED" ||
      reservation.status === "COMPLETED" ||
      reservation.status === "NO_SHOW"
    ) {
      return {
        success: false,
        error: "Diese Reservierung kann nicht mehr storniert werden.",
      };
    }

    await db.reservation.update({
      where: { id: reservation.id },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/account/reservations");
    return { success: true, message: "Reservierung storniert." };
  } catch (error) {
    console.error("[cancelReservation]", getErrorMessage(error));
    return { success: false, error: "Stornierung fehlgeschlagen." };
  }
}
