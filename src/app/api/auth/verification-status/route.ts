import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.pick({ email: true }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { emailVerified: true, isActive: true },
  });

  return NextResponse.json({
    ok: true,
    exists: Boolean(user),
    verified: Boolean(user?.emailVerified && user?.isActive),
  });
}
