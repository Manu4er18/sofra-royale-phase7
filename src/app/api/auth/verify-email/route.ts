import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const token = url.searchParams.get("token")?.trim();

  if (!email || !token) {
    return NextResponse.redirect(new URL("/login?verified=invalid", url));
  }

  const record = await db.verificationToken.findUnique({
    where: { token },
  });
  const user = await db.user.findUnique({
    where: { email },
    select: { emailVerified: true, isActive: true },
  });

  if (!record && user?.emailVerified && user.isActive) {
    return NextResponse.redirect(new URL("/login?verified=1", url));
  }

  if (
    !record ||
    record.identifier.toLowerCase() !== email ||
    record.expires < new Date()
  ) {
    return NextResponse.redirect(new URL("/login?verified=invalid", url));
  }

  await db.user.update({
    where: { email },
    data: { emailVerified: new Date(), isActive: true },
  });

  return NextResponse.redirect(new URL("/login?verified=1", url));
}
