import { redirect } from "next/navigation";

import { db } from "@/lib/db";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token) {
    redirect("/login?verified=invalid");
  }

  const record = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.expires < new Date()) {
    redirect("/login?verified=invalid");
  }

  await db.user.update({
    where: { email: record.identifier.toLowerCase() },
    data: { emailVerified: new Date(), isActive: true },
  });

  redirect("/login?verified=1");
}
