"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getPusherClient, clientChannels } from "@/lib/realtime/client";

/**
 * Subscribes to a per-order channel and refreshes the page when the
 * status changes, so customers see live progress without reloading.
 * No-ops when realtime is unconfigured (status still updates on manual
 * refresh). Rendered on order-detail and tracking pages.
 */
export function OrderLiveStatus({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();

  React.useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(clientChannels.order(orderNumber));

    const onStatus = (data: { statusLabel?: string }) => {
      if (data.statusLabel) {
        toast(`Bestellung ${orderNumber}`, { description: data.statusLabel });
      }
      router.refresh();
    };

    channel.bind("status", onStatus);
    return () => {
      channel.unbind("status", onStatus);
      pusher.unsubscribe(clientChannels.order(orderNumber));
    };
  }, [orderNumber, router]);

  return null;
}
