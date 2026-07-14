import { z } from "zod";

/** Admin-side validation schemas (products, coupons, zones, content). */

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const adminProductSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(2, "Name erforderlich.").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9-]+$/, "Nur Kleinbuchstaben, Ziffern und Bindestriche."),
  shortDescription: z
    .string()
    .trim()
    .min(5, "Kurzbeschreibung erforderlich.")
    .max(200),
  description: z
    .string()
    .trim()
    .min(10, "Beschreibung erforderlich.")
    .max(5000),
  categoryId: z.string().cuid({ message: "Kategorie wählen." }),
  cuisineId: z.string().cuid({ message: "Küche wählen." }),
  /** Euros as string from the form → converted to cents server-side. */
  basePrice: z.coerce.number().min(0.5, "Preis erforderlich.").max(10_000),
  discountPrice: z.coerce.number().min(0).max(10_000).optional().nullable(),
  calories: z.coerce.number().int().min(0).max(10_000).optional().nullable(),
  preparationTime: z.coerce.number().int().min(1).max(240).default(20),
  portionSize: z.string().trim().max(60).optional().or(z.literal("")),
  spiceLevel: z.enum(["NONE", "MILD", "MEDIUM", "HOT", "EXTRA_HOT"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  stockQuantity: z.coerce
    .number()
    .int()
    .min(0)
    .max(100_000)
    .optional()
    .nullable(),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000).default(5),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  isHalal: z.boolean().default(true),
  isChefRecommendation: z.boolean().default(false),
  isDailySpecial: z.boolean().default(false),
  metaTitle: z.string().trim().max(120).optional().or(z.literal("")),
  metaDescription: z.string().trim().max(200).optional().or(z.literal("")),
});

export type AdminProductInput = z.infer<typeof adminProductSchema>;

/** Variations / option groups / add-ons — replaced as one document. */
export const productConfigSchema = z.object({
  productId: z.string().cuid(),
  variations: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        price: z.coerce.number().min(0).max(10_000),
        isDefault: z.boolean().default(false),
      }),
    )
    .max(10),
  optionGroups: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        minSelect: z.coerce.number().int().min(0).max(10),
        maxSelect: z.coerce.number().int().min(1).max(10),
        isRequired: z.boolean().default(false),
        options: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(80),
              priceDelta: z.coerce.number().min(-100).max(100),
              isDefault: z.boolean().default(false),
            }),
          )
          .min(1)
          .max(15),
      }),
    )
    .max(8),
  addons: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        price: z.coerce.number().min(0).max(1000),
        maxQuantity: z.coerce.number().int().min(1).max(10).default(3),
      }),
    )
    .max(15),
});

export type ProductConfigInput = z.infer<typeof productConfigSchema>;

export const productImageSchema = z.object({
  productId: z.string().cuid(),
  url: z
    .string()
    .trim()
    .url("Bitte eine gültige Bild-URL angeben.")
    .refine(
      (u) =>
        u.startsWith("https://res.cloudinary.com/") ||
        u.startsWith("https://images.unsplash.com/"),
      "Erlaubt: Cloudinary- oder Unsplash-URLs (siehe next.config.ts).",
    ),
  altText: z.string().trim().min(3, "Alt-Text erforderlich.").max(200),
});

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export const adminCouponSchema = z
  .object({
    id: z.string().cuid().optional(),
    code: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[A-Z0-9-]+$/i, "Nur Buchstaben, Ziffern, Bindestriche.")
      .transform((v) => v.toUpperCase()),
    description: z.string().trim().max(200).optional().or(z.literal("")),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_DELIVERY"]),
    /** PERCENTAGE: percent (1–100); FIXED_AMOUNT: euros; FREE_DELIVERY: 0. */
    value: z.coerce.number().min(0).max(10_000),
    minOrderAmount: z.coerce.number().min(0).max(10_000).default(0),
    maxDiscountAmount: z.coerce
      .number()
      .min(0)
      .max(10_000)
      .optional()
      .nullable(),
    usageLimit: z.coerce
      .number()
      .int()
      .min(1)
      .max(1_000_000)
      .optional()
      .nullable(),
    usageLimitPerUser: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .nullable(),
    isFirstOrderOnly: z.boolean().default(false),
    startsAt: z.string().optional().or(z.literal("")),
    expiresAt: z.string().optional().or(z.literal("")),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PERCENTAGE" && (data.value < 1 || data.value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Prozentwert zwischen 1 und 100.",
      });
    }
    if (data.type === "FIXED_AMOUNT" && data.value <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Betrag in Euro angeben.",
      });
    }
  });

export type AdminCouponInput = z.infer<typeof adminCouponSchema>;

// ---------------------------------------------------------------------------
// Delivery zones
// ---------------------------------------------------------------------------

export const adminZoneSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(2).max(80),
  /** Comma/space separated 5-digit codes. */
  postalCodes: z
    .string()
    .trim()
    .min(5, "Mindestens eine PLZ.")
    .transform((raw) => [...new Set(raw.split(/[\s,;]+/).filter(Boolean))])
    .refine(
      (codes) => codes.every((c) => /^\d{5}$/.test(c)),
      "Alle PLZ müssen 5-stellig sein.",
    ),
  deliveryFee: z.coerce.number().min(0).max(100),
  minOrderAmount: z.coerce.number().min(0).max(1000).default(0),
  freeDeliveryThreshold: z.coerce
    .number()
    .min(0)
    .max(1000)
    .optional()
    .nullable(),
  estimatedMinutes: z.coerce.number().int().min(10).max(180).default(45),
  isActive: z.boolean().default(true),
});

export type AdminZoneInput = z.infer<typeof adminZoneSchema>;

// ---------------------------------------------------------------------------
// Content (CMS)
// ---------------------------------------------------------------------------

export const contactSettingsSchema = z.object({
  address: z.string().trim().min(5).max(200),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(254),
});

export const heroSettingsSchema = z.object({
  title: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().min(3).max(300),
  imageUrl: z.string().trim().url(),
});

export const hoursSettingsSchema = z.object({
  weekdays: z.string().trim().min(3).max(60),
  weekend: z.string().trim().min(3).max(60),
  sunday: z.string().trim().min(3).max(60),
});

export const adminFaqSchema = z.object({
  id: z.string().cuid().optional(),
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(2000),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  isVisible: z.boolean().default(true),
});

export type AdminFaqInput = z.infer<typeof adminFaqSchema>;
