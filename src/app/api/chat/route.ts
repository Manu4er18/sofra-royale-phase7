import { NextResponse } from "next/server";

import { getMyConversation, toMessageViews } from "@/lib/services/chat";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat — current customer's active conversation (if any) for
 * hydrating the floating chat widget. Ownership is enforced inside
 * getMyConversation (session or guest cookie).
 */
export async function GET(request: Request) {
  const markRead = new URL(request.url).searchParams.get("markRead") === "1";
  const conversation = await getMyConversation();
  if (!conversation) {
    return NextResponse.json(
      { conversation: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  let messages = toMessageViews(conversation.messages);
  let unreadCount = messages.filter(
    (message) => message.senderType === "STAFF" && !message.readAt,
  ).length;

  if (markRead && unreadCount > 0) {
    await db.chatMessage.updateMany({
      where: {
        conversationId: conversation.id,
        senderType: "STAFF",
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    messages = messages.map((message) =>
      message.senderType === "STAFF" && !message.readAt
        ? { ...message, readAt: new Date().toISOString() }
        : message,
    );
    unreadCount = 0;
  }

  return NextResponse.json(
    {
      conversation: {
        id: conversation.id,
        status: conversation.status,
        isBlocked: conversation.customer?.isChatBlocked ?? false,
        unreadCount,
        messages,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
