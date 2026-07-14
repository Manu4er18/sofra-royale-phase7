import { z } from "zod";

/**
 * URL search-param schema for menu listing pages.
 * Everything is optional and coercion-tolerant — bad params never crash
 * a page, they simply fall back to defaults.
 */
export const productSortValues = [
  "relevance",
  "popular",
  "rating",
  "newest",
  "price-asc",
  "price-desc",
] as const;

export type ProductSort = (typeof productSortValues)[number];

const flag = z
  .union([
    z.literal("1"),
    z.literal("true"),
    z.literal("0"),
    z.literal("false"),
  ])
  .optional()
  .transform((v) => v === "1" || v === "true");

export const productFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  cuisine: z.string().trim().max(60).optional(),
  /** Prices in whole euros in the URL for readability. */
  min: z.coerce.number().min(0).max(1000).optional().catch(undefined),
  max: z.coerce.number().min(0).max(1000).optional().catch(undefined),
  rating: z.coerce.number().min(1).max(5).optional().catch(undefined),
  maxPrep: z.coerce.number().min(5).max(120).optional().catch(undefined),
  vegetarian: flag,
  vegan: flag,
  glutenFree: flag,
  halal: flag,
  spicy: flag,
  mild: flag,
  offers: flag,
  isNew: flag,
  popular: flag,
  available: flag,
  sort: z.enum(productSortValues).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
});

export type ProductFilters = z.infer<typeof productFilterSchema>;

/** Parse raw Next.js searchParams into safe filters. */
export function parseProductFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ProductFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    flat[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = productFilterSchema.safeParse(flat);
  return parsed.success ? parsed.data : productFilterSchema.parse({});
}
