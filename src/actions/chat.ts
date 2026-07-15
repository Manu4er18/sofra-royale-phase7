"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { STAFF_ROLES, requireRole, AuthorizationError } from "@/lib/auth/rbac";
import {
  chatNoteSchema,
  sendMessageSchema,
  staffReplySchema,
  startChatSchema,
} from "@/lib/validations/chat";
import { CHAT_COOKIE } from "@/lib/services/chat";
import { storeChatCallSignal } from "@/lib/services/chat-call-signals";
import { channels, trigger } from "@/lib/realtime/server";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/utils";

export type ChatActionResult =
  | {
      success: true;
      conversationId: string;
      message?: string;
      isBlocked?: boolean;
      status?: string;
    }
  | { success: false; error: string };

type ChatCallSignalResult =
  { success: true; conversationId: string } | { success: false; error: string };

const chatCallSignalSchema = z.object({
  conversationId: z.string().cuid(),
  callId: z.string().min(8).max(80),
  action: z.enum([
    "request",
    "accept",
    "decline",
    "end",
    "offer",
    "answer",
    "ice",
  ]),
  payload: z.unknown().optional(),
});

async function pushMessage(
  conversationId: string,
  message: {
    id: string;
    senderType: string;
    type: string;
    body: string | null;
    imageUrl: string | null;
    sender?: {
      name: string | null;
      email: string | null;
      image: string | null;
    } | null;
    createdAt: Date;
    readAt?: Date | null;
  },
) {
  const payload = {
    id: message.id,
    senderType: message.senderType,
    type: message.type,
    body: message.body,
    imageUrl: message.imageUrl,
    senderName: message.sender?.name ?? message.sender?.email ?? null,
    senderImage: message.sender?.image ?? null,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString() ?? null,
  };
  await trigger(channels.chat(conversationId), "message", payload);
}

async function createCallTimelineMessage(
  conversationId: string,
  senderType: "CUSTOMER" | "STAFF",
  senderId: string | null,
  action: "request" | "accept" | "decline" | "end",
) {
  const labelByAction: Record<typeof action, string> = {
    request:
      senderType === "CUSTOMER"
        ? "Video call requested by customer."
        : "Video call started by team.",
    accept: "Video call accepted.",
    decline: "Video call declined.",
    end: "Video call ended.",
  };

  const message = await db.chatMessage.create({
    data: {
      conversationId,
      senderId,
      senderType: "SYSTEM",
      type: "TEXT",
      body: labelByAction[action],
      imageUrl: null,
    },
    include: {
      sender: { select: { name: true, email: true, image: true } },
    },
  });
  await pushMessage(conversationId, message);
}

/** Start a conversation (customer or guest) with a first message. */
export async function startChat(rawInput: unknown): Promise<ChatActionResult> {
  try {
    const parsed = startChatSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe.",
      };
    }
    const input = parsed.data;
    const session = await auth();
    const body = input.message?.trim() || null;

    // Abuse guard.
    const key = `chat:start:${session?.user?.id ?? input.guestEmail ?? "anon"}`;
    if (!checkRateLimit(key, 5, 10 * 60_000)) {
      return {
        success: false,
        error: "Zu viele Anfragen — bitte kurz warten.",
      };
    }

    if (session?.user?.id) {
      const dbUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: { isChatBlocked: true },
      });
      if (dbUser?.isChatBlocked) {
        return {
          success: false,
          error: "Chat ist für dieses Konto deaktiviert.",
        };
      }
      // Reuse an existing open conversation.
      const existing = await db.chatConversation.findFirst({
        where: { customerId: session.user.id, status: { not: "ARCHIVED" } },
        orderBy: { updatedAt: "desc" },
      });
      if (existing) {
        return sendMessage({
          conversationId: existing.id,
          body,
          imageUrl: input.imageUrl,
        });
      }
    }

    const conversation = await db.chatConversation.create({
      data: {
        customerId: session?.user?.id ?? null,
        guestName: session ? null : input.guestName || null,
        guestEmail: session ? null : input.guestEmail || null,
        subject: input.subject || null,
        status: "OPEN",
        messages: {
          create: {
            senderId: session?.user?.id ?? null,
            senderType: "CUSTOMER",
            type: input.imageUrl ? "IMAGE" : "TEXT",
            body,
            imageUrl: input.imageUrl ?? null,
          },
        },
      },
      include: {
        messages: {
          include: {
            sender: { select: { name: true, email: true, image: true } },
          },
        },
      },
    });

    // Guests: remember the conversation via cookie.
    if (!session?.user?.id) {
      (await cookies()).set(CHAT_COOKIE, conversation.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 86_400,
        path: "/",
      });
    }

    const firstMessage = conversation.messages[0];
    if (firstMessage) await pushMessage(conversation.id, firstMessage);
    // Notify staff inbox.
    void trigger(channels.staffChat, "new-conversation", {
      id: conversation.id,
    });

    return {
      success: true,
      conversationId: conversation.id,
      message: "Chat gestartet — unser Team meldet sich in Kürze.",
    };
  } catch (error) {
    console.error("[startChat]", getErrorMessage(error));
    return { success: false, error: "Chat konnte nicht gestartet werden." };
  }
}

