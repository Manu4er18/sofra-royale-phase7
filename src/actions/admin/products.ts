"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole, AuthorizationError } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import {
  adminProductSchema,
  productConfigSchema,
  productImageSchema,
} from "@/lib/validations/admin";
import { slugify, getErrorMessage } from "@/lib/utils";

export type AdminActionResult =
  | { success: true; message?: string; id?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

const toCents = (euros: number) => Math.round(euros * 100);

function revalidateCatalog() {
  // Menu pages + homepage sections + admin list.
  revalidatePath("/", "layout");
}

/** Create or update a product's core fields (MANAGER+). */
export async function upsertProduct(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = adminProductSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Bitte Eingaben überprüfen.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    const input = parsed.data;

    const slugTaken = await db.product.findFirst({
      where: { slug: input.slug, id: { not: input.id ?? "" } },
      select: { id: true },
    });
    if (slugTaken) {
      return { success: false, error: "Dieser Slug ist bereits vergeben." };
    }
    const [category, cuisine] = await Promise.all([
      db.category.findUnique({ where: { id: input.categoryId } }),
      db.cuisine.findUnique({ where: { id: input.cuisineId } }),
    ]);
    if (!category || !cuisine) {
      return { success: false, error: "Kategorie/Küche nicht gefunden." };
    }

    const basePrice = toCents(input.basePrice);
    const discountPrice =
      input.discountPrice != null && input.discountPrice > 0
        ? toCents(input.discountPrice)
        : null;
    if (discountPrice !== null && discountPrice >= basePrice) {
      return {
        success: false,
        error: "Der Angebotspreis muss unter dem Grundpreis liegen.",
      };
    }

    const stockQuantity =
      input.stockQuantity != null && input.stockQuantity >= 0
        ? input.stockQuantity
        : null;

    const data = {
      name: input.name,
      slug: input.slug,
      shortDescription: input.shortDescription,
      description: input.description,
      categoryId: input.categoryId,
      cuisineId: input.cuisineId,
      basePrice,
      discountPrice,
      calories: input.calories ?? null,
      preparationTime: input.preparationTime,
      portionSize: input.portionSize || null,
      spiceLevel: input.spiceLevel,
      status: input.status,
      stockQuantity,
      lowStockThreshold: input.lowStockThreshold,
      stockStatus:
        stockQuantity === null
          ? ("IN_STOCK" as const)
          : stockQuantity === 0
            ? ("OUT_OF_STOCK" as const)
            : stockQuantity <= input.lowStockThreshold
              ? ("LOW_STOCK" as const)
              : ("IN_STOCK" as const),
      isAvailable:
        input.isAvailable && (stockQuantity === null || stockQuantity > 0),
      isFeatured: input.isFeatured,
      isPopular: input.isPopular,
      isNew: input.isNew,
      isVegetarian: input.isVegetarian,
      isVegan: input.isVegan,
      isGlutenFree: input.isGlutenFree,
      isHalal: input.isHalal,
      isChefRecommendation: input.isChefRecommendation,
      isDailySpecial: input.isDailySpecial,
      metaTitle: input.metaTitle || null,
      metaDescription: input.metaDescription || null,
    };

    const product = input.id
      ? await db.product.update({ where: { id: input.id }, data })
      : await db.product.create({ data });

    await logAudit({
      userId: staff.id,
      action: input.id ? "product.updated" : "product.created",
      entity: "Product",
      entityId: product.id,
      changes: { name: input.name, slug: input.slug, status: input.status },
    });

    revalidateCatalog();
    return {
      success: true,
      id: product.id,
      message: input.id ? "Gericht aktualisiert." : "Gericht erstellt.",
    };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[upsertProduct]", getErrorMessage(error));
    return { success: false, error: "Speichern fehlgeschlagen." };
  }
}

