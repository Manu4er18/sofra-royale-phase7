"use client";

import PusherClient from "pusher-js";

/**
 * Browser Pusher singleton. Returns null when realtime is not
 * configured, so callers can cleanly skip subscriptions.
 */
let client: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;
  if (!client) {
    client = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return client;
}

/** Same channel-name helpers as the server (kept in sync). */
export const clientChannels = {
  user: (userId: string) => `private-user-${userId}`,
  order: (orderNumber: string) => `order-${orderNumber.toLowerCase()}`,
  chat: (conversationId: string) => `private-chat-${conversationId}`,
  staffChat: "private-staff-chat",
} as const;
