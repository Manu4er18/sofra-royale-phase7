"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteAddress, saveAddress } from "@/actions/account";
import type { AddressInput } from "@/lib/validations/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type AddressRow = {
  id: string;
  label: string | null;
  type: "HOME" | "WORK" | "OTHER";
  recipientName: string;
  phone: string;
  street: string;
  houseNumber: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  deliveryNotes: string | null;
  isDefault: boolean;
};

const EMPTY: AddressInput = {
  label: "",
  type: "HOME",
  recipientName: "",
  phone: "",
  street: "",
  houseNumber: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  deliveryNotes: "",
  isDefault: false,
};

function AddressFormDialog({
  initial,
  trigger,
}: {
  initial?: AddressRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<AddressInput>(
    initial
      ? {
          id: initial.id,
          label: initial.label ?? "",
          type: initial.type,
          recipientName: initial.recipientName,
          phone: initial.phone,
          street: initial.street,
          houseNumber: initial.houseNumber,
          addressLine2: initial.addressLine2 ?? "",
          postalCode: initial.postalCode,
          city: initial.city,
          deliveryNotes: initial.deliveryNotes ?? "",
          isDefault: initial.isDefault,
        }
      : EMPTY,
  );
  const [isPending, startTransition] = React.useTransition();

  function set<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveAddress(form);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      if (!initial) setForm(EMPTY);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Adresse bearbeiten" : "Neue Adresse"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="addr-label">Bezeichnung (optional)</Label>
            <Input
              id="addr-label"
              placeholder="Zuhause, Büro …"
              value={form.label ?? ""}
              onChange={(e) => set("label", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-type">Typ</Label>
            <select
              id="addr-type"
              value={form.type}
              onChange={(e) =>
                set("type", e.target.value as AddressInput["type"])
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="HOME">Zuhause</option>
              <option value="WORK">Arbeit</option>
              <option value="OTHER">Sonstiges</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addr-name">Empfänger</Label>
            <Input
              id="addr-name"
              required
              value={form.recipientName}
              onChange={(e) => set("recipientName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-street">Straße</Label>
            <Input
              id="addr-street"
              required
              value={form.street}
              onChange={(e) => set("street", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-no">Hausnummer</Label>
            <Input
              id="addr-no"
              required
              value={form.houseNumber}
              onChange={(e) => set("houseNumber", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-plz">PLZ</Label>
            <Input
              id="addr-plz"
              required
              inputMode="numeric"
              maxLength={5}
              value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-city">Ort</Label>
            <Input
              id="addr-city"
              required
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addr-phone">Telefon</Label>
            <Input
              id="addr-phone"
              required
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addr-notes">Lieferhinweise (optional)</Label>
            <Input
              id="addr-notes"
              placeholder="z. B. 3. Etage, bitte klingeln"
              value={form.deliveryNotes ?? ""}
              onChange={(e) => set("deliveryNotes", e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={form.isDefault}
              onCheckedChange={(checked) => set("isDefault", checked === true)}
            />
            Als Standardadresse verwenden
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

/** Address list with add/edit/delete. */
export function AddressManager({ addresses }: { addresses: AddressRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteAddress(id);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Adressen</h1>
        <AddressFormDialog
          trigger={
            <Button variant="gold" size="sm">
              <Plus /> Neue Adresse
            </Button>
          }
        />
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">
              Noch keine Adressen gespeichert — beim Checkout oder hier anlegen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-2 p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">
                      {address.label ??
                        (address.type === "HOME"
                          ? "Zuhause"
                          : address.type === "WORK"
                            ? "Arbeit"
                            : "Adresse")}
                    </p>
                    {address.isDefault ? (
                      <Badge variant="gold">Standard</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {address.recipientName}
                    <br />
                    {address.street} {address.houseNumber}
                    {address.addressLine2 ? (
                      <>
                        <br />
                        {address.addressLine2}
                      </>
                    ) : null}
                    <br />
                    {address.postalCode} {address.city}
                    <br />
                    {address.phone}
                  </p>
                  <div className="mt-auto flex gap-2 pt-2">
                    <AddressFormDialog
                      initial={address}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Pencil /> Bearbeiten
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={isPending}
                      onClick={() => remove(address.id)}
                    >
                      <Trash2 /> Löschen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
