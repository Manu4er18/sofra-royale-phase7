"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";

export type FavoriteResult =
  | { success: true; isFavorite: boolean }
  | { success: false; error: string };

/** Toggle a product in the user's favorites. */
export async function toggleFavorite(
  rawProductId: unknown,
): Promise<FavoriteResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Bitte melden Sie sich an, um Favoriten zu speichern.",
      };
    }
    const parsed = z.string().cuid().safeParse(rawProductId);
    if (!parsed.success) {
      return { success: false, error: "Ungültiges Produkt." };
    }
    const productId = parsed.data;
    const userId = session.user.id;

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return { success: false, error: "Gericht nicht gefunden." };
    }

    const existing = await db.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await db.favorite.delete({
        where: { userId_productId: { userId, productId } },
      });
    } else {
      await db.favorite.create({ data: { userId, productId } });
    }

    revalidatePath("/account/favorites");
    return { success: true, isFavorite: !existing };
  } catch (error) {
    console.error("[toggleFavorite]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}
