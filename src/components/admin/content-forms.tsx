"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteFaq,
  saveContactSettings,
  saveHeroSettings,
  saveHoursSettings,
  upsertFaq,
} from "@/actions/admin/catalog-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const inputClass = "";

export function ContactForm({
  initial,
}: {
  initial: { address: string; phone: string; email: string };
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveContactSettings(form);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kontaktdaten</CardTitle>
        <CardDescription>
          Erscheinen im Footer und auf Kontakt-/Reservierungsseiten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-address">Adresse</Label>
            <Input
              id="s-address"
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-phone">Telefon</Label>
            <Input
              id="s-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">E-Mail</Label>
            <Input
              id="s-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" variant="gold" size="sm" loading={isPending}>
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function HeroForm({
  initial,
}: {
  initial: { title: string; subtitle: string; imageUrl: string };
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveHeroSettings(form);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Startseiten-Hero</CardTitle>
        <CardDescription>
          Titel, Untertitel und Hintergrundbild der Startseite. (Bild-URL:
          Cloudinary/Unsplash.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="h-title">Titel</Label>
            <Input
              id="h-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-sub">Untertitel</Label>
            <textarea
              id="h-sub"
              rows={2}
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-img">Bild-URL</Label>
            <Input
              id="h-img"
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </div>
          <Button type="submit" variant="gold" size="sm" loading={isPending}>
            Speichern
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function HoursForm({
  initial,
}: {
  initial: { weekdays: string; weekend: string; sunday: string };
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveHoursSettings(form);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Öffnungszeiten (Anzeige)</CardTitle>
        <CardDescription>
          Freitext-Anzeige im Footer. Reservierungs-Slots bleiben separat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="hr-wd">Mo–Do</Label>
            <Input
              id="hr-wd"
              value={form.weekdays}
              onChange={(e) => setForm({ ...form, weekdays: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hr-we">Fr–Sa</Label>
            <Input
              id="hr-we"
              value={form.weekend}
              onChange={(e) => setForm({ ...form, weekend: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hr-su">So</Label>
            <Input
              id="hr-su"
              value={form.sunday}
              onChange={(e) => setForm({ ...form, sunday: e.target.value })}
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" variant="gold" size="sm" loading={isPending}>
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export type FaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  isVisible: boolean;
};

function FaqDialog({
  initial,
  trigger,
}: {
  initial?: FaqRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    id: initial?.id,
    question: initial?.question ?? "",
    answer: initial?.answer ?? "",
    category: initial?.category ?? "",
    isVisible: initial?.isVisible ?? true,
  });
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertFaq(form);
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
          <DialogTitle>{initial ? "FAQ bearbeiten" : "Neue FAQ"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-q">Frage</Label>
            <Input
              id="f-q"
              required
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-a">Antwort</Label>
            <textarea
              id="f-a"
              required
              rows={4}
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-cat">Kategorie (optional)</Label>
            <Input
              id="f-cat"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.isVisible}
              onCheckedChange={(c) =>
                setForm({ ...form, isVisible: c === true })
              }
            />
            Sichtbar
          </label>
          <Button type="submit" variant="gold" loading={isPending}>
            Speichern
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FaqManager({ faqs }: { faqs: FaqRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function remove(id: string) {
    if (!window.confirm("FAQ löschen?")) return;
    startTransition(async () => {
      const result = await deleteFaq(id);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">FAQ</CardTitle>
          <CardDescription>Häufige Fragen für Kunden.</CardDescription>
        </div>
        <FaqDialog
          trigger={
            <Button variant="gold" size="sm">
              <Plus /> Neue FAQ
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine FAQ.</p>
        ) : (
          <ul className="divide-y">
            {faqs.map((faq) => (
              <li
                key={faq.id}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {faq.question}
                    {!faq.isVisible ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (ausgeblendet)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <FaqDialog
                    initial={faq}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Bearbeiten
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    disabled={isPending}
                    aria-label="FAQ löschen"
                    onClick={() => remove(faq.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
