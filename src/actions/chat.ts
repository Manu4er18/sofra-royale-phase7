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

async function pushMessage(
  conversationId: string,
  message: {
    id: string;
    senderType: string;
    type: string;
    body: string | null;
    imageUrl: string | null;
    createdAt: Date;
  },
) {
  const payload = {
    id: message.id,
    senderType: message.senderType,
    type: message.type,
    body: message.body,
    imageUrl: message.imageUrl,
    createdAt: message.createdAt.toISOString(),
  };
  await trigger(channels.chat(conversationId), "message", payload);
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
          body: input.message,
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
            type: "TEXT",
            body: input.message,
          },
        },
      },
      include: { messages: true },
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
    const { conversationId, body, imageUrl } = parsed.data;
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
        body: body || null,
        imageUrl: imageUrl ?? null,
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

// ---------------------------------------------------------------------------
// Staff actions
// ---------------------------------------------------------------------------

export async function staffReply(rawInput: unknown): Promise<ChatActionResult> {
  try {
    const staff = await requireRole("STAFF");
    const parsed = staffReplySchema.safeParse(rawInput);
    if (!parsed.success)
      return { success: false, error: "Ungültige Nachricht." };
    const { conversationId, body } = parsed.data;

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
        type: "TEXT",
        body,
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
      await db.notification.create({
        data: {
          userId: conversation.customerId,
          type: "CHAT",
          title: "Neue Nachricht vom Team",
          body: body.length > 80 ? `${body.slice(0, 80)}…` : body,
          href: "/account/notifications?chat=1",
        },
      });
      void trigger(channels.user(conversation.customerId), "notification", {
        title: "Neue Nachricht vom Team",
        body,
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
    revalidatePath("/admin/chat");
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
    revalidatePath("/admin/chat");
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
    revalidatePath("/admin/chat");
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