/** Replace variations / option groups / add-ons in one transaction. */
export async function saveProductConfig(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = productConfigSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Bitte Eingaben überprüfen.",
      };
    }
    const input = parsed.data;

    for (const group of input.optionGroups) {
      if (group.minSelect > group.maxSelect) {
        return {
          success: false,
          error: `„${group.name}“: Min. darf Max. nicht übersteigen.`,
        };
      }
    }

    const product = await db.product.findUnique({
      where: { id: input.productId },
      select: { id: true },
    });
    if (!product) return { success: false, error: "Gericht nicht gefunden." };

    await db.$transaction(async (tx) => {
      await tx.productVariation.deleteMany({
        where: { productId: input.productId },
      });
      await tx.productOptionGroup.deleteMany({
        where: { productId: input.productId },
      });
      await tx.productAddon.deleteMany({
        where: { productId: input.productId },
      });

      for (const [i, variation] of input.variations.entries()) {
        await tx.productVariation.create({
          data: {
            productId: input.productId,
            name: variation.name,
            price: toCents(variation.price),
            isDefault: variation.isDefault,
            sortOrder: i,
          },
        });
      }
      for (const [gi, group] of input.optionGroups.entries()) {
        await tx.productOptionGroup.create({
          data: {
            productId: input.productId,
            name: group.name,
            minSelect: group.minSelect,
            maxSelect: group.maxSelect,
            isRequired: group.isRequired,
            sortOrder: gi,
            options: {
              create: group.options.map((option, oi) => ({
                name: option.name,
                priceDelta: toCents(option.priceDelta),
                isDefault: option.isDefault,
                sortOrder: oi,
              })),
            },
          },
        });
      }
      for (const [i, addon] of input.addons.entries()) {
        await tx.productAddon.create({
          data: {
            productId: input.productId,
            name: addon.name,
            price: toCents(addon.price),
            maxQuantity: addon.maxQuantity,
            sortOrder: i,
          },
        });
      }
    });

    await logAudit({
      userId: staff.id,
      action: "product.config_updated",
      entity: "Product",
      entityId: input.productId,
    });

    revalidateCatalog();
    return { success: true, message: "Optionen gespeichert." };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[saveProductConfig]", getErrorMessage(error));
    return {
      success: false,
      error: "Optionen konnten nicht gespeichert werden.",
    };
  }
}

export async function addProductImage(
  rawInput: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = productImageSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Ungültige Bild-URL.",
      };
    }
    const count = await db.productImage.count({
      where: { productId: parsed.data.productId },
    });
    await db.productImage.create({
      data: {
        productId: parsed.data.productId,
        url: parsed.data.url,
        altText: parsed.data.altText,
        isFeatured: count === 0,
        sortOrder: count,
      },
    });
    await logAudit({
      userId: staff.id,
      action: "product.image_added",
      entity: "Product",
      entityId: parsed.data.productId,
    });
    revalidateCatalog();
    return { success: true, message: "Bild hinzugefügt." };
  } catch (error) {
    console.error("[addProductImage]", getErrorMessage(error));
    return { success: false, error: "Bild konnte nicht hinzugefügt werden." };
  }
}

export async function removeProductImage(
  rawId: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success) return { success: false, error: "Ungültiges Bild." };
    const image = await db.productImage.findUnique({
      where: { id: parsed.data },
    });
    if (!image) return { success: false, error: "Bild nicht gefunden." };
    await db.productImage.delete({ where: { id: parsed.data } });
    await logAudit({
      userId: staff.id,
      action: "product.image_removed",
      entity: "Product",
      entityId: image.productId,
    });
    revalidateCatalog();
    return { success: true, message: "Bild entfernt." };
  } catch (error) {
    console.error("[removeProductImage]", getErrorMessage(error));
    return { success: false, error: "Bild konnte nicht entfernt werden." };
  }
}

export async function setFeaturedImage(
  rawId: unknown,
): Promise<AdminActionResult> {
  try {
    await requireRole("MANAGER");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success) return { success: false, error: "Ungültiges Bild." };
    const image = await db.productImage.findUnique({
      where: { id: parsed.data },
    });
    if (!image) return { success: false, error: "Bild nicht gefunden." };
    await db.$transaction([
      db.productImage.updateMany({
        where: { productId: image.productId },
        data: { isFeatured: false },
      }),
      db.productImage.update({
        where: { id: image.id },
        data: { isFeatured: true },
      }),
    ]);
    revalidateCatalog();
    return { success: true, message: "Titelbild gesetzt." };
  } catch (error) {
    console.error("[setFeaturedImage]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

export async function toggleProductAvailability(
  rawId: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("STAFF");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success)
      return { success: false, error: "Ungültiges Gericht." };
    const product = await db.product.findUnique({ where: { id: parsed.data } });
    if (!product) return { success: false, error: "Gericht nicht gefunden." };
    await db.product.update({
      where: { id: product.id },
      data: { isAvailable: !product.isAvailable },
    });
    await logAudit({
      userId: staff.id,
      action: product.isAvailable ? "product.disabled" : "product.enabled",
      entity: "Product",
      entityId: product.id,
    });
    revalidateCatalog();
    return {
      success: true,
      message: product.isAvailable
        ? "Gericht pausiert (86)."
        : "Gericht wieder verfügbar.",
    };
  } catch (error) {
    console.error("[toggleProductAvailability]", getErrorMessage(error));
    return { success: false, error: "Aktion fehlgeschlagen." };
  }
}

