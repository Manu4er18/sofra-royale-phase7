import { z } from "zod";

/** Account-area validation schemas (profile, password, addresses …). */

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Der Name muss mindestens 2 Zeichen lang sein.")
    .max(100),
  phone: z
    .string()
    .trim()
    .max(25)
    .regex(/^$|^[+0-9 ()/-]+$/, "Bitte eine gültige Telefonnummer angeben.")
    .optional()
    .or(z.literal("")),
  marketingOptIn: z.boolean().optional().default(false),
});

export type ProfileInput = z.infer<typeof profileSchema>;

const newPassword = z
  .string()
  .min(10, "Das Passwort muss mindestens 10 Zeichen lang sein.")
  .max(128)
  .regex(/[a-z]/, "Mindestens ein Kleinbuchstabe erforderlich.")
  .regex(/[A-Z]/, "Mindestens ein Großbuchstabe erforderlich.")
  .regex(/[0-9]/, "Mindestens eine Ziffer erforderlich.");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Bitte aktuelles Passwort eingeben."),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Die Passwörter stimmen nicht überein.",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const addressSchema = z.object({
  id: z.string().cuid().optional(),
  label: z.string().trim().max(40).optional().or(z.literal("")),
  type: z.enum(["HOME", "WORK", "OTHER"]).default("HOME"),
  recipientName: z
    .string()
    .trim()
    .min(2, "Bitte den Empfänger angeben.")
    .max(100),
  phone: z
    .string()
    .trim()
    .min(6, "Bitte eine gültige Telefonnummer angeben.")
    .max(25)
    .regex(/^[+0-9 ()/-]+$/, "Bitte eine gültige Telefonnummer angeben."),
  street: z.string().trim().min(2, "Bitte die Straße angeben.").max(120),
  houseNumber: z.string().trim().min(1, "Hausnummer?").max(10),
  addressLine2: z.string().trim().max(120).optional().or(z.literal("")),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Bitte eine gültige Postleitzahl angeben."),
  city: z.string().trim().min(2, "Bitte den Ort angeben.").max(80),
  deliveryNotes: z.string().trim().max(300).optional().or(z.literal("")),
  isDefault: z.boolean().optional().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const deleteAccountSchema = z.object({
  /** Password for credential accounts; the literal word LÖSCHEN for OAuth. */
  confirmation: z.string().min(1, "Bestätigung erforderlich."),
});

export const notificationPreferencesSchema = z.object({
  orderUpdatesEmail: z.boolean(),
  orderUpdatesInApp: z.boolean(),
  promotionsEmail: z.boolean(),
  promotionsInApp: z.boolean(),
});

export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  orderUpdatesEmail: true,
  orderUpdatesInApp: true,
  promotionsEmail: false,
  promotionsInApp: true,
};
