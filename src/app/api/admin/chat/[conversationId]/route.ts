import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { STAFF_ROLES } from "@/lib/auth/rbac";
import { toMessageViews } from "@/lib/services/chat";

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
          createdAt: true,
          readAt: true,
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ conversation: null }, { status: 404 });
  }

  await db.chatMessage.updateMany({
    where: {
      conversationId,
      senderType: "CUSTOMER",
      readAt: null,
    },
    data: { readAt: new Date() },
  });

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
          createdAt: message.createdAt,
        })),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
