import "server-only";

import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  cartSelectionsSchema,
  type CartSelections,
} from "@/lib/validations/cart";

/**
 * Cart service.
 *
 * Guest carts are keyed by an httpOnly `sr_cart` cookie; logged-in carts
 * by userId. Prices are NEVER stored as trusted values — every read
 * recomputes unit prices from the live catalog, so price changes and
 * option edits are always reflected and clients can never inject prices.
 *
 * Phase 3 adds: guest→user cart merge on login, coupons, fees, checkout.
 */

export const CART_COOKIE = "sr_cart";
const CART_TTL_DAYS = 30;

// ---------------------------------------------------------------------------
// Cart lookup / creation
// ---------------------------------------------------------------------------

async function findCart() {
  const session = await auth();
  const token = (await cookies()).get(CART_COOKIE)?.value;

  if (session?.user?.id) {
    const userCart = await db.cart.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });
    // Guest → user cart merge after login: move any cookie-cart items
    // into the account cart, then drop the guest cart. The stale cookie
    // is harmless afterwards (it no longer matches a cart).
    if (token) {
      const guestCart = await db.cart.findUnique({
        where: { cartToken: token },
        include: { items: { select: { id: true } } },
      });
      if (guestCart && guestCart.userId === null) {
        if (!userCart) {
          return db.cart.update({
            where: { id: guestCart.id },
            data: { userId: session.user.id, cartToken: null },
          });
        }
        if (guestCart.items.length > 0) {
          await db.cartItem.updateMany({
            where: { cartId: guestCart.id },
            data: { cartId: userCart.id },
          });
        }
        await db.cart.delete({ where: { id: guestCart.id } }).catch(() => {
          /* already gone — fine */
        });
      }
    }
    return userCart;
  }

  if (!token) return null;
  return db.cart.findUnique({ where: { cartToken: token } });
}

/**
 * Get or create the active cart. May set the guest cookie, so this must
 * only be called from Server Actions or Route Handlers.
 */
export async function getOrCreateCart() {
  const existing = await findCart();
  if (existing) return existing;

  const session = await auth();
  const expiresAt = new Date(Date.now() + CART_TTL_DAYS * 86_400_000);

  if (session?.user?.id) {
    return db.cart.create({ data: { userId: session.user.id, expiresAt } });
  }

  const token = crypto.randomUUID();
  const cart = await db.cart.create({ data: { cartToken: token, expiresAt } });
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_TTL_DAYS * 86_400,
    path: "/",
  });
  return cart;
}

/** Assert the item belongs to the caller's cart (ownership guard). */
export async function assertItemOwnership(itemId: string) {
  const cart = await findCart();
  if (!cart) return null;
  const item = await db.cartItem.findUnique({ where: { id: itemId } });
  if (!item || item.cartId !== cart.id) return null;
  return item;
}

// ---------------------------------------------------------------------------
// Server-side pricing
// ---------------------------------------------------------------------------

export type PricedSelection = {
  group: string;
  value: string;
  priceDelta: number;
};

export type PricedCartLine = {
  itemId: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string;
  variationName: string | null;
  selections: PricedSelection[];
  specialInstructions: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isAvailable: boolean;
};

