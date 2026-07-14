"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notifications";
import { saveNotificationPreferences } from "@/actions/account";
import type { NotificationPreferences } from "@/lib/validations/account";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationList({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const unread = notifications.filter((n) => !n.readAt).length;

  function markRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Mitteilungen</CardTitle>
          <CardDescription>
            {unread > 0 ? `${unread} ungelesen` : "Alles gelesen"}
          </CardDescription>
        </div>
        {unread > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={markAll}
            disabled={isPending}
          >
            <CheckCheck /> Alle als gelesen markieren
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Bell className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">
              Noch keine Benachrichtigungen — Bestell- und Reservierungs-Updates
              erscheinen hier.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {notifications.map((notification) => {
              const href =
                notification.type === "CHAT"
                  ? "/account/notifications?chat=1"
                  : notification.href;
              return (
              <li
                key={notification.id}
                className={cn(
                  "flex gap-3 py-4",
                  !notification.readAt && "bg-gold/5 -mx-2 rounded-md px-2",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    notification.readAt ? "bg-border" : "bg-gold",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {notification.body}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("de-DE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(notification.createdAt))}
                  </p>
                  <div className="mt-1.5 flex gap-3 text-xs">
                    {href ? (
                      <Link
                        href={href}
                        className="font-medium text-primary underline-offset-4 hover:underline dark:text-gold"
                        onClick={() => {
                          markRead(notification.id);
                          if (href.includes("chat=1")) {
                            window.dispatchEvent(new Event("sofra:open-chat"));
                          }
                        }}
                      >
                        Ansehen
                      </Link>
                    ) : null}
                    {!notification.readAt ? (
                      <button
                        type="button"
                        onClick={() => markRead(notification.id)}
                        className="text-muted-foreground underline-offset-4 hover:underline"
                      >
                        Als gelesen markieren
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const PREF_LABELS: Array<{
  key: keyof NotificationPreferences;
  label: string;
}> = [
  { key: "orderUpdatesInApp", label: "Bestell-Updates in der App" },
  {
    key: "orderUpdatesEmail",
    label: "Bestell-Updates per E-Mail (ab Phase 6)",
  },
  { key: "promotionsInApp", label: "Angebote & Aktionen in der App" },
  {
    key: "promotionsEmail",
    label: "Angebote & Aktionen per E-Mail (ab Phase 6)",
  },
];

export function NotificationPreferencesForm({
  initial,
}: {
  initial: NotificationPreferences;
}) {
  const [prefs, setPrefs] = React.useState(initial);
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveNotificationPreferences(prefs);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Einstellungen</CardTitle>
        <CardDescription>
          Wählen Sie, worüber wir Sie informieren dürfen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          {PREF_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={prefs[key]}
                onCheckedChange={(c) =>
                  setPrefs((p) => ({ ...p, [key]: c === true }))
                }
              />
              {label}
            </label>
          ))}
          <div className="pt-2">
            <Button type="submit" variant="gold" size="sm" loading={isPending}>
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
