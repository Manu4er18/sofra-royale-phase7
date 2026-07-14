import { z } from "zod";

/** Checkout & order validation schemas (client UX + server authority). */

export const couponCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Bitte einen Gutscheincode eingeben.")
    .max(40)
    .transform((v) => v.toUpperCase()),
});

const phone = z
  .string()
  .trim()
  .min(6, "Bitte eine gültige Telefonnummer angeben.")
  .max(25)
  .regex(/^[+0-9 ()/-]+$/, "Bitte eine gültige Telefonnummer angeben.");

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Bitte Ihren Namen angeben.").max(100),
  email: z
    .string()
    .trim()
    .email("Bitte eine gültige E-Mail-Adresse angeben.")
    .max(254)
    .transform((v) => v.toLowerCase()),
  phone,
});

export const deliveryAddressSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(2, "Bitte den Empfänger angeben.")
    .max(100),
  street: z.string().trim().min(2, "Bitte die Straße angeben.").max(120),
  houseNumber: z.string().trim().min(1, "Hausnummer?").max(10),
  addressLine2: z.string().trim().max(120).optional(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Bitte eine gültige Postleitzahl angeben."),
  city: z.string().trim().min(2, "Bitte den Ort angeben.").max(80),
  deliveryNotes: z.string().trim().max(300).optional(),
});

export const checkoutSchema = z
  .object({
    contact: contactSchema,
    deliveryMethod: z.enum(["DELIVERY", "PICKUP", "DINE_IN"]),
    /** Either a saved address (logged-in) or a new address payload. */
    addressId: z.string().cuid().optional(),
    address: deliveryAddressSchema.optional(),
    saveAddress: z.boolean().optional().default(false),
    /** null/undefined = as soon as possible. ISO string when scheduled. */
    scheduledFor: z.string().datetime().optional(),
    customerNotes: z.string().trim().max(500).optional(),
    tip: z
      .number()
      .int()
      .min(0)
      .max(50_000, "Trinkgeld ist auf 500 € begrenzt."),
    paymentProvider: z.enum(["STRIPE", "CASH_ON_DELIVERY", "PAY_AT_PICKUP"]),
    couponCode: z.string().trim().max(40).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMethod === "DELIVERY") {
      if (!data.addressId && !data.address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address"],
          message: "Für die Lieferung wird eine Adresse benötigt.",
        });
      }
      if (data.paymentProvider === "PAY_AT_PICKUP") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentProvider"],
          message:
            "„Bezahlung bei Abholung“ ist nur für Abholung/Vor Ort möglich.",
        });
      }
    } else if (data.paymentProvider === "CASH_ON_DELIVERY") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentProvider"],
        message: "Barzahlung bei Lieferung ist nur bei Lieferung möglich.",
      });
    }
    if (data.scheduledFor) {
      const scheduled = new Date(data.scheduledFor);
      const minLead = Date.now() + 40 * 60_000;
      const maxAhead = Date.now() + 7 * 86_400_000;
      if (scheduled.getTime() < minLead) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledFor"],
          message: "Vorbestellungen benötigen mindestens 45 Minuten Vorlauf.",
        });
      }
      if (scheduled.getTime() > maxAhead) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledFor"],
          message: "Vorbestellungen sind bis maximal 7 Tage im Voraus möglich.",
        });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const trackOrderSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .regex(
      /^SR-\d{4}-\d{6}$/i,
      "Bestellnummern haben das Format SR-2026-000123.",
    )
    .transform((v) => v.toUpperCase()),
  email: z
    .string()
    .trim()
    .email("Bitte die E-Mail-Adresse der Bestellung angeben.")
    .transform((v) => v.toLowerCase()),
});

export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
