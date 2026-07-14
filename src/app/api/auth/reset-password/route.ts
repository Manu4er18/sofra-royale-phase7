import * as crypto from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations/auth";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Bitte überprüfen Sie Ihre Eingaben.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expires: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expires < new Date()) {
    return NextResponse.json(
      { ok: false, error: "Dieser Link ist ungültig oder abgelaufen." },
      { status: 400 },
    );
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

  const user = await db.user.findUnique({
    where: { id: record.userId },
    select: { email: true },
  });

  return NextResponse.json({ ok: true, email: user?.email ?? null });
}
