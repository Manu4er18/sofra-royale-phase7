"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { toast } from "sonner";

import {
  refundOrder,
  saveStaffNote,
  updateOrderStatus,
} from "@/actions/admin/orders";
import { ORDER_TRANSITIONS } from "@/lib/order-transitions";
import { ORDER_STATUS_LABEL } from "@/components/order/order-status-timeline";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Status-advance buttons — only valid transitions are offered. */
export function OrderStatusControls({
  orderId,
  status,
  deliveryMethod,
}: {
  orderId: string;
  status: OrderStatus;
  deliveryMethod: "DELIVERY" | "PICKUP" | "DINE_IN";
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const targets = (ORDER_TRANSITIONS[status] ?? []).filter((t) => {
    if (t === "OUT_FOR_DELIVERY") return deliveryMethod === "DELIVERY";
    if (t === "READY_FOR_PICKUP") return deliveryMethod !== "DELIVERY";
    return true;
  });

  function transition(toStatus: OrderStatus) {
    const note =
      toStatus === "CANCELLED"
        ? (window.prompt("Grund der Stornierung (für den Kunden sichtbar):") ??
          undefined)
        : undefined;
    if (toStatus === "CANCELLED" && note === undefined) return; // abgebrochen
    startTransition(async () => {
      const result = await updateOrderStatus({ orderId, toStatus, note });
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  if (targets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine weiteren Statusänderungen möglich.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {targets.map((target) => (
        <Button
          key={target}
          size="sm"
          variant={target === "CANCELLED" ? "destructive" : "gold"}
          disabled={isPending}
          onClick={() => transition(target)}
        >
          → {ORDER_STATUS_LABEL[target]}
        </Button>
      ))}
    </div>
  );
}

export function StaffNoteForm({
  orderId,
  initialNote,
}: {
  orderId: string;
  initialNote: string;
}) {
  const router = useRouter();
  const [note, setNote] = React.useState(initialNote);
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveStaffNote({ orderId, note });
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Label htmlFor="staff-note">Interne Notiz</Label>
      <textarea
        id="staff-note"
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 1000))}
        rows={3}
        placeholder="Nur für das Team sichtbar …"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="submit" size="sm" variant="secondary" loading={isPending}>
        Notiz speichern
      </Button>
    </form>
  );
}

/** Refund dialog (MANAGER+) — full or partial amount in euros. */
export function RefundDialog({
  orderId,
  maxRefundable,
}: {
  orderId: string;
  maxRefundable: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState((maxRefundable / 100).toFixed(2));
  const [reason, setReason] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Bitte einen gültigen Betrag angeben.");
      return;
    }
    startTransition(async () => {
      const result = await refundOrder({ orderId, amount: cents, reason });
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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Erstatten (max. {formatPrice(maxRefundable)})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zahlung erstatten</DialogTitle>
          <DialogDescription>
            Die Erstattung läuft über Stripe zurück auf das Zahlungsmittel des
            Kunden.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="refund-amount">Betrag (€)</Label>
            <Input
              id="refund-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refund-reason">Grund (optional)</Label>
            <Input
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              placeholder="z. B. Reklamation"
            />
          </div>
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            loading={isPending}
          >
            Erstattung ausführen
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
