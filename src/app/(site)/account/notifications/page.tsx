import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationPreferencesSchema,
} from "@/lib/validations/account";
import {
  NotificationList,
  NotificationPreferencesForm,
  type NotificationRow,
} from "@/components/account/notification-center";

export const metadata: Metadata = {
  title: "Benachrichtigungen",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [notifications, profile] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { notificationPreferences: true },
    }),
  ]);

  const parsedPrefs = notificationPreferencesSchema.safeParse(
    profile?.notificationPreferences,
  );
  const preferences = parsedPrefs.success
    ? parsedPrefs.data
    : DEFAULT_NOTIFICATION_PREFERENCES;

  const rows: NotificationRow[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    href: n.href,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Benachrichtigungen</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <NotificationList notifications={rows} />
        <NotificationPreferencesForm initial={preferences} />
      </div>
    </div>
  );
}
