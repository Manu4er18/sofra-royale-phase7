import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DeleteAccountCard,
  PasswordForm,
  ProfileForm,
} from "@/components/account/settings-forms";

export const metadata: Metadata = {
  title: "Einstellungen",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      phone: true,
      marketingOptIn: true,
      hashedPassword: true,
      email: true,
    },
  });
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Einstellungen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Angemeldet als {user.email}
        </p>
      </div>
      <ProfileForm
        initial={{
          name: user.name ?? "",
          phone: user.phone ?? "",
          marketingOptIn: user.marketingOptIn,
        }}
      />
      <PasswordForm hasPassword={!!user.hashedPassword} />
      <DeleteAccountCard hasPassword={!!user.hashedPassword} />
    </div>
  );
}
