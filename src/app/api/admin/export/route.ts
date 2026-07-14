import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/rbac";
import { STAFF_ROLES } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** RFC-4180-safe CSV cell. */
function cell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(";")];
  for (const row of rows) lines.push(row.map(cell).join(";"));
  // BOM so Excel opens UTF-8 correctly.
  return "﻿" + lines.join("\r\n");
}

const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/**
 * GET /api/admin/export?type=orders|products|customers[&days=30]
 * Staff-only CSV export. German number/date formatting for Excel.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "orders";
  const days = Math.min(
    365,
    Math.max(1, Number(url.searchParams.get("days") ?? "90")),
  );
  const from = new Date(Date.now() - days * 86_400_000);

  let filename = "export.csv";
  let csv = "";

  if (type === "orders") {
    const orders = await db.order.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        items: { select: { quantity: true } },
      },
    });
    csv = toCsv(
      [
        "Bestellnummer",
        "Datum",
        "Status",
        "Liefermethode",
        "Kunde",
        "E-Mail",
        "Artikel",
        "Zwischensumme",
        "Rabatt",
        "Liefergebühr",
        "Trinkgeld",
        "MwSt.",
        "Gesamt",
        "Gutschein",
      ],
      orders.map((o) => [
        o.orderNumber,
        o.createdAt.toLocaleString("de-DE"),
        o.status,
        o.deliveryMethod,
        o.user?.name ?? o.guestName ?? "Gast",
        o.user?.email ?? o.guestEmail ?? "",
        o.items.reduce((n, i) => n + i.quantity, 0),
        euros(o.subtotal),
        euros(o.discountTotal),
        euros(o.deliveryFee),
        euros(o.tipAmount),
        euros(o.taxTotal),
        euros(o.total),
        o.couponCode ?? "",
      ]),
    );
    filename = `bestellungen-${days}tage.csv`;
  } else if (type === "products") {
    const products = await db.product.findMany({
      orderBy: { name: "asc" },
      include: {
        category: { select: { name: true } },
        cuisine: { select: { name: true } },
      },
    });
    csv = toCsv(
      [
        "Name",
        "Slug",
        "Kategorie",
        "Küche",
        "Grundpreis",
        "Angebotspreis",
        "Status",
        "Verfügbar",
        "Bestand",
        "Ø Bewertung",
        "Bewertungen",
        "Bestellt",
      ],
      products.map((p) => [
        p.name,
        p.slug,
        p.category.name,
        p.cuisine.name,
        euros(p.basePrice),
        p.discountPrice ? euros(p.discountPrice) : "",
        p.status,
        p.isAvailable ? "ja" : "nein",
        p.stockQuantity ?? "unbegrenzt",
        p.averageRating.toFixed(1),
        p.reviewCount,
        p.orderCount,
      ]),
    );
    filename = "speisekarte.csv";
  } else if (type === "customers") {
    // Customer data export is restricted to MANAGER+ (privacy).
    const order = ["STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN"];
    if (order.indexOf(user.role) < order.indexOf("MANAGER")) {
      return NextResponse.json(
        { error: "Nur Manager dürfen Kundendaten exportieren." },
        { status: 403 },
      );
    }
    const customers = await db.user.findMany({
      where: { role: "CUSTOMER", deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { orders: true } },
        loyaltyAccount: { select: { balance: true } },
      },
    });
    csv = toCsv(
      [
        "Name",
        "E-Mail",
        "Registriert",
        "Bestellungen",
        "Treuepunkte",
        "Aktiv",
        "Marketing",
      ],
      customers.map((c) => [
        c.name ?? "",
        c.email,
        c.createdAt.toLocaleDateString("de-DE"),
        c._count.orders,
        c.loyaltyAccount?.balance ?? 0,
        c.isActive ? "ja" : "nein",
        c.marketingOptIn ? "ja" : "nein",
      ]),
    );
    filename = "kunden.csv";
  } else {
    return NextResponse.json({ error: "Unbekannter Typ." }, { status: 400 });
  }

  await logAudit({
    userId: user.id,
    action: "export.csv",
    entity: "Export",
    changes: { type, days },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
