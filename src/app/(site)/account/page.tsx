import type { Metadata } from "next";
import Link from "next/link";
import { Heart, ReceiptText, Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Mein Konto",
};

// Session + live DB reads → always render dynamically.
export const dynamic = "force-dynamic";

/**
 * Customer dashboard overview (Phase 1 scope): live counters from the
 * database. Phase 4 expands this area with orders, addresses,
 * favorites, reviews, notifications and profile management.
 */
export default async function AccountPage() {
  const session = await auth();
  // Layout guarantees a session; this satisfies strict null checks.
  if (!session?.user) return null;

  const [orderCount, favoriteCount, loyalty] = await Promise.all([
    db.order.count({ where: { userId: session.user.id } }),
    db.favorite.count({ where: { userId: session.user.id } }),
    db.loyaltyAccount.findUnique({
      where: { userId: session.user.id },
      select: { balance: true },
    }),
  ]);

  const stats = [
    {
      icon: ReceiptText,
      label: "Bestellungen",
      value: orderCount,
      hint: "Alle Details unter „Meine Bestellungen“",
    },
    {
      icon: Heart,
      label: "Favoriten",
      value: favoriteCount,
      hint: "Favoritenverwaltung kommt in Phase 4",
    },
    {
      icon: Sparkles,
      label: "Treuepunkte",
      value: loyalty?.balance ?? 0,
      hint: "Punkte sammeln Sie mit jeder Bestellung",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-widest text-gold">
          Mein Konto
        </p>
        <h1 className="mt-1 text-3xl font-semibold">
          Willkommen, {session.user.name ?? "Gast"}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Angemeldet als {session.user.email}{" "}
          <Badge variant="secondary" className="ml-1 align-middle">
            {session.user.role === "CUSTOMER" ? "Kunde" : session.user.role}
          </Badge>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="gold" size="sm" asChild>
          <Link href="/account/orders">Meine Bestellungen</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/menu">Zur Speisekarte</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/track-order">Bestellung verfolgen</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gold" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stat.value}</p>
              <CardDescription className="mt-1">{stat.hint}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