const pricingInclude = {
  images: {
    orderBy: [{ isFeatured: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
  },
  variations: true,
  optionGroups: { include: { options: true } },
  addons: true,
} as const;

type PricingProduct = Prisma.ProductGetPayload<{
  include: typeof pricingInclude;
}>;

export class CartValidationError extends Error {}

/**
 * Validate a selection payload against the product's real catalog data
 * and compute the unit price. Throws CartValidationError on any
 * mismatch (unknown IDs, violated min/max, foreign options…).
 */
export function priceSelections(
  product: PricingProduct,
  variationId: string | null,
  raw: unknown,
): {
  unitPrice: number;
  variationName: string | null;
  selections: PricedSelection[];
} {
  const parsed = cartSelectionsSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new CartValidationError("Ungültige Produktoptionen.");
  }
  const sel: CartSelections = parsed.data;

  // --- base price: variation replaces basePrice; else discount/base ----
  let unitPrice =
    product.discountPrice !== null && product.discountPrice < product.basePrice
      ? product.discountPrice
      : product.basePrice;
  let variationName: string | null = null;

  if (product.variations.length > 0) {
    const variation =
      product.variations.find((v) => v.id === variationId) ??
      product.variations.find((v) => v.isDefault) ??
      product.variations[0];
    if (variationId && !product.variations.some((v) => v.id === variationId)) {
      throw new CartValidationError("Unbekannte Portionsgröße.");
    }
    if (variation) {
      unitPrice = variation.price;
      variationName = variation.name;
    }
  } else if (variationId) {
    throw new CartValidationError("Dieses Gericht hat keine Varianten.");
  }

  // --- option groups ----------------------------------------------------
  const selections: PricedSelection[] = [];
  const byGroup = new Map<string, string[]>(
    sel.options.map((o) => [o.groupId, o.optionIds]),
  );

  for (const group of product.optionGroups) {
    const chosen = byGroup.get(group.id) ?? [];
    const unique = [...new Set(chosen)];
    if (group.isRequired && unique.length < Math.max(1, group.minSelect)) {
      throw new CartValidationError(`Bitte wählen Sie: ${group.name}.`);
    }
    if (unique.length < group.minSelect || unique.length > group.maxSelect) {
      throw new CartValidationError(`Ungültige Auswahl für „${group.name}“.`);
    }
    for (const optionId of unique) {
      const option = group.options.find((o) => o.id === optionId);
      if (!option) {
        throw new CartValidationError(`Ungültige Option für „${group.name}“.`);
      }
      unitPrice += option.priceDelta;
      selections.push({
        group: group.name,
        value: option.name,
        priceDelta: option.priceDelta,
      });
    }
    byGroup.delete(group.id);
  }
  if (byGroup.size > 0) {
    throw new CartValidationError("Unbekannte Optionsgruppe.");
  }

  // --- add-ons -----------------------------------------------------------
  for (const chosen of sel.addons) {
    const addon = product.addons.find(
      (a) => a.id === chosen.addonId && a.isActive,
    );
    if (!addon) throw new CartValidationError("Unbekanntes Extra.");
    if (chosen.quantity > addon.maxQuantity) {
      throw new CartValidationError(
        `„${addon.name}“ ist auf ${addon.maxQuantity}× begrenzt.`,
      );
    }
    unitPrice += addon.price * chosen.quantity;
    selections.push({
      group: "Extras",
      value:
        chosen.quantity > 1 ? `${chosen.quantity}× ${addon.name}` : addon.name,
      priceDelta: addon.price * chosen.quantity,
    });
  }

  if (unitPrice < 0) throw new CartValidationError("Ungültiger Preis.");
  return { unitPrice, variationName, selections };
}

export async function getPricingProduct(productId: string) {
  return db.product.findUnique({
    where: { id: productId },
    include: pricingInclude,
  });
}

// ---------------------------------------------------------------------------
// Cart reads
// ---------------------------------------------------------------------------

export type CartSummary = {
  lines: PricedCartLine[];
  itemCount: number;
  subtotal: number;
};

/** Read-only cart summary with recomputed prices (safe for RSC). */
export async function getCartSummary(): Promise<CartSummary> {
  const cart = await findCart();
  if (!cart) return { lines: [], itemCount: 0, subtotal: 0 };

  const items = await db.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: "asc" },
    include: { product: { include: pricingInclude } },
  });

  const lines: PricedCartLine[] = [];
  for (const item of items) {
    if (!item.product || item.product.status !== "PUBLISHED") continue;
    try {
      const priced = priceSelections(
        item.product,
        item.variationId,
        item.selections,
      );
      lines.push({
        itemId: item.id,
        productId: item.product.id,
        slug: item.product.slug,
        name: item.product.name,
        imageUrl: item.product.images[0]?.url ?? null,
        imageAlt: item.product.images[0]?.altText ?? item.product.name,
        variationName: priced.variationName,
        selections: priced.selections,
        specialInstructions: item.specialInstructions,
        quantity: item.quantity,
        unitPrice: priced.unitPrice,
        lineTotal: priced.unitPrice * item.quantity,
        isAvailable:
          item.product.isAvailable &&
          item.product.stockStatus !== "OUT_OF_STOCK",
      });
    } catch {
      // Catalog changed under the selection (option removed …) —
      // skip the stale line; the cart page shows what remains.
      continue;
    }
  }

  return {
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal: lines.reduce((sum, l) => sum + l.lineTotal, 0),
  };
}

/** Coupon code currently pinned to the cart (or null). */
export async function getAppliedCouponCode(): Promise<string | null> {
  const cart = await findCart();
  if (!cart?.couponId) return null;
  const coupon = await db.coupon.findUnique({
    where: { id: cart.couponId },
    select: { code: true },
  });
  return coupon?.code ?? null;
}

/** Lightweight badge count for the header. */
export async function getCartItemCount(): Promise<number> {
  const cart = await findCart();
  if (!cart) return 0;
  const agg = await db.cartItem.aggregate({
    where: { cartId: cart.id },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}
