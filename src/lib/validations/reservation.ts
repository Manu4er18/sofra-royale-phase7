import { z } from "zod";

/** Bookable time slots (kept in sync with opening hours seed). */
export const RESERVATION_SLOTS = [
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
] as const;

export const reservationSchema = z
  .object({
    name: z.string().trim().min(2, "Bitte Ihren Namen angeben.").max(100),
    email: z
      .string()
      .trim()
      .email("Bitte eine gültige E-Mail-Adresse angeben.")
      .transform((v) => v.toLowerCase()),
    phone: z
      .string()
      .trim()
      .min(6, "Bitte eine gültige Telefonnummer angeben.")
      .max(25)
      .regex(/^[+0-9 ()/-]+$/, "Bitte eine gültige Telefonnummer angeben."),
    /** ISO date (yyyy-mm-dd). */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein Datum wählen."),
    timeSlot: z.enum(RESERVATION_SLOTS, {
      errorMap: () => ({ message: "Bitte eine Uhrzeit wählen." }),
    }),
    guests: z
      .number()
      .int()
      .min(1, "Mindestens 1 Gast.")
      .max(12, "Für Gruppen über 12 Personen rufen Sie uns bitte an."),
    area: z.enum(["INDOOR", "OUTDOOR"]),
    specialRequests: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const date = new Date(`${data.date}T${data.timeSlot}:00`);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Ungültiges Datum.",
      });
      return;
    }
    if (date.getTime() < Date.now() + 60 * 60_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message:
          "Reservierungen benötigen mindestens 1 Stunde Vorlauf — rufen Sie uns gern an.",
      });
    }
    if (date.getTime() > Date.now() + 60 * 86_400_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Reservierungen sind bis 60 Tage im Voraus möglich.",
      });
    }
  });

export type ReservationInput = z.infer<typeof reservationSchema>;
