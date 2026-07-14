"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { redeemPoints } from "@/actions/loyalty";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Redeem points → personal coupon. Rules come from the server. */
export function LoyaltyRedeem({
  balance,
  minRedeem,
  redeemRate,
}: {
  balance: number;
  minRedeem: number;
  redeemRate: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // Offer sensible redemption steps up to the balance.
  const options: number[] = [];
  for (
    let points = minRedeem;
    points <= balance && options.length < 4;
    points += redeemRate * 2
  ) {
    options.push(points);
  }

  function redeem(points: number) {
    startTransition(async () => {
      const result = await redeemPoints(points);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Gutschein ${result.couponCode} erstellt!`, {
        description: `${formatPrice(result.value)} — einlösbar im Checkout.`,
      });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-gold" aria-hidden />
          Punkte einlösen
        </CardTitle>
        <CardDescription>
          {redeemRate} Punkte = 1 € Rabatt · einlösbar ab {minRedeem} Punkten.
          Sie erhalten einen persönlichen Gutscheincode für den Checkout.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {balance < minRedeem ? (
          <p className="text-sm text-muted-foreground">
            Noch {minRedeem - balance} Punkte bis zur ersten Einlösung — Punkte
            gibt es für jede abgeschlossene Bestellung.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {options.map((points) => (
              <Button
                key={points}
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => redeem(points)}
              >
                {points} Punkte → {formatPrice((points / redeemRate) * 100)}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