/** Customer sends a message into their conversation. */
export async function sendMessage(
  rawInput: unknown,
): Promise<ChatActionResult> {
  try {
    const parsed = sendMessageSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: "Ungültige Nachricht." };
    }
    const { conversationId, imageUrl } = parsed.data;
    const body = parsed.data.body?.trim() || null;
    const session = await auth();

    const conversation = await db.chatConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, customerId: true, status: true },
    });
    if (!conversation) {
      return { success: false, error: "Unterhaltung nicht gefunden." };
    }

    // Ownership: logged-in customer OR guest cookie holder.
    if (conversation.customerId) {
      if (conversation.customerId !== session?.user?.id) {
        return {
          success: false,
          error: "Kein Zugriff auf diese Unterhaltung.",
        };
      }
      const dbUser = await db.user.findUnique({
        where: { id: session!.user.id },
        select: { isChatBlocked: true },
      });
      if (dbUser?.isChatBlocked) {
        return {
          success: false,
          error: "Chat ist für dieses Konto deaktiviert.",
        };
      }
    } else {
      const token = (await cookies()).get(CHAT_COOKIE)?.value;
      if (token !== conversation.id) {
        return {
          success: false,
          error: "Kein Zugriff auf diese Unterhaltung.",
        };
      }
    }

    if (!checkRateLimit(`chat:msg:${conversationId}`, 30, 60_000)) {
      return { success: false, error: "Zu viele Nachrichten — kurz warten." };
    }

    const message = await db.chatMessage.create({
      data: {
        conversationId,
        senderId: session?.user?.id ?? null,
        senderType: "CUSTOMER",
        type: imageUrl ? "IMAGE" : "TEXT",
        body,
        imageUrl: imageUrl ?? null,
      },
      include: {
        sender: { select: { name: true, email: true, image: true } },
      },
    });
    await db.chatConversation.update({
      where: { id: conversationId },
      // Re-open if staff had resolved it.
      data: { status: conversation.status === "RESOLVED" ? "OPEN" : undefined },
    });

    await pushMessage(conversationId, message);
    void trigger(channels.staffChat, "activity", { id: conversationId });

    return { success: true, conversationId };
  } catch (error) {
    console.error("[sendMessage]", getErrorMessage(error));
    return { success: false, error: "Nachricht konnte nicht gesendet werden." };
  }
}

/** Typing indicator (best-effort, no persistence). */
export async function sendTyping(conversationId: unknown): Promise<void> {
  const parsed = z.string().cuid().safeParse(conversationId);
  if (!parsed.success) return;
  const session = await auth();
  const who =
    session && STAFF_ROLES.includes(session.user.role) ? "STAFF" : "CUSTOMER";
  void trigger(channels.chat(parsed.data), "typing", { who });
}

