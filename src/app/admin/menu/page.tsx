import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { ImageOff, Plus } from "lucide-react";

import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Admin — Speisekarte",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const STATUS = {
  DRAFT: { label: "Entwurf", variant: "secondary" as const },
  SCHEDULED: { label: "Geplant", variant: "secondary" as const },
  PUBLISHED: { label: "Veröffentlicht", variant: "success" as const },
  ARCHIVED: { label: "Archiviert", variant: "outline" as const },
};

export default async function AdminMenuPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const status =
    typeof searchParams.status === "string" ? searchParams.status : "";

  const where: Prisma.ProductWhereInput = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (status === "draft") where.status = "DRAFT";
  else if (status === "published") where.status = "PUBLISHED";
  else if (status === "archived") where.status = "ARCHIVED";

  const products = await db.product.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      category: { select: { name: true } },
      cuisine: { select: { name: true } },
      images: {
        where: { isFeatured: true },
        take: 1,
        select: { url: true, altText: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Speisekarte</h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export?type=products"
            className="text-sm text-primary underline underline-offset-4 dark:text-gold"
          >
            CSV
          </a>
          <Button variant="gold" size="sm" asChild>
            <Link href="/admin/menu/new">
              <Plus /> Neues Gericht
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "", label: "Alle" },
          { key: "published", label: "Veröffentlicht" },
          { key: "draft", label: "Entwürfe" },
          { key: "archived", label: "Archiv" },
        ].map((f) => (
          <Button
            key={f.key}
            variant={status === f.key ? "gold" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/admin/menu${f.key ? `?status=${f.key}` : ""}`}>
              {f.label}
            </Link>
          </Button>
        ))}
        <form method="get" className="ml-auto flex gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <Input
            name="q"
            defaultValue={q}
            placeholder="Gericht suchen …"
            className="h-9 w-52"
            aria-label="Gerichte suchen"
          />
          <Button type="submit" variant="secondary" size="sm" className="h-9">
            Suchen
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Gericht</th>
              <th className="px-4 py-3">Kategorie / Küche</th>
              <th className="px-4 py-3 text-right">Preis</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verfügbar</th>
              <th className="px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Keine Gerichte gefunden.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b last:border-0 hover:bg-accent/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/menu/${product.id}`}
                      className="flex items-center gap-3"
                    >
                      <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded bg-muted">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-muted-foreground">
                            <ImageOff className="h-4 w-4" aria-hidden />
                          </span>
                        )}
                      </span>
                      <span className="font-medium hover:underline">
                        {product.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.category.name} · {product.cuisine.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {product.discountPrice ? (
                      <span>
                        <span className="text-destructive">
                          {formatPrice(product.discountPrice)}
                        </span>{" "}
                        <s className="text-xs text-muted-foreground">
                          {formatPrice(product.basePrice)}
                        </s>
                      </span>
                    ) : (
                      formatPrice(product.basePrice)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS[product.status].variant}>
                      {STATUS[product.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {product.isAvailable ? (
                      <span className="text-success">Ja</span>
                    ) : (
                      <span className="text-destructive">Pausiert</span>
                    )}
                    {product.stockQuantity !== null ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({product.stockQuantity})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ProductRowActions
                      productId={product.id}
                      isAvailable={product.isAvailable}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
