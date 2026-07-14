"use server";

import * as crypto from "node:crypto";
import { hash } from "bcryptjs";

import { db } from "@/lib/db";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { getErrorMessage } from "@/lib/utils";

export type ResetPasswordResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<ResetPasswordResult> {
  try {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Bitte überprüfen Sie Ihre Eingaben.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);
    const record = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expires: true, usedAt: true },
    });

    if (!record || record.usedAt || record.expires < new Date()) {
      return {
        success: false,
        error: "Dieser Link ist ungültig oder abgelaufen.",
      };
    }

    const hashedPassword = await hash(password, 12);
    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { hashedPassword, emailVerified: new Date(), isActive: true },
      }),
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("[resetPassword]", getErrorMessage(error));
    return {
      success: false,
      error: "Passwort konnte nicht geändert werden.",
    };
  }
}
