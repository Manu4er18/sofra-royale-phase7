import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ProductFilters } from "@/lib/validations/catalog";

/**
 * Catalog service — the single read path for menu data.
 * All queries are scoped to PUBLISHED products; drafts and archived
 * items never leak to the storefront.
 */

export const PRODUCTS_PER_PAGE = 12;

/** Fields needed to render a product card anywhere on the site. */
export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  basePrice: true,
  discountPrice: true,
  currency: true,
  preparationTime: true,
  spiceLevel: true,
  isFeatured: true,
  isPopular: true,
  isNew: true,
  isVegetarian: true,
  isVegan: true,
  isGlutenFree: true,
  isHalal: true,
  isChefRecommendation: true,
  isDailySpecial: true,
  isAvailable: true,
  stockStatus: true,
  averageRating: true,
  reviewCount: true,
  category: { select: { slug: true, name: true } },
  cuisine: { select: { slug: true, name: true } },
  images: {
    select: { url: true, altText: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
    take: 1,
  },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{
  select: typeof productCardSelect;
}>;

const publishedWhere: Prisma.ProductWhereInput = { status: "PUBLISHED" };

function buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ...publishedWhere };
  const and: Prisma.ProductWhereInput[] = [];

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { shortDescription: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        {
          translations: {
            some: { name: { contains: filters.q, mode: "insensitive" } },
          },
        },
        {
          ingredients: {
            some: {
              ingredient: {
                name: { contains: filters.q, mode: "insensitive" },
              },
            },
          },
        },
      ],
    });
  }
  if (filters.category) where.category = { slug: filters.category };
  if (filters.cuisine) where.cuisine = { slug: filters.cuisine };
  if (filters.vegetarian) where.isVegetarian = true;
  if (filters.vegan) where.isVegan = true;
  if (filters.glutenFree) where.isGlutenFree = true;
  if (filters.halal) where.isHalal = true;
  if (filters.isNew) where.isNew = true;
  if (filters.popular) where.isPopular = true;
  if (filters.available) {
    where.isAvailable = true;
    where.stockStatus = { not: "OUT_OF_STOCK" };
  }
  if (filters.spicy) where.spiceLevel = { in: ["HOT", "EXTRA_HOT"] };
  if (filters.mild) where.spiceLevel = { in: ["NONE", "MILD"] };
  if (filters.offers) {
    // "On sale" = discountPrice set (service layer guarantees < basePrice
    // via admin validation in Phase 5) or flagged daily special.
    and.push({
      OR: [{ discountPrice: { not: null } }, { isDailySpecial: true }],
    });
  }
  if (filters.rating) where.averageRating = { gte: filters.rating };
  if (filters.maxPrep) where.preparationTime = { lte: filters.maxPrep };

  // Effective-price range: compare against discountPrice when present.
  // Prisma can't express COALESCE directly, so approximate with OR arms.
  const minC =
    filters.min !== undefined ? Math.round(filters.min * 100) : undefined;
  const maxC =
    filters.max !== undefined ? Math.round(filters.max * 100) : undefined;
  if (minC !== undefined || maxC !== undefined) {
    const range: { gte?: number; lte?: number } = {};
    if (minC !== undefined) range.gte = minC;
    if (maxC !== undefined) range.lte = maxC;
    and.push({
      OR: [
        { discountPrice: null, basePrice: range },
        { discountPrice: { not: null, ...range } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

function buildOrderBy(
  sort: ProductFilters["sort"],
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ basePrice: "asc" }];
    case "price-desc":
      return [{ basePrice: "desc" }];
    case "rating":
      return [{ averageRating: "desc" }, { reviewCount: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "popular":
      return [{ orderCount: "desc" }, { reviewCount: "desc" }];
    case "relevance":
    default:
      return [
        { isFeatured: "desc" },
        { isPopular: "desc" },
        { averageRating: "desc" },
      ];
  }
}

export async function listProducts(filters: ProductFilters) {
  const page = filters.page ?? 1;
  const where = buildWhere(filters);

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      select: productCardSelect,
      orderBy: buildOrderBy(filters.sort),
      skip: (page - 1) * PRODUCTS_PER_PAGE,
      take: PRODUCTS_PER_PAGE,
    }),
  ]);

  return {
    products,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)),
  };
}

