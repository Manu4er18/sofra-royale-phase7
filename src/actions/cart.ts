"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { addToCartSchema, updateCartItemSchema } from "@/lib/validations/cart";
import {
  assertItemOwnership,
  CartValidationError,
  getOrCreateCart,
  getPricingProduct,
  priceSelections,
} from "@/lib/services/cart";
import { getErrorMessage } from "@/lib/utils";

export type CartActionResult =
  | { success: true; itemCount?: number }
  | { success: false; error: string };

function revalidateCartViews() {
  // Header badge lives in the (site)/account layouts → refresh the tree.
  revalidatePath("/", "layout");
}

/**
 * Add a configured product to the cart.
 * All IDs are validated against the live catalog; the price is computed
 * exclusively on the server (see priceSelections).
 */
export async function addToCart(rawInput: unknown): Promise<CartActionResult> {
  try {
    const parsed = addToCartSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: "Ungültige Eingabe." };
    }
    const input = parsed.data;

    const product = await getPricingProduct(input.productId);
    if (!product || product.status !== "PUBLISHED") {
      return { success: false, error: "Dieses Gericht ist nicht verfügbar." };
    }
    if (!product.isAvailable || product.stockStatus === "OUT_OF_STOCK") {
      return {
        success: false,
        error: "Dieses Gericht ist momentan ausverkauft.",
      };
    }

    // Throws CartValidationError on any tampered/invalid selection.
    priceSelections(product, input.variationId ?? null, input.selections);

    const cart = await getOrCreateCart();

    // Merge identical configurations into one line.
    const existingItems = await db.cartItem.findMany({
      where: { cartId: cart.id, productId: product.id },
    });
    const selectionsJson = JSON.stringify(input.selections);
    const duplicate = existingItems.find(
      (item) =>
        (item.variationId ?? null) === (input.variationId ?? null) &&
        JSON.stringify(item.selections) === selectionsJson &&
        (item.specialInstructions ?? "") === (input.specialInstructions ?? ""),
    );

    if (duplicate) {
      await db.cartItem.update({
        where: { id: duplicate.id },
        data: { quantity: Math.min(20, duplicate.quantity + input.quantity) },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          variationId: input.variationId ?? null,
          quantity: input.quantity,
          selections: input.selections,
          specialInstructions: input.specialInstructions || null,
        },
      });
    }

    const agg = await db.cartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });

    revalidateCartViews();
    return { success: true, itemCount: agg._sum.quantity ?? 0 };
  } catch (error) {
    if (error instanceof CartValidationError) {
      return { success: false, error: error.message };
    }
    console.error("[addToCart]", getErrorMessage(error));
    return {
      success: false,
      error: "Der Artikel konnte nicht hinzugefügt werden.",
    };
  }
}

/** Update quantity (0 removes the line). Ownership is always verified. */
export async function updateCartItem(
  rawInput: unknown,
): Promise<CartActionResult> {
  try {
    const parsed = updateCartItemSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: "Ungültige Eingabe." };
    }
    const { itemId, quantity } = parsed.data;

    const item = await assertItemOwnership(itemId);
    if (!item) {
      return { success: false, error: "Artikel nicht gefunden." };
    }

    if (quantity === 0) {
      await db.cartItem.delete({ where: { id: itemId } });
    } else {
      await db.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    }

    revalidateCartViews();
    return { success: true };
  } catch (error) {
    console.error("[updateCartItem]", getErrorMessage(error));
    return {
      success: false,
      error: "Der Warenkorb konnte nicht aktualisiert werden.",
    };
  }
}

export async function removeCartItem(
  itemId: string,
): Promise<CartActionResult> {
  return updateCartItem({ itemId, quantity: 0 });
}