async function canSignalConversation(conversationId: string) {
  const session = await auth();
  const conversation = await db.chatConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      customerId: true,
      guestName: true,
      guestEmail: true,
      customer: { select: { name: true, email: true, isChatBlocked: true } },
    },
  });
  if (!conversation) return null;

  const isStaff = Boolean(
    session?.user && STAFF_ROLES.includes(session.user.role),
  );
  if (isStaff) {
    return {
      conversation,
      senderType: "STAFF" as const,
      senderName: session?.user.name ?? session?.user.email ?? "Team",
      senderId: session?.user.id ?? null,
    };
  }

  if (conversation.customerId) {
    if (conversation.customerId !== session?.user?.id) return null;
    if (conversation.customer?.isChatBlocked) return null;
  } else {
    const token = (await cookies()).get(CHAT_COOKIE)?.value;
    if (token !== conversation.id) return null;
  }

  return {
    conversation,
    senderType: "CUSTOMER" as const,
    senderName:
      conversation.customer?.name ??
      conversation.guestName ??
      conversation.customer?.email ??
      conversation.guestEmail ??
      "Gast",
    senderId: session?.user?.id ?? null,
  };
}

/** WebRTC call signaling. Media streams stay peer-to-peer; only metadata travels through Pusher. */
export async function sendChatCallSignal(
  rawInput: unknown,
): Promise<ChatCallSignalResult> {
  try {
    const parsed = chatCallSignalSchema.safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültiges Signal." };
    const { conversationId, callId, action, payload } = parsed.data;

    if (!checkRateLimit(`chat:call:${conversationId}`, 120, 60_000)) {
      return { success: false, error: "Zu viele Call-Signale." };
    }

    const access = await canSignalConversation(conversationId);
    if (!access) {
      return { success: false, error: "Kein Zugriff auf diese Unterhaltung." };
    }

    const signal = {
      conversationId,
      callId,
      action,
      payload,
      senderType: access.senderType,
      senderName: access.senderName,
      sentAt: new Date().toISOString(),
    };

    storeChatCallSignal(signal);
    await trigger(channels.chat(conversationId), "call-signal", signal);
    if (["request", "accept", "decline", "end"].includes(action)) {
      await createCallTimelineMessage(
        conversationId,
        access.senderType,
        access.senderId,
        action as "request" | "accept" | "decline" | "end",
      );
    }
    if (action === "request" && access.senderType === "CUSTOMER") {
      await trigger(channels.staffChat, "incoming-call", signal);
    }

    return { success: true, conversationId };
  } catch (error) {
    console.error("[sendChatCallSignal]", getErrorMessage(error));
    return {
      success: false,
      error: "Call-Signal konnte nicht gesendet werden.",
    };
  }
}

// ---------------------------------------------------------------------------
// Staff actions
// ---------------------------------------------------------------------------

export async function staffReply(rawInput: unknown): Promise<ChatActionResult> {
  try {
    const staff = await requireRole("STAFF");
    const parsed = staffReplySchema.safeParse(rawInput);
    if (!parsed.success)
      return { success: false, error: "Ungültige Nachricht." };
    const { conversationId, imageUrl } = parsed.data;
    const body = parsed.data.body?.trim() || null;

    const conversation = await db.chatConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, customerId: true, firstResponseAt: true },
    });
    if (!conversation) return { success: false, error: "Nicht gefunden." };

    const message = await db.chatMessage.create({
      data: {
        conversationId,
        senderId: staff.id,
        senderType: "STAFF",
        type: imageUrl ? "IMAGE" : "TEXT",
        body,
        imageUrl: imageUrl ?? null,
      },
      include: {
        sender: { select: { name: true, email: true, image: true } },
      },
    });
    await db.chatConversation.update({
      where: { id: conversationId },
      data: {
        status: "ASSIGNED",
        assignedToId: staff.id,
        firstResponseAt: conversation.firstResponseAt ?? new Date(),
      },
    });

    await pushMessage(conversationId, message);

    // In-app notification to a logged-in customer.
    if (conversation.customerId) {
      const notificationBody =
        body ??
        (imageUrl ? "Das Team hat ein Bild gesendet." : "Neue Chat-Nachricht.");
      await db.notification.create({
        data: {
          userId: conversation.customerId,
          type: "CHAT",
          title: "Neue Nachricht vom Team",
          body:
            notificationBody.length > 80
              ? `${notificationBody.slice(0, 80)}…`
              : notificationBody,
          href: "/account/notifications?chat=1",
        },
      });
      void trigger(channels.user(conversation.customerId), "notification", {
        title: "Neue Nachricht vom Team",
        body: notificationBody,
        href: "/account/notifications?chat=1",
      });
    }

    return { success: true, conversationId };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[staffReply]", getErrorMessage(error));
    return { success: false, error: "Antwort fehlgeschlagen." };
  }
}

