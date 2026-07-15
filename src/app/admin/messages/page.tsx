import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasMinimumRole } from "@/lib/auth/rbac";
import {
  getStaffUnreadChatSummaries,
  toMessageViews,
} from "@/lib/services/chat";
import {
  AdminChat,
  type ConversationListItem,
} from "@/components/chat/admin-chat";

export const metadata: Metadata = {
  title: "Admin — Messages",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function AdminMessagesPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const activeId = typeof searchParams.c === "string" ? searchParams.c : null;

  const session = await auth();
  const canBlock = session?.user
    ? hasMinimumRole(session.user.role, "MANAGER")
    : false;

  if (activeId) {
    const unread: Prisma.ChatMessageWhereInput = {
      conversationId: activeId,
      senderType: "CUSTOMER",
      readAt: null,
    };
    await db.chatMessage.updateMany({
      where: unread,
      data: { readAt: new Date() },
    });
  }

  const [conversationList, unreadSummary] = await Promise.all([
    db.chatConversation.findMany({
      where: {
        OR: [
          { status: { not: "ARCHIVED" } },
          { customer: { isChatBlocked: true } },
        ],
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 50,
      include: {
        customer: { select: { name: true, email: true, isChatBlocked: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, imageUrl: true },
        },
      },
    }),
    getStaffUnreadChatSummaries(),
  ]);

  const unreadByConversation = new Map(
    unreadSummary.conversations.map((summary) => [
      summary.conversationId,
      summary.unreadIncomingCount,
    ]),
  );

  const conversations: ConversationListItem[] = conversationList.map((c) => ({
    id: c.id,
    who: c.customer?.name ?? c.guestName ?? "Gast",
    contact: c.customer?.email ?? c.guestEmail ?? "",
    status: c.status,
    isBlocked: c.customer?.isChatBlocked ?? false,
    lastMessage:
      c.messages[0]?.body ??
      (c.messages[0]?.imageUrl ? "(Anhang)" : "(kein Text)"),
    updatedAt: c.updatedAt.toISOString(),
    unreadCount: unreadByConversation.get(c.id) ?? 0,
  }));

  let initialMessages: ReturnType<typeof toMessageViews> = [];
  let initialNote = "";
  let initialStatus = "OPEN";
  let initialIsBlocked = false;
  if (activeId) {
    const active = await db.chatConversation.findUnique({
      where: { id: activeId },
      include: {
        customer: { select: { isChatBlocked: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            senderType: true,
            type: true,
            body: true,
            imageUrl: true,
            createdAt: true,
            readAt: true,
          },
        },
      },
    });
    if (active) {
      initialMessages = toMessageViews(active.messages);
      initialNote = active.internalNotes ?? "";
      initialStatus = active.status;
      initialIsBlocked = active.customer?.isChatBlocked ?? false;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Asynchroner Posteingang mit Bildern, Dokumenten, Audio, Video und
          ungelesenen Zählern.
        </p>
      </div>
      <AdminChat
        conversations={conversations}
        initialActive={activeId}
        initialMessages={initialMessages.map((m) => ({
          id: m.id,
          senderType: m.senderType,
          body: m.body,
          imageUrl: m.imageUrl,
          createdAt: m.createdAt,
        }))}
        initialNote={initialNote}
        initialStatus={initialStatus}
        initialIsBlocked={initialIsBlocked}
        initialUnreadTotal={unreadSummary.totalUnread}
        canBlock={canBlock}
      />
    </div>
  );
}