/** Full product payload for the detail page. */
export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, ...publishedWhere },
    include: {
      category: { select: { slug: true, name: true } },
      cuisine: { select: { slug: true, name: true } },
      images: { orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] },
      videos: { orderBy: { sortOrder: "asc" } },
      variations: { orderBy: { sortOrder: "asc" } },
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      },
      addons: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
      allergens: { include: { allergen: true } },
      ingredients: { include: { ingredient: { select: { name: true } } } },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { name: true, image: true } },
          images: true,
          replies: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { name: true, role: true } } },
          },
        },
      },
      relatedTo: {
        orderBy: { sortOrder: "asc" },
        include: { related: { select: productCardSelect } },
        take: 4,
      },
    },
  });
}

export type ProductDetail = NonNullable<
  Awaited<ReturnType<typeof getProductBySlug>>
>;

export async function getFeaturedByCuisine(cuisineSlug: string, take = 4) {
  return db.product.findMany({
    where: {
      ...publishedWhere,
      cuisine: { slug: cuisineSlug },
      isFeatured: true,
    },
    select: productCardSelect,
    orderBy: { averageRating: "desc" },
    take,
  });
}

export async function getPopularProducts(take = 8) {
  return db.product.findMany({
    where: { ...publishedWhere, isPopular: true },
    select: productCardSelect,
    orderBy: [{ orderCount: "desc" }, { averageRating: "desc" }],
    take,
  });
}

export async function getChefRecommendations(take = 4) {
  return db.product.findMany({
    where: { ...publishedWhere, isChefRecommendation: true },
    select: productCardSelect,
    orderBy: { averageRating: "desc" },
    take,
  });
}

export async function getDailySpecials(take = 4) {
  return db.product.findMany({
    where: {
      ...publishedWhere,
      OR: [{ isDailySpecial: true }, { discountPrice: { not: null } }],
    },
    select: productCardSelect,
    orderBy: { updatedAt: "desc" },
    take,
  });
}

export async function getActiveCategories() {
  return db.category.findMany({
    where: { isActive: true, products: { some: publishedWhere } },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      _count: { select: { products: { where: publishedWhere } } },
    },
  });
}

export async function getActiveCuisines() {
  return db.cuisine.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true, description: true, imageUrl: true },
  });
}

export async function getCategoryBySlug(slug: string) {
  return db.category.findUnique({
    where: { slug },
    select: { slug: true, name: true, description: true },
  });
}

export async function getCuisineBySlug(slug: string) {
  return db.cuisine.findUnique({
    where: { slug },
    select: { slug: true, name: true, description: true },
  });
}

/** Lightweight name search for the autosuggest dropdown. */
export async function getSearchSuggestions(query: string, take = 6) {
  if (query.trim().length < 2) return [];
  return db.product.findMany({
    where: {
      ...publishedWhere,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        {
          translations: {
            some: { name: { contains: query, mode: "insensitive" } },
          },
        },
      ],
    },
    select: {
      slug: true,
      name: true,
      basePrice: true,
      discountPrice: true,
      images: {
        select: { url: true, altText: true },
        orderBy: [{ isFeatured: "desc" as const }],
        take: 1,
      },
    },
    orderBy: [{ isPopular: "desc" }, { averageRating: "desc" }],
    take,
  });
}

/** Popular searches — derived from the most-ordered dishes. */
export async function getPopularSearchTerms(take = 5) {
  const rows = await db.product.findMany({
    where: { ...publishedWhere, isPopular: true },
    select: { name: true },
    orderBy: { orderCount: "desc" },
    take,
  });
  return rows.map((r) => r.name);
}

/** Homepage testimonial strip: latest approved 5-star reviews. */
export async function getHighlightedReviews(take = 3) {
  return db.review.findMany({
    where: { status: "APPROVED", rating: { gte: 4 }, body: { not: null } },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: { select: { name: true, image: true } },
      product: { select: { name: true, slug: true } },
    },
  });
}
