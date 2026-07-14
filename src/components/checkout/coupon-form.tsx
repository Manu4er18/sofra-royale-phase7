"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TicketPercent, X } from "lucide-react";
import { toast } from "sonner";

import { applyCoupon, removeCoupon } from "@/actions/coupon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/** Coupon apply/remove — used on the cart page and in checkout. */
export function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function apply() {
    if (!code.trim()) return;
    startTransition(async () => {
      const result = await applyCoupon({ code });
      if (!result.success) {
        toast.error("Gutschein nicht anwendbar", {
          description: result.error,
        });
        return;
      }
      toast.success(
        result.freeDelivery
          ? "Gratis Lieferung aktiviert!"
          : "Gutschein angewendet!",
      );
      setCode("");
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await removeCoupon();
      router.refresh();
    });
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-2">
        <Badge variant="success" className="gap-1.5 py-1.5">
          <TicketPercent className="h-3.5 w-3.5" aria-hidden />
          {appliedCode}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={remove}
          disabled={isPending}
          className="text-muted-foreground"
        >
          <X /> Entfernen
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <label className="sr-only" htmlFor="coupon-code">
        Gutscheincode
      </label>
      <Input
        id="coupon-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Gutscheincode"
        className="h-9 uppercase"
        maxLength={40}
      />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        className="h-9"
        loading={isPending}
        disabled={!code.trim()}
      >
        Einlösen
      </Button>
    </form>
  );
}
