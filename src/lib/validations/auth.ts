import { z } from "zod";

/**
 * Auth validation schemas — shared by client forms (react-hook-form)
 * and server actions. The server ALWAYS re-validates; client validation
 * is a UX nicety only.
 */

const email = z
  .string()
  .min(1, "E-Mail ist erforderlich.")
  .email("Bitte eine gültige E-Mail-Adresse eingeben.")
  .max(254)
  .transform((v) => v.toLowerCase().trim());

const password = z
  .string()
  .min(10, "Das Passwort muss mindestens 10 Zeichen lang sein.")
  .max(128, "Das Passwort darf höchstens 128 Zeichen lang sein.")
  .regex(/[a-z]/, "Mindestens ein Kleinbuchstabe erforderlich.")
  .regex(/[A-Z]/, "Mindestens ein Großbuchstabe erforderlich.")
  .regex(/[0-9]/, "Mindestens eine Ziffer erforderlich.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Passwort ist erforderlich.").max(128),
  remember: z.boolean().optional().default(false),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Der Name muss mindestens 2 Zeichen lang sein.")
      .max(100, "Der Name darf höchstens 100 Zeichen lang sein.")
      .transform((v) => v.trim()),
    email,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({
        message: "Bitte akzeptieren Sie die AGB und Datenschutzerklärung.",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Die Passwörter stimmen nicht überein.",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Die Passwörter stimmen nicht überein.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginFormInput = z.input<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
