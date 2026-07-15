import "server-only";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * Chat service — conversation lookup for customers (logged-in or guest
 * via a cookie token) and staff.
 */

export const CHAT_COOKIE = "sr_chat";

export type ChatMessageView = {
  id: string;
  senderType: "CUSTOMER" | "STAFF" | "SYSTEM";
  type: "TEXT" | "IMAGE";
  body: string | null;
  imageUrl: string | null;
  senderName: string | null;
  senderImage: string | null;
  createdAt: string;
  readAt: string | null;
};

export type LiveChatMessageView = ChatMessageView;

export type PersistentMessageSummary = {
  conversationId: string;
  unreadIncomingCount: number;
};

const messageSelect = {
  id: true,
  senderType: true,
  type: true,
  body: true,
  imageUrl: true,
  sender: { select: { name: true, email: true, image: true } },
  createdAt: true,
  readAt: true,
} as const;

/** The current customer's active conversation (or null). */
export async function getMyConversation() {
  const session = await auth();
  if (session?.user?.id) {
    return db.chatConversation.findFirst({
      where: {
        customerId: session.user.id,
        status: { not: "ARCHIVED" },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { isChatBlocked: true } },
        messages: { orderBy: { createdAt: "asc" }, select: messageSelect },
      },
    });
  }
  const token = (await cookies()).get(CHAT_COOKIE)?.value;
  if (!token) return null;
  return db.chatConversation.findFirst({
    where: { id: token, status: { not: "ARCHIVED" } },
    include: {
      customer: { select: { isChatBlocked: true } },
      messages: { orderBy: { createdAt: "asc" }, select: messageSelect },
    },
  });
}

export function toMessageViews(
  messages: Array<{
    id: string;
    senderType: "CUSTOMER" | "STAFF" | "SYSTEM";
    type: "TEXT" | "IMAGE";
    body: string | null;
    imageUrl: string | null;
    sender?: {
      name: string | null;
      email: string | null;
      image: string | null;
    } | null;
    createdAt: Date;
    readAt: Date | null;
  }>,
): ChatMessageView[] {
  return messages.map((m) => ({
    id: m.id,
    senderType: m.senderType,
    type: m.type,
    body: m.body,
    imageUrl: m.imageUrl,
    senderName: m.sender?.name ?? m.sender?.email ?? null,
    senderImage: m.sender?.image ?? null,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }));
}

export async function getCustomerUnreadChatCount() {
  const conversation = await getMyConversation();
  if (!conversation) return 0;
  return conversation.messages.filter(
    (message) => message.senderType === "STAFF" && !message.readAt,
  ).length;
}

export async function getStaffUnreadChatSummaries(): Promise<{
  totalUnread: number;
  conversations: PersistentMessageSummary[];
}> {
  const conversations = await db.chatConversation.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: {
      id: true,
      _count: {
        select: {
          messages: {
            where: {
              senderType: "CUSTOMER",
              readAt: null,
            },
          },
        },
      },
    },
  });

  const summaries = conversations.map((conversation) => ({
    conversationId: conversation.id,
    unreadIncomingCount: conversation._count.messages,
  }));

  return {
    totalUnread: summaries.reduce(
      (total, summary) => total + summary.unreadIncomingCount,
      0,
    ),
    conversations: summaries,
  };
}

/** Staff inbox counts + list helpers. */
export async function getStaffChatSummary() {
  const [open, assigned] = await Promise.all([
    db.chatConversation.count({ where: { status: "OPEN" } }),
    db.chatConversation.count({ where: { status: "ASSIGNED" } }),
  ]);
  return { open, assigned };
}
