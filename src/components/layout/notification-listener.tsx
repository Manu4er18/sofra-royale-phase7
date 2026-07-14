"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getPusherClient, clientChannels } from "@/lib/realtime/client";

/**
 * Subscribes the logged-in user to their private channel and surfaces
 * live notifications as toasts, refreshing server components so the
 * header unread badge updates without a manual reload. No-ops when
 * realtime is unconfigured.
 */
export function NotificationListener({ userId }: { userId: string }) {
  const router = useRouter();

  React.useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(clientChannels.user(userId));

    const onNotification = (data: {
      title: string;
      body: string;
      href?: string | null;
    }) => {
      toast(data.title, {
        description: data.body,
        action: data.href
          ? { label: "Ansehen", onClick: () => router.push(data.href!) }
          : undefined,
      });
      router.refresh();
    };

    channel.bind("notification", onNotification);
    return () => {
      channel.unbind("notification", onNotification);
      pusher.unsubscribe(clientChannels.user(userId));
    };
  }, [userId, router]);

  return null;
}
