import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { siteConfig } from "@/config/site";

/**
 * Dynamic XML sitemap: static routes + published products + published
 * blog posts + active category/cuisine collection pages.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/menu",
    "/dubai",
    "/turkish",
    "/offers",
    "/popular",
    "/new",
    "/vegetarian",
    "/vegan",
    "/halal",
    "/reservations",
    "/about",
    "/contact",
    "/faq",
    "/track-order",
    "/privacy",
    "/terms",
    "/imprint",
    "/cookies",
    "/refunds",
    "/delivery",
    "/allergens",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    db.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/menu/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
