import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendEmail } from "@/lib/notifications/email";
import { absoluteUrl } from "@/lib/notifications/notify";
import { passwordResetEmail } from "@/emails/templates";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid email address." },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true, isActive: true },
  });

  // Avoid account enumeration: successful response even if no account exists.
  if (!user || !user.isActive) {
    return NextResponse.json({ ok: true });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db.$transaction([
    db.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    }),
    db.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expires },
    }),
  ]);

  const resetUrl = absoluteUrl(
    `/reset-password?token=${encodeURIComponent(rawToken)}`,
  );
  const email = passwordResetEmail({
    name: user.name ?? "Guten Tag",
    resetUrl,
  });

  await sendEmail({
    to: user.email,
    subject: email.subject,
    html: email.html,
  });

  return NextResponse.json({ ok: true });
}
