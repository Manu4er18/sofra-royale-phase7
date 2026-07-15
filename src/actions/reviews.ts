"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { reviewSchema, updateReviewSchema } from "@/lib/validations/review";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getErrorMessage } from "@/lib/utils";

export type ReviewActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

/** Recompute the denormalized rating aggregates on a product. */
async function recomputeAggregates(productId: string) {
  const agg = await db.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });
  await db.product.update({
    where: { id: productId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      reviewCount: agg._count,
    },
  });
}

/**
 * Create a review. Verified-purchase status is derived server-side from
 * the user's completed orders — never from client input. New reviews
 * start PENDING and appear publicly after moderation (Phase 5 admin).
 */
export async function createReview(
  rawInput: unknown,
): Promise<ReviewActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Bitte melden Sie sich an." };
    }
    const userId = session.user.id;

    if (!checkRateLimit(`review:${userId}`, 5, 60 * 60_000)) {
      return { success: false, error: "Zu viele Bewertungen — bitte später." };
    }

    const parsed = reviewSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Bitte Eingaben überprüfen.",
      };
    }
    const input = parsed.data;

    const product = await db.product.findUnique({
      where: { id: input.productId },
      select: { id: true, name: true, slug: true },
    });
    if (!product) return { success: false, error: "Gericht nicht gefunden." };

    // One review per product & user (order-independent duplicate guard).
    const existing = await db.review.findFirst({
      where: { productId: input.productId, userId },
    });
    if (existing) {
      return {
        success: false,
        error:
          "Sie haben dieses Gericht bereits bewertet — bearbeiten Sie Ihre Bewertung unter „Meine Bewertungen“.",
      };
    }

    // Verified purchase: a delivered/completed, non-cancelled order
    // containing this product.
    const purchase = await db.order.findFirst({
      where: {
        userId,
        status: { in: ["DELIVERED", "COMPLETED"] },
        items: { some: { productId: input.productId } },
        ...(input.orderId ? { id: input.orderId } : {}),
      },
      select: { id: true },
    });

    await db.review.create({
      data: {
        productId: input.productId,
        userId,
        orderId: purchase?.id ?? null,
        rating: input.rating,
        title: input.title || null,
        body: input.body,
        status: "APPROVED",
        isVerifiedPurchase: !!purchase,
        images: {
          create: input.imageUrls.map((url) => ({
            url,
            altText: `Foto zu ${product.name}`,
          })),
        },
      },
    });
    await recomputeAggregates(input.productId);

    revalidatePath("/account/reviews");
    revalidatePath(`/menu/${product.slug}`);
    return {
      success: true,
      message:
        "Vielen Dank! Ihre Bewertung wurde veröffentlicht.",
    };
  } catch (error) {
    console.error("[createReview]", getErrorMessage(error));
    return {
      success: false,
      error: "Bewertung konnte nicht gespeichert werden.",
    };
  }
}

export async function updateReview(
  rawInput: unknown,
): Promise<ReviewActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Bitte melden Sie sich an." };
    }
    const parsed = updateReviewSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Bitte Eingaben überprüfen.",
      };
    }

    const review = await db.review.findFirst({
      where: { id: parsed.data.reviewId, userId: session.user.id },
    });
    if (!review) return { success: false, error: "Bewertung nicht gefunden." };

    await db.review.update({
      where: { id: review.id },
      data: {
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        body: parsed.data.body,
        // Edits go back through moderation.
        status: "PENDING",
      },
    });
    await recomputeAggregates(review.productId);

    revalidatePath("/account/reviews");
    return { success: true, message: "Bewertung aktualisiert — wird geprüft." };
  } catch (error) {
    console.error("[updateReview]", getErrorMessage(error));
    return { success: false, error: "Aktualisierung fehlgeschlagen." };
  }
}

export async function deleteReview(
  rawReviewId: unknown,
): Promise<ReviewActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Bitte melden Sie sich an." };
    }
    const parsed = z.string().cuid().safeParse(rawReviewId);
    if (!parsed.success) {
      return { success: false, error: "Ungültige Bewertung." };
    }

    const review = await db.review.findFirst({
      where: { id: parsed.data, userId: session.user.id },
    });
    if (!review) return { success: false, error: "Bewertung nicht gefunden." };

    await db.review.delete({ where: { id: review.id } });
    await recomputeAggregates(review.productId);

    revalidatePath("/account/reviews");
    return { success: true, message: "Bewertung gelöscht." };
  } catch (error) {
    console.error("[deleteReview]", getErrorMessage(error));
    return { success: false, error: "Löschen fehlgeschlagen." };
  }
}
