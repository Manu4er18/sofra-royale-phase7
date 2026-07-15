import { NextResponse } from "next/server";

import { listChatCallSignals } from "@/lib/services/chat-call-signals";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  const role = url.searchParams.get("role");
  const since = Number(url.searchParams.get("since") ?? "0");

  const signals = await listChatCallSignals({
    conversationId,
    since: Number.isFinite(since) ? since : 0,
    staffWide: role === "STAFF" && !conversationId,
  });

  return NextResponse.json({ signals });
}
