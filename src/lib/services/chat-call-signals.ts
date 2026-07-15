import { cookies } from "next/headers";

import { auth } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CHAT_COOKIE } from "@/lib/services/chat";

export type ChatCallAction =
  "request" | "accept" | "decline" | "end" | "offer" | "answer" | "ice";

export type StoredChatCallSignal = {
  id: string;
  conversationId: string;
  callId: string;
  action: ChatCallAction;
  payload?: unknown;
  senderType: "CUSTOMER" | "STAFF";
  senderName?: string;
  sentAt: string;
};

type SignalStore = {
  __srChatCallSignals?: StoredChatCallSignal[];
};

function signalStore() {
  const store = globalThis as typeof globalThis & SignalStore;
  store.__srChatCallSignals ??= [];
  return store.__srChatCallSignals;
}

function pruneSignals() {
  const cutoff = Date.now() - 5 * 60_000;
  const store = signalStore();
  const fresh = store.filter((signal) => Date.parse(signal.sentAt) > cutoff);
  store.splice(0, store.length, ...fresh);
}

export function storeChatCallSignal(signal: Omit<StoredChatCallSignal, "id">) {
  pruneSignals();
  signalStore().push({
    ...signal,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
}

async function canReadConversation(conversationId: string) {
  const session = await auth();
  if (session?.user && STAFF_ROLES.includes(session.user.role)) return true;

  const conversation = await db.chatConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, customerId: true },
  });
  if (!conversation) return false;
  if (conversation.customerId)
    return conversation.customerId === session?.user?.id;

  const token = (await cookies()).get(CHAT_COOKIE)?.value;
  return token === conversation.id;
}

export async function listChatCallSignals({
  conversationId,
  since,
  staffWide = false,
}: {
  conversationId?: string | null;
  since: number;
  staffWide?: boolean;
}) {
  pruneSignals();
  const session = await auth();
  const isStaff = Boolean(
    session?.user && STAFF_ROLES.includes(session.user.role),
  );

  if (staffWide && !isStaff) return [];
  if (conversationId && !(await canReadConversation(conversationId))) return [];
  if (!conversationId && !staffWide) return [];

  return signalStore().filter((signal) => {
    if (Date.parse(signal.sentAt) <= since) return false;
    if (staffWide && isStaff) return true;
    return signal.conversationId === conversationId;
  });
}