export async function duplicateProduct(
  rawId: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("MANAGER");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success)
      return { success: false, error: "Ungültiges Gericht." };

    const source = await db.product.findUnique({
      where: { id: parsed.data },
      include: {
        images: true,
        variations: true,
        optionGroups: { include: { options: true } },
        addons: true,
        ingredients: true,
        allergens: true,
      },
    });
    if (!source) return { success: false, error: "Gericht nicht gefunden." };

    let slug = `${source.slug}-kopie`;
    let suffix = 1;
    while (await db.product.findUnique({ where: { slug } })) {
      slug = `${source.slug}-kopie-${++suffix}`;
    }

    const copy = await db.product.create({
      data: {
        name: `${source.name} (Kopie)`,
        slug,
        shortDescription: source.shortDescription,
        description: source.description,
        categoryId: source.categoryId,
        cuisineId: source.cuisineId,
        basePrice: source.basePrice,
        discountPrice: source.discountPrice,
        calories: source.calories,
        preparationTime: source.preparationTime,
        portionSize: source.portionSize,
        spiceLevel: source.spiceLevel,
        status: "DRAFT",
        stockQuantity: source.stockQuantity,
        lowStockThreshold: source.lowStockThreshold,
        isAvailable: false,
        isHalal: source.isHalal,
        isVegetarian: source.isVegetarian,
        isVegan: source.isVegan,
        isGlutenFree: source.isGlutenFree,
        images: {
          create: source.images.map((img) => ({
            url: img.url,
            altText: img.altText,
            isFeatured: img.isFeatured,
            sortOrder: img.sortOrder,
          })),
        },
        variations: {
          create: source.variations.map((v) => ({
            name: v.name,
            price: v.price,
            isDefault: v.isDefault,
            sortOrder: v.sortOrder,
          })),
        },
        optionGroups: {
          create: source.optionGroups.map((g) => ({
            name: g.name,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            isRequired: g.isRequired,
            sortOrder: g.sortOrder,
            options: {
              create: g.options.map((o) => ({
                name: o.name,
                priceDelta: o.priceDelta,
                isDefault: o.isDefault,
                sortOrder: o.sortOrder,
              })),
            },
          })),
        },
        addons: {
          create: source.addons.map((a) => ({
            name: a.name,
            price: a.price,
            maxQuantity: a.maxQuantity,
            isActive: a.isActive,
            sortOrder: a.sortOrder,
          })),
        },
        ingredients: {
          create: source.ingredients.map((i) => ({
            ingredientId: i.ingredientId,
            isRemovable: i.isRemovable,
          })),
        },
        allergens: {
          create: source.allergens.map((a) => ({ allergenId: a.allergenId })),
        },
      },
    });

    await logAudit({
      userId: staff.id,
      action: "product.duplicated",
      entity: "Product",
      entityId: copy.id,
      changes: { sourceId: source.id },
    });

    revalidateCatalog();
    return {
      success: true,
      id: copy.id,
      message: "Kopie als Entwurf angelegt.",
    };
  } catch (error) {
    console.error("[duplicateProduct]", getErrorMessage(error));
    return { success: false, error: "Duplizieren fehlgeschlagen." };
  }
}

export async function deleteProduct(
  rawId: unknown,
): Promise<AdminActionResult> {
  try {
    const staff = await requireRole("ADMIN");
    const parsed = z.string().cuid().safeParse(rawId);
    if (!parsed.success)
      return { success: false, error: "Ungültiges Gericht." };
    const product = await db.product.findUnique({ where: { id: parsed.data } });
    if (!product) return { success: false, error: "Gericht nicht gefunden." };

    // Order snapshots survive (FK SetNull) — history stays intact.
    await db.product.delete({ where: { id: product.id } });
    await logAudit({
      userId: staff.id,
      action: "product.deleted",
      entity: "Product",
      entityId: product.id,
      changes: { name: product.name, slug: product.slug },
    });
    revalidateCatalog();
    return { success: true, message: `„${product.name}“ gelöscht.` };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { success: false, error: error.message };
    console.error("[deleteProduct]", getErrorMessage(error));
    return { success: false, error: "Löschen fehlgeschlagen." };
  }
}

/** Suggest a unique slug from a product name (used by the form). */
export async function suggestSlug(rawName: unknown): Promise<{ slug: string }> {
  const name = z.string().max(200).safeParse(rawName);
  if (!name.success) return { slug: "" };
  const base = slugify(name.data) || "gericht";
  let slug = base;
  let suffix = 1;
  while (await db.product.findUnique({ where: { slug } })) {
    slug = `${base}-${++suffix}`;
  }
  return { slug };
}
