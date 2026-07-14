"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  deleteCoupon,
  toggleCouponActive,
  upsertCoupon,
} from "@/actions/admin/catalog-config";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_DELIVERY";
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usedCount: number;
  isFirstOrderOnly: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

const TYPE_LABEL = {
  PERCENTAGE: "Prozent",
  FIXED_AMOUNT: "Fester Betrag",
  FREE_DELIVERY: "Gratis Lieferung",
};

type FormState = {
  id?: string;
  code: string;
  description: string;
  type: CouponRow["type"];
  value: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  usageLimitPerUser: string;
  isFirstOrderOnly: boolean;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

function toDateInput(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

function CouponDialog({
  initial,
  trigger,
}: {
  initial?: CouponRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(() => ({
    id: initial?.id,
    code: initial?.code ?? "",
    description: initial?.description ?? "",
    type: initial?.type ?? "PERCENTAGE",
    value:
      initial == null
        ? ""
        : initial.type === "FIXED_AMOUNT"
          ? (initial.value / 100).toFixed(2)
          : initial.value.toString(),
    minOrderAmount: initial ? (initial.minOrderAmount / 100).toFixed(2) : "0",
    maxDiscountAmount: initial?.maxDiscountAmount
      ? (initial.maxDiscountAmount / 100).toFixed(2)
      : "",
    usageLimit: initial?.usageLimit?.toString() ?? "",
    usageLimitPerUser: initial?.usageLimitPerUser?.toString() ?? "1",
    isFirstOrderOnly: initial?.isFirstOrderOnly ?? false,
    startsAt: toDateInput(initial?.startsAt ?? null),
    expiresAt: toDateInput(initial?.expiresAt ?? null),
    isActive: initial?.isActive ?? true,
  }));
  const [isPending, startTransition] = React.useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertCoupon({
        id: form.id,
        code: form.code,
        description: form.description,
        type: form.type,
        value: form.type === "FREE_DELIVERY" ? 0 : form.value,
        minOrderAmount: form.minOrderAmount || 0,
        maxDiscountAmount:
          form.maxDiscountAmount === "" ? null : form.maxDiscountAmount,
        usageLimit: form.usageLimit === "" ? null : form.usageLimit,
        usageLimitPerUser:
          form.usageLimitPerUser === "" ? null : form.usageLimitPerUser,
        isFirstOrderOnly: form.isFirstOrderOnly,
        startsAt: form.startsAt,
        expiresAt: form.expiresAt,
        isActive: form.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  const selectClass =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Gutschein bearbeiten" : "Neuer Gutschein"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-code">Code</Label>
            <Input
              id="c-code"
              required
              className="uppercase"
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-type">Typ</Label>
            <select
              id="c-type"
              value={form.type}
              onChange={(e) => set("type", e.target.value as CouponRow["type"])}
              className={selectClass}
            >
              <option value="PERCENTAGE">Prozent-Rabatt</option>
              <option value="FIXED_AMOUNT">Fester Betrag (€)</option>
              <option value="FREE_DELIVERY">Gratis Lieferung</option>
            </select>
          </div>
          {form.type !== "FREE_DELIVERY" ? (
            <div className="space-y-1.5">
              <Label htmlFor="c-value">
                {form.type === "PERCENTAGE" ? "Prozent (1–100)" : "Betrag (€)"}
              </Label>
              <Input
                id="c-value"
                required
                inputMode="decimal"
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="c-min">Mindestbestellwert (€)</Label>
            <Input
              id="c-min"
              inputMode="decimal"
              value={form.minOrderAmount}
              onChange={(e) => set("minOrderAmount", e.target.value)}
            />
          </div>
          {form.type === "PERCENTAGE" ? (
            <div className="space-y-1.5">
              <Label htmlFor="c-max">Max. Rabatt (€, optional)</Label>
              <Input
                id="c-max"
                inputMode="decimal"
                value={form.maxDiscountAmount}
                onChange={(e) => set("maxDiscountAmount", e.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="c-limit">Gesamt-Limit (optional)</Label>
            <Input
              id="c-limit"
              inputMode="numeric"
              value={form.usageLimit}
              onChange={(e) => set("usageLimit", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-limit-user">Limit pro Kunde</Label>
            <Input
              id="c-limit-user"
              inputMode="numeric"
              value={form.usageLimitPerUser}
              onChange={(e) => set("usageLimitPerUser", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-start">Gültig ab (optional)</Label>
            <Input
              id="c-start"
              type="date"
              value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-end">Gültig bis (optional)</Label>
            <Input
              id="c-end"
              type="date"
              value={form.expiresAt}
              onChange={(e) => set("expiresAt", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-desc">Beschreibung (optional)</Label>
            <Input
              id="c-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.isFirstOrderOnly}
              onCheckedChange={(c) => set("isFirstOrderOnly", c === true)}
            />
            Nur erste Bestellung
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(c) => set("isActive", c === true)}
            />
            Aktiv
          </label>
          <Button
            type="submit"
            variant="gold"
            className="sm:col-span-2"
            loading={isPending}
          >
            Speichern
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function toggle(id: string) {
    startTransition(async () => {
      const result = await toggleCouponActive(id);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("Gutschein löschen?")) return;
    startTransition(async () => {
      const result = await deleteCoupon(id);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Gutscheine</h1>
        <CouponDialog
          trigger={
            <Button variant="gold" size="sm">
              <Plus /> Neuer Gutschein
            </Button>
          }
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Typ / Wert</th>
              <th className="px-4 py-3">Bedingungen</th>
              <th className="px-4 py-3 text-right">Genutzt</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Noch keine Gutscheine.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr
                  key={coupon.id}
                  className="border-b last:border-0 hover:bg-accent/40"
                >
                  <td className="px-4 py-3">
                    <code className="font-semibold">{coupon.code}</code>
                    {coupon.isFirstOrderOnly ? (
                      <Badge variant="outline" className="ml-2">
                        1. Bestellung
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {TYPE_LABEL[coupon.type]}:{" "}
                    {coupon.type === "PERCENTAGE"
                      ? `${coupon.value} %`
                      : coupon.type === "FIXED_AMOUNT"
                        ? formatPrice(coupon.value)
                        : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {coupon.minOrderAmount > 0
                      ? `ab ${formatPrice(coupon.minOrderAmount)}`
                      : "kein Minimum"}
                    {coupon.expiresAt
                      ? ` · bis ${coupon.expiresAt.slice(0, 10)}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {coupon.usedCount}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={coupon.isActive ? "success" : "secondary"}>
                      {coupon.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <CouponDialog
                        initial={coupon}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                          >
                            Bearbeiten
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => toggle(coupon.id)}
                      >
                        {coupon.isActive ? "Aus" : "An"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={isPending}
                        onClick={() => remove(coupon.id)}
                      >
                        Löschen
                      </Button>
                    </div>
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
