import type { Metadata } from "next";
import { Sparkles, TicketPercent } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLoyaltyRules } from "@/actions/loyalty";
import { formatPrice } from "@/lib/utils";
import { LoyaltyRedeem } from "@/components/account/loyalty-redeem";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Treuepunkte & Gutscheine",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(date);
}

const TX_LABEL = {
  EARN: "Gesammelt",
  REDEEM: "Eingelöst",
  EXPIRE: "Verfallen",
  ADJUSTMENT: "Korrektur",
} as const;

export default async function LoyaltyPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [account, rules, personalCoupons] = await Promise.all([
    db.loyaltyAccount.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    getLoyaltyRules(),
    db.coupon.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Treuepunkte & Gutscheine</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-gold/40 bg-gradient-to-br from-card to-gold-muted/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold" aria-hidden />
              Ihr Punktestand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{account.balance}</p>
            <CardDescription className="mt-1">
              Insgesamt gesammelt: {account.lifetimeEarned} Punkte · 1 Punkt pro
              bestelltem Euro
            </CardDescription>
          </CardContent>
        </Card>

        <LoyaltyRedeem
          balance={account.balance}
          minRedeem={rules.minRedeem}
          redeemRate={rules.redeemRate}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketPercent className="h-5 w-5 text-gold" aria-hidden />
            Meine Gutscheine
          </CardTitle>
          <CardDescription>
            Persönliche Codes — im Warenkorb oder Checkout einlösbar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {personalCoupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine persönlichen Gutscheine — lösen Sie Punkte ein, um
              einen zu erstellen.
            </p>
          ) : (
            <ul className="space-y-2">
              {personalCoupons.map((coupon) => {
                const used =
                  coupon.usageLimit !== null &&
                  coupon.usedCount >= coupon.usageLimit;
                const expired =
                  coupon.expiresAt !== null && coupon.expiresAt < new Date();
                return (
                  <li
                    key={coupon.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                  >
                    <span>
                      <code className="font-semibold">{coupon.code}</code>
                      <span className="ml-2 text-muted-foreground">
                        {formatPrice(coupon.value)} Rabatt
                        {coupon.expiresAt
                          ? ` · gültig bis ${formatDate(coupon.expiresAt)}`
                          : ""}
                      </span>
                    </span>
                    <Badge
                      variant={
                        used ? "secondary" : expired ? "destructive" : "success"
                      }
                    >
                      {used ? "Eingelöst" : expired ? "Abgelaufen" : "Aktiv"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Punkteverlauf</CardTitle>
        </CardHeader>
        <CardContent>
          {account.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Punktebewegungen — Punkte gibt es automatisch für jede
              bezahlte Bestellung.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {account.transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span>
                    <span className="font-medium">{TX_LABEL[tx.type]}</span>
                    {tx.note ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {tx.note}
                      </span>
                    ) : null}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(tx.createdAt)}
                    </span>
                  </span>
                  <span
                    className={
                      tx.points >= 0
                        ? "font-semibold text-success"
                        : "font-semibold text-destructive"
                    }
                  >
                    {tx.points >= 0 ? "+" : ""}
                    {tx.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
