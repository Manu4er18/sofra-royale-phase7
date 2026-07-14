import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { STAFF_ROLES } from "@/lib/auth/rbac";
import { authorizeChannel, isRealtimeConfigured } from "@/lib/realtime/server";

export const dynamic = "force-dynamic";

/**
 * Pusher private/presence channel authorization.
 *
 * Enforces that a socket may only subscribe to channels it owns:
 * - private-user-<id>: must be that user
 * - private-chat-<conversationId>: participant or staff
 * - private-staff-chat: staff only
 */
export async function POST(request: Request) {
  if (!isRealtimeConfigured()) {
    return NextResponse.json({ error: "Realtime disabled" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");
  if (!socketId || !channel) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const isStaff = STAFF_ROLES.includes(session.user.role);

  // --- authorization rules -------------------------------------------
  if (channel === "private-staff-chat") {
    if (!isStaff)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (channel.startsWith("private-user-")) {
    const userId = channel.slice("private-user-".length);
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (channel.startsWith("private-chat-")) {
    const conversationId = channel.slice("private-chat-".length);
    const conversation = await db.chatConversation.findUnique({
      where: { id: conversationId },
      select: { customerId: true },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const isOwner = conversation.customerId === session.user.id;
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authResponse = authorizeChannel(socketId, channel);
  if (!authResponse) {
    return NextResponse.json({ error: "Realtime disabled" }, { status: 503 });
  }
  return NextResponse.json(authResponse);
}
