import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { toMessageViews } from "@/lib/services/chat";
import {
  AdminChat,
  type ConversationListItem,
} from "@/components/chat/admin-chat";

export const metadata: Metadata = {
  title: "Admin — Live-Chat",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function AdminChatPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const activeId = typeof searchParams.c === "string" ? searchParams.c : null;

  const session = await auth();
  const canBlock = session?.user
    ? hasMinimumRole(session.user.role, "MANAGER")
    : false;

  const conversationList = await db.chatConversation.findMany({
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
        select: { body: true },
      },
    },
  });

  const conversations: ConversationListItem[] = conversationList.map((c) => ({
    id: c.id,
    who: c.customer?.name ?? c.guestName ?? "Gast",
    contact: c.customer?.email ?? c.guestEmail ?? "",
    status: c.status,
    isBlocked: c.customer?.isChatBlocked ?? false,
    lastMessage: c.messages[0]?.body ?? "(kein Text)",
    updatedAt: c.updatedAt.toISOString(),
    unread: c.status === "OPEN",
  }));

  // Active thread messages + note.
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
      // Mark customer messages as read.
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
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Live-Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kundenanfragen in Echtzeit beantworten. Offline eingegangene
          Nachrichten erscheinen hier, sobald jemand online ist.
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
        canBlock={canBlock}
      />
    </div>
  );
}
