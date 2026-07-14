import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";

import { auth } from "@/lib/auth";
import { getAppliedCouponCode, getCartSummary } from "@/lib/services/cart";
import { checkCoupon } from "@/lib/services/coupon";
import { formatPrice } from "@/lib/utils";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { CouponForm } from "@/components/checkout/coupon-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Warenkorb",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCartSummary();

  if (cart.lines.length === 0) {
    return (
      <div className="container flex flex-col items-center gap-5 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <ShoppingBag className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Ihr Warenkorb ist leer</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            Stöbern Sie durch unsere Speisekarte — Machboos, Adana Kebap und
            Künefe warten schon.
          </p>
        </div>
        <Button variant="gold" size="lg" asChild>
          <Link href="/menu">Zur Speisekarte</Link>
        </Button>
      </div>
    );
  }

  // Applied coupon → show the discount preview right on the cart.
  const [appliedCode, session] = await Promise.all([
    getAppliedCouponCode(),
    auth(),
  ]);
  let discount = 0;
  let freeDelivery = false;
  if (appliedCode) {
    const check = await checkCoupon({
      code: appliedCode,
      cart,
      userId: session?.user?.id ?? null,
    });
    if (check.ok) {
      discount = check.discount;
      freeDelivery = check.freeDelivery;
    }
  }
  const total = Math.max(0, cart.subtotal - discount);

  return (
    <div className="container py-10">
      <h1 className="mb-8 text-3xl font-semibold">
        Warenkorb{" "}
        <span className="text-lg font-normal text-muted-foreground">
          ({cart.itemCount} Artikel)
        </span>
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="divide-y rounded-lg border bg-card px-5">
          {cart.lines.map((line) => (
            <CartLineItem key={line.itemId} line={line} />
          ))}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <CouponForm appliedCode={appliedCode} />
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zwischensumme</span>
                <span className="font-medium">
                  {formatPrice(cart.subtotal)}
                </span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-success">
                  <span>Rabatt ({appliedCode})</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              ) : null}
              {freeDelivery ? (
                <div className="flex justify-between text-success">
                  <span>Lieferung ({appliedCode})</span>
                  <span>Gratis</span>
                </div>
              ) : null}
              <div className="flex justify-between text-muted-foreground">
                <span>Liefergebühr</span>
                <span>
                  {freeDelivery ? "gratis" : "wird im Checkout berechnet"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Gesamt (inkl. MwSt.)</span>
                <span>{formatPrice(total)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button variant="gold" size="lg" className="w-full" asChild>
                <Link href="/checkout">
                  Zur Kasse <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/menu">Weiter einkaufen</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
