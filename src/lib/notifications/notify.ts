import "server-only";

import type { NotificationType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { siteConfig } from "@/config/site";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationPreferencesSchema,
  type NotificationPreferences,
} from "@/lib/validations/account";
import { trigger, channels } from "@/lib/realtime/server";
import { sendEmail } from "@/lib/notifications/email";
import { sendSms } from "@/lib/notifications/sms";

/**
 * Central notification dispatcher.
 *
 * One call: (1) persists an in-app Notification, (2) pushes it to the
 * user's realtime channel for a live badge/toast, and (3) optionally
 * fans out to email/SMS — always respecting the user's saved
 * preferences and the "promotions vs. order updates" split. Every
 * channel degrades gracefully when its provider is unconfigured.
 *
 * Accepts a Prisma transaction client so it can run inside the same
 * transaction as the state change that triggered it.
 */

type Client = Prisma.TransactionClient | typeof db;

function isPromo(type: NotificationType): boolean {
  return type === "PROMOTION";
}

async function getPreferences(
  client: Client,
  userId: string,
): Promise<NotificationPreferences> {
  const profile = await client.userProfile.findUnique({
    where: { userId },
    select: { notificationPreferences: true },
  });
  const parsed = notificationPreferencesSchema.safeParse(
    profile?.notificationPreferences,
  );
  return parsed.success ? parsed.data : DEFAULT_NOTIFICATION_PREFERENCES;
}

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  /** Provide to enable the email channel for this notification. */
  email?: { to: string; subject: string; html: string };
  /** Provide to enable the SMS channel for this notification. */
  sms?: { to: string; body: string };
};

/**
 * Fire a notification. In-app + realtime are best-effort but attempted
 * always; email/SMS require both a payload AND the user's opt-in.
 */
export async function notify(
  input: NotifyInput,
  client: Client = db,
): Promise<void> {
  // 1. Persist the in-app notification (source of truth).
  const notification = await client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      channel: "IN_APP",
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    },
  });

  const prefs = await getPreferences(client, input.userId);
  const promo = isPromo(input.type);
  const inAppAllowed = promo ? prefs.promotionsInApp : prefs.orderUpdatesInApp;
  const emailAllowed = promo ? prefs.promotionsEmail : prefs.orderUpdatesEmail;

  // 2. Realtime push (fire-and-forget) for a live badge/toast.
  if (inAppAllowed) {
    void trigger(channels.user(input.userId), "notification", {
      id: notification.id,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  // 3. Email fan-out (best-effort; don't block/rollback the caller).
  if (input.email && emailAllowed) {
    void sendEmail(input.email);
  }

  // 4. SMS fan-out (order updates only; SMS has no separate pref yet).
  if (input.sms && !promo) {
    void sendSms(input.sms);
  }
}

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getBaseUrl(): string {
  return (
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(process.env.AUTH_URL) ??
    normalizeBaseUrl(process.env.NEXTAUTH_URL) ??
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeBaseUrl(process.env.VERCEL_URL) ??
    normalizeBaseUrl(siteConfig.url) ??
    "http://localhost:3000"
  );
}

/** Absolute URL builder for links inside emails. */
export function absoluteUrl(path: string): string {
  const pathname = path.startsWith("/") ? path : `/${path}`;
  return `${getBaseUrl()}${pathname}`;
}
