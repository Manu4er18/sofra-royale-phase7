"use server";

import * as crypto from "node:crypto";
import { hash } from "bcryptjs";
import { headers } from "next/headers";

import { db } from "@/lib/db";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getErrorMessage } from "@/lib/utils";
import { sendEmail } from "@/lib/notifications/email";
import { emailVerificationEmail } from "@/emails/templates";
import { absoluteUrl } from "@/lib/notifications/notify";

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Register a new customer account.
 *
 * Security notes:
 * - Full server-side Zod validation (client validation is UX only).
 * - Rate-limited per IP to stop bulk account creation.
 * - Passwords hashed with bcrypt (cost 12); plain text never persisted.
 * - Response for "email already exists" is intentionally identical in
 *   shape to validation errors to limit account enumeration usefulness.
 */
export async function registerUser(
  input: RegisterInput,
): Promise<ActionResult> {
  try {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Bitte überprüfen Sie Ihre Eingaben.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const headerList = await headers();
    const ip =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (!checkRateLimit(`register:${ip}`, 5, 60 * 60_000)) {
      return {
        success: false,
        error: "Zu viele Versuche. Bitte versuchen Sie es später erneut.",
      };
    }

    const { name, email, password } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return {
        success: false,
        error:
          "Mit dieser E-Mail-Adresse ist bereits ein Konto verknüpft. Bitte melden Sie sich an.",
      };
    }

    const hashedPassword = await hash(password, 12);

    const user = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          hashedPassword,
          role: "CUSTOMER",
          isActive: false,
        },
      });
      await tx.userProfile.create({ data: { userId: user.id } });
      await tx.loyaltyAccount.create({ data: { userId: user.id } });
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "user.registered",
          ipAddress: ip,
        },
      });
      return user;
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.verificationToken.deleteMany({ where: { identifier: email } });
    await db.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const verifyUrl = absoluteUrl(
      `/verify-email/${encodeURIComponent(token)}`,
    );
    const verificationEmail = emailVerificationEmail({
      name: user.name ?? "Guten Tag",
      verifyUrl,
    });
    await sendEmail({
      to: email,
      subject: verificationEmail.subject,
      html: verificationEmail.html,
    });

    return { success: true };
  } catch (error) {
    console.error("[registerUser]", getErrorMessage(error));
    return {
      success: false,
      error: "Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    };
  }
}
