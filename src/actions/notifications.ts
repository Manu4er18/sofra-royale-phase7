"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";

export type NotificationActionResult =
  | { success: true }
  | { success: false; error: string };

export async function markNotificationRead(
  rawId: unknown,
): Promise<NotificationActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Bitte melden Sie sich an." };
    }
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success) {
      return { success: false, error: "Ungültige Benachrichtigung." };
    }

    await db.notification.updateMany({
      where: { id: parsed.data, userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[markNotificationRead]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Bitte melden Sie sich an." };
    }
    await db.notification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[markAllNotificationsRead]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}
