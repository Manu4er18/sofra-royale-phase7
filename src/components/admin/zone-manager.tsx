"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { deleteZone, upsertZone } from "@/actions/admin/catalog-config";
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

export type ZoneRow = {
  id: string;
  name: string;
  postalCodes: string[];
  deliveryFee: number;
  minOrderAmount: number;
  freeDeliveryThreshold: number | null;
  estimatedMinutes: number;
  isActive: boolean;
};

type FormState = {
  id?: string;
  name: string;
  postalCodes: string;
  deliveryFee: string;
  minOrderAmount: string;
  freeDeliveryThreshold: string;
  estimatedMinutes: string;
  isActive: boolean;
};

function ZoneDialog({
  initial,
  trigger,
}: {
  initial?: ZoneRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(() => ({
    id: initial?.id,
    name: initial?.name ?? "",
    postalCodes: initial?.postalCodes.join(", ") ?? "",
    deliveryFee: initial ? (initial.deliveryFee / 100).toFixed(2) : "",
    minOrderAmount: initial ? (initial.minOrderAmount / 100).toFixed(2) : "0",
    freeDeliveryThreshold: initial?.freeDeliveryThreshold
      ? (initial.freeDeliveryThreshold / 100).toFixed(2)
      : "",
    estimatedMinutes: initial?.estimatedMinutes.toString() ?? "45",
    isActive: initial?.isActive ?? true,
  }));
  const [isPending, startTransition] = React.useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertZone({
        id: form.id,
        name: form.name,
        postalCodes: form.postalCodes,
        deliveryFee: form.deliveryFee,
        minOrderAmount: form.minOrderAmount || 0,
        freeDeliveryThreshold:
          form.freeDeliveryThreshold === "" ? null : form.freeDeliveryThreshold,
        estimatedMinutes: form.estimatedMinutes,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Liefergebiet bearbeiten" : "Neues Liefergebiet"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="z-name">Name</Label>
            <Input
              id="z-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="z-codes">Postleitzahlen (Komma-getrennt)</Label>
            <textarea
              id="z-codes"
              required
              rows={2}
              placeholder="40210, 40211, 40212"
              value={form.postalCodes}
              onChange={(e) => set("postalCodes", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-fee">Liefergebühr (€)</Label>
            <Input
              id="z-fee"
              required
              inputMode="decimal"
              value={form.deliveryFee}
              onChange={(e) => set("deliveryFee", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-min">Mindestbestellwert (€)</Label>
            <Input
              id="z-min"
              inputMode="decimal"
              value={form.minOrderAmount}
              onChange={(e) => set("minOrderAmount", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-free">Gratis-Lieferung ab (€, optional)</Label>
            <Input
              id="z-free"
              inputMode="decimal"
              value={form.freeDeliveryThreshold}
              onChange={(e) => set("freeDeliveryThreshold", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-min-time">Lieferzeit (Min.)</Label>
            <Input
              id="z-min-time"
              inputMode="numeric"
              value={form.estimatedMinutes}
              onChange={(e) => set("estimatedMinutes", e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(c) => set("isActive", c === true)}
            />
            Aktiv (Kunden können hierher bestellen)
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

export function ZoneManager({ zones }: { zones: ZoneRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function remove(id: string) {
    if (!window.confirm("Liefergebiet löschen?")) return;
    startTransition(async () => {
      const result = await deleteZone(id);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Liefergebiete</h1>
        <ZoneDialog
          trigger={
            <Button variant="gold" size="sm">
              <Plus /> Neues Gebiet
            </Button>
          }
        />
      </div>

      {zones.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Noch keine Liefergebiete — ohne Gebiet ist keine Lieferung möglich.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {zones.map((zone) => (
            <li
              key={zone.id}
              className="space-y-2 rounded-lg border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{zone.name}</p>
                <Badge variant={zone.isActive ? "success" : "secondary"}>
                  {zone.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Gebühr {formatPrice(zone.deliveryFee)} · Min.{" "}
                {formatPrice(zone.minOrderAmount)}
                {zone.freeDeliveryThreshold
                  ? ` · gratis ab ${formatPrice(zone.freeDeliveryThreshold)}`
                  : ""}{" "}
                · ca. {zone.estimatedMinutes} Min.
              </p>
              <p className="text-xs text-muted-foreground">
                {zone.postalCodes.length} PLZ: {zone.postalCodes.join(", ")}
              </p>
              <div className="flex gap-2 pt-1">
                <ZoneDialog
                  initial={zone}
                  trigger={
                    <Button variant="outline" size="sm">
                      Bearbeiten
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={isPending}
                  onClick={() => remove(zone.id)}
                >
                  Löschen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
