import { z } from "zod";

/**
 * Cart input schemas. The client only ever sends IDs and quantities —
 * every price is recomputed server-side from the catalog.
 */

export const cartSelectionsSchema = z.object({
  options: z
    .array(
      z.object({
        groupId: z.string().cuid(),
        optionIds: z.array(z.string().cuid()).max(10),
      }),
    )
    .max(10)
    .default([]),
  addons: z
    .array(
      z.object({
        addonId: z.string().cuid(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .max(10)
    .default([]),
});

export type CartSelections = z.infer<typeof cartSelectionsSchema>;

export const addToCartSchema = z.object({
  productId: z.string().cuid(),
  variationId: z.string().cuid().optional(),
  quantity: z.number().int().min(1).max(20),
  selections: cartSelectionsSchema.default({ options: [], addons: [] }),
  specialInstructions: z.string().trim().max(300).optional(),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  itemId: z.string().cuid(),
  quantity: z.number().int().min(0).max(20), // 0 = remove
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
