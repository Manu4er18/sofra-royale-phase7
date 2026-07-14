"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { toast } from "sonner";

import { createReservation } from "@/actions/reservations";
import { RESERVATION_SLOTS } from "@/lib/validations/reservation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Public reservation form (guests + logged-in, prefilled). */
export function ReservationForm({
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [form, setForm] = React.useState({
    name: defaultName,
    email: defaultEmail,
    phone: defaultPhone,
    date: "",
    timeSlot: "" as string,
    guests: 2,
    area: "INDOOR" as "INDOOR" | "OUTDOOR",
    specialRequests: "",
  });

  const minDate = new Date().toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 60 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.timeSlot) {
      toast.error("Bitte eine Uhrzeit wählen.");
      return;
    }
    startTransition(async () => {
      const result = await createReservation({
        ...form,
        guests: Number(form.guests),
      });
      if (!result.success) {
        toast.error("Reservierung nicht möglich", {
          description: result.error,
        });
        return;
      }
      toast.success("Anfrage gesendet!", { description: result.message });
      setForm((f) => ({ ...f, date: "", timeSlot: "", specialRequests: "" }));
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-lg border bg-card p-6 sm:grid-cols-2"
    >
      <div className="space-y-1.5">
        <Label htmlFor="res-date">Datum</Label>
        <Input
          id="res-date"
          type="date"
          required
          min={minDate}
          max={maxDate}
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="res-time">Uhrzeit</Label>
        <select
          id="res-time"
          required
          value={form.timeSlot}
          onChange={(e) => set("timeSlot", e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>
            Bitte wählen …
          </option>
          {RESERVATION_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {slot} Uhr
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="res-guests">Personen</Label>
        <select
          id="res-guests"
          value={form.guests}
          onChange={(e) => set("guests", Number(e.target.value))}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "Person" : "Personen"}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="res-area">Bereich</Label>
        <select
          id="res-area"
          value={form.area}
          onChange={(e) => set("area", e.target.value as "INDOOR" | "OUTDOOR")}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="INDOOR">Innenbereich</option>
          <option value="OUTDOOR">Terrasse</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="res-name">Name</Label>
        <Input
          id="res-name"
          required
          autoComplete="name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="res-phone">Telefon</Label>
        <Input
          id="res-phone"
          type="tel"
          required
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="res-email">E-Mail</Label>
        <Input
          id="res-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="res-requests">Besondere Wünsche (optional)</Label>
        <textarea
          id="res-requests"
          rows={2}
          maxLength={500}
          placeholder="z. B. Kindersitz, Geburtstag, Fensterplatz …"
          value={form.specialRequests}
          onChange={(e) => set("specialRequests", e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button
        type="submit"
        variant="gold"
        size="lg"
        className="sm:col-span-2"
        loading={isPending}
      >
        <CalendarCheck /> Tisch anfragen
      </Button>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        Ihre Anfrage wird sofort geprüft; die verbindliche Bestätigung erhalten
        Sie vom Restaurant. Gruppen über 12 Personen bitte telefonisch.
      </p>
    </form>
  );
}
