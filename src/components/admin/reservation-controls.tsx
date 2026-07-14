"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  addBlackoutDate,
  removeBlackoutDate,
  updateReservationStatus,
} from "@/actions/admin/moderation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Table = { id: string; name: string; capacity: number; area: string };

/** Confirm/cancel/complete + optional table assignment for a reservation. */
export function ReservationControls({
  reservationId,
  status,
  currentTableId,
  tables,
}: {
  reservationId: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  currentTableId: string | null;
  tables: Table[];
}) {
  const router = useRouter();
  const [tableId, setTableId] = React.useState(currentTableId ?? "");
  const [isPending, startTransition] = React.useTransition();

  function update(next: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW") {
    startTransition(async () => {
      const result = await updateReservationStatus({
        reservationId,
        status: next,
        tableId: tableId || undefined,
      });
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  const done =
    status === "CANCELLED" || status === "COMPLETED" || status === "NO_SHOW";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tables.length > 0 ? (
        <select
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          aria-label="Tisch zuweisen"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Tisch …</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.capacity}P, {t.area === "INDOOR" ? "innen" : "Terr."}
              )
            </option>
          ))}
        </select>
      ) : null}
      {status === "PENDING" ? (
        <Button
          size="sm"
          variant="gold"
          disabled={isPending}
          onClick={() => update("CONFIRMED")}
        >
          Bestätigen
        </Button>
      ) : null}
      {status === "CONFIRMED" ? (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => update("COMPLETED")}
          >
            Erschienen
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => update("NO_SHOW")}
          >
            No-Show
          </Button>
        </>
      ) : null}
      {!done ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={() => update("CANCELLED")}
        >
          Stornieren
        </Button>
      ) : null}
    </div>
  );
}

/** Blackout-date manager (MANAGER+). */
export function BlackoutManager({
  blackouts,
}: {
  blackouts: Array<{ id: string; date: string; reason: string | null }>;
}) {
  const router = useRouter();
  const [date, setDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function add(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addBlackoutDate({ date, reason });
      if (!result.success) toast.error(result.error);
      else {
        toast.success(result.message);
        setDate("");
        setReason("");
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeBlackoutDate(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <Input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-40"
          aria-label="Sperrdatum"
        />
        <Input
          placeholder="Grund (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-9 flex-1"
          aria-label="Grund"
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          className="h-9"
          loading={isPending}
        >
          Sperrtag hinzufügen
        </Button>
      </form>
      {blackouts.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {blackouts.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
            >
              {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(
                new Date(b.date),
              )}
              {b.reason ? ` — ${b.reason}` : ""}
              <button
                type="button"
                onClick={() => remove(b.id)}
                className="text-destructive"
                aria-label="Sperrtag entfernen"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Keine Sperrtage.</p>
      )}
    </div>
  );
}
