import { NextResponse } from "next/server";

import { getMyConversation, toMessageViews } from "@/lib/services/chat";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat — current customer's active conversation (if any) for
 * hydrating the floating chat widget. Ownership is enforced inside
 * getMyConversation (session or guest cookie).
 */
export async function GET() {
  const conversation = await getMyConversation();
  if (!conversation) {
    return NextResponse.json(
      { conversation: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    {
      conversation: {
        id: conversation.id,
        status: conversation.status,
        isBlocked: conversation.customer?.isChatBlocked ?? false,
        messages: toMessageViews(conversation.messages),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