export async function resolveConversation(
  rawId: unknown,
): Promise<ChatActionResult> {
  try {
    const staff = await requireRole("STAFF");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success) return { success: false, error: "Ungültig." };
    await db.chatConversation.update({
      where: { id: parsed.data },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await logAudit({
      userId: staff.id,
      action: "chat.resolved",
      entity: "ChatConversation",
      entityId: parsed.data,
    });
    revalidatePath("/admin/messages");
    return {
      success: true,
      conversationId: parsed.data,
      message: "Als gelöst markiert.",
    };
  } catch (error) {
    console.error("[resolveConversation]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

export async function saveChatNote(
  rawInput: unknown,
): Promise<ChatActionResult> {
  try {
    await requireRole("STAFF");
    const parsed = chatNoteSchema.safeParse(rawInput);
    if (!parsed.success) return { success: false, error: "Ungültig." };
    await db.chatConversation.update({
      where: { id: parsed.data.conversationId },
      data: { internalNotes: parsed.data.note || null },
    });
    revalidatePath("/admin/messages");
    return {
      success: true,
      conversationId: parsed.data.conversationId,
      message: "Notiz gespeichert.",
    };
  } catch (error) {
    console.error("[saveChatNote]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

export async function blockChatUser(
  rawConversationId: unknown,
): Promise<ChatActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = z.string().cuid().safeParse(rawConversationId);
    if (!parsed.success) return { success: false, error: "Ungültig." };
    const conversation = await db.chatConversation.findUnique({
      where: { id: parsed.data },
      select: {
        customerId: true,
        status: true,
        customer: { select: { isChatBlocked: true } },
      },
    });
    if (!conversation?.customerId) {
      return {
        success: false,
        error: "Gastunterhaltungen können nur archiviert werden.",
      };
    }
    const nextBlocked = !conversation.customer?.isChatBlocked;
    const nextStatus =
      !nextBlocked && conversation.status === "ARCHIVED"
        ? "OPEN"
        : conversation.status;

    await db.$transaction([
      db.user.update({
        where: { id: conversation.customerId },
        data: { isChatBlocked: nextBlocked },
      }),
      db.chatConversation.update({
        where: { id: parsed.data },
        data: { status: nextStatus },
      }),
    ]);
    await logAudit({
      userId: staff.id,
      action: nextBlocked ? "chat.user_blocked" : "chat.user_unblocked",
      entity: "User",
      entityId: conversation.customerId,
    });
    void trigger(channels.chat(parsed.data), "access", {
      isBlocked: nextBlocked,
      status: nextStatus,
    });
    void trigger(channels.staffChat, "activity", { id: parsed.data });
    revalidatePath("/admin/messages");
    return {
      success: true,
      conversationId: parsed.data,
      isBlocked: nextBlocked,
      status: nextStatus,
      message: nextBlocked ? "Nutzer blockiert." : "Nutzer entsperrt.",
    };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[blockChatUser]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}
