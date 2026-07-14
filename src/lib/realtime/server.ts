import "server-only";

import Pusher from "pusher";

/**
 * Server-side Pusher (Channels) client with graceful degradation.
 *
 * Without PUSHER_* keys the app still works fully — realtime pushes
 * simply no-op (features fall back to on-refresh updates). This mirrors
 * the Stripe approach: optional infra, never a hard dependency.
 */
let client: Pusher | null = null;

export function isRealtimeConfigured(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  );
}

function getPusher(): Pusher | null {
  if (!isRealtimeConfigured()) return null;
  if (!client) {
    client = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return client;
}

/** Channel-name helpers keep naming consistent across the app. */
export const channels = {
  /** Private per-user channel: notifications, unread counts. */
  user: (userId: string) => `private-user-${userId}`,
  /** Per-order channel for live status (public — order number is a secret-ish token). */
  order: (orderNumber: string) => `order-${orderNumber.toLowerCase()}`,
  /** Private per-conversation chat channel. */
  chat: (conversationId: string) => `private-chat-${conversationId}`,
  /** Presence-style staff inbox channel (new chats / messages). */
  staffChat: "private-staff-chat",
} as const;

/**
 * Fire-and-forget event push. Never throws into the caller — realtime
 * is best-effort; the database write is the source of truth.
 */
export async function trigger(
  channel: string | string[],
  event: string,
  data: unknown,
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;
  try {
    await pusher.trigger(channel, event, data);
  } catch (error) {
    console.error("[realtime] trigger failed", error);
  }
}

/** Authorize a private/presence channel subscription. */
export function authorizeChannel(socketId: string, channel: string) {
  const pusher = getPusher();
  if (!pusher) return null;
  return pusher.authorizeChannel(socketId, channel);
}
