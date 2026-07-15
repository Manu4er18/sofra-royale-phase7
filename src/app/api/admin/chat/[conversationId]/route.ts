import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { STAFF_ROLES } from "@/lib/auth/rbac";
import { toMessageViews } from "@/lib/services/chat";
import { channels, trigger } from "@/lib/realtime/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  props: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await props.params;
  const conversation = await db.chatConversation.findUnique({
    where: { id: conversationId },
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
          sender: { select: { name: true, email: true, image: true } },
          createdAt: true,
          readAt: true,
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ conversation: null }, { status: 404 });
  }

  const unreadWhere = {
    conversationId,
    senderType: "CUSTOMER" as const,
    readAt: null,
  };
  const unreadMessages = await db.chatMessage.findMany({
    where: unreadWhere,
    select: { id: true },
  });
  const readAt = new Date();
  await db.chatMessage.updateMany({
    where: unreadWhere,
    data: { readAt },
  });
  if (unreadMessages.length > 0) {
    void trigger(channels.chat(conversationId), "read-receipt", {
      messageIds: unreadMessages.map((message) => message.id),
      readAt: readAt.toISOString(),
    });
  }

  return NextResponse.json(
    {
      conversation: {
        id: conversation.id,
        status: conversation.status,
        isBlocked: conversation.customer?.isChatBlocked ?? false,
        internalNotes: conversation.internalNotes ?? "",
        messages: toMessageViews(conversation.messages).map((message) => ({
          id: message.id,
          senderType: message.senderType,
          body: message.body,
          imageUrl: message.imageUrl,
          senderName: message.senderName,
          senderImage: message.senderImage,
          createdAt: message.createdAt,
          readAt: message.readAt,
        })),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
