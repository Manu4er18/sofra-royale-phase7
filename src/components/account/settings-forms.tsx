"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AlertTriangle, Camera } from "lucide-react";
import { toast } from "sonner";

import {
  changePassword,
  deleteAccount,
  updateProfile,
} from "@/actions/account";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function ProfileForm({
  initial,
}: {
  initial: {
    name: string;
    phone: string;
    image: string;
    marketingOptIn: boolean;
  };
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initial.name);
  const [phone, setPhone] = React.useState(initial.phone);
  const [image, setImage] = React.useState(initial.image);
  const [marketingOptIn, setMarketingOptIn] = React.useState(
    initial.marketingOptIn,
  );
  const [isUploading, setIsUploading] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.set("avatar", file);
    setIsUploading(true);
    try {
      const response = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        imageUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.imageUrl) {
        toast.error(result.error ?? "Profilbild konnte nicht hochgeladen werden.");
        return;
      }
      setImage(result.imageUrl);
      toast.success("Profilbild aktualisiert.");
      router.refresh();
    } finally {
      setIsUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateProfile({ name, phone, marketingOptIn });
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
        <CardTitle>Profil</CardTitle>
        <CardDescription>
          Name und Telefonnummer für Bestellungen und Reservierungen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 sm:col-span-2">
            <Avatar className="h-16 w-16">
              <AvatarImage src={image || undefined} alt="" />
              <AvatarFallback>
                {name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("") || "SR"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                loading={isUploading}
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Profilbild ändern
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP oder GIF bis 5 MB.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">Telefon (optional)</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={marketingOptIn}
              onCheckedChange={(c) => setMarketingOptIn(c === true)}
            />
            Ich möchte Angebote und Neuigkeiten per E-Mail erhalten.
          </label>
          <div>
            <Button type="submit" variant="gold" loading={isPending}>
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await changePassword({
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      });
      if (!result.success) toast.error(result.error);
      else {
        toast.success(result.message);
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passwort ändern</CardTitle>
        <CardDescription>
          {hasPassword
            ? "Mindestens 10 Zeichen mit Groß-, Kleinbuchstaben und Ziffer."
            : "Dieses Konto meldet sich über Google an — es gibt kein Passwort zu ändern."}
        </CardDescription>
      </CardHeader>
      {hasPassword ? (
        <CardContent>
          <form onSubmit={submit} className="grid max-w-md gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw-current">Aktuelles Passwort</Label>
              <Input
                id="pw-current"
                type="password"
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-new">Neues Passwort</Label>
              <Input
                id="pw-new"
                type="password"
                required
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm">Neues Passwort bestätigen</Label>
              <Input
                id="pw-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <div>
              <Button type="submit" variant="gold" loading={isPending}>
                Passwort ändern
              </Button>
            </div>
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Danger zone
// ---------------------------------------------------------------------------

export function DeleteAccountCard({ hasPassword }: { hasPassword: boolean }) {
  const [confirmation, setConfirmation] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await deleteAccount({ confirmation });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      await signOut({ callbackUrl: "/" });
    });
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" aria-hidden /> Konto löschen
        </CardTitle>
        <CardDescription>
          Ihre persönlichen Daten werden entfernt. Bestellbelege bleiben aus
          steuerlichen Gründen anonymisiert erhalten. Dieser Schritt kann nicht
          rückgängig gemacht werden.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">Konto unwiderruflich löschen</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sind Sie sicher?</DialogTitle>
              <DialogDescription>
                {hasPassword
                  ? "Geben Sie zur Bestätigung Ihr Passwort ein."
                  : "Geben Sie zur Bestätigung LÖSCHEN ein."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <Input
                type={hasPassword ? "password" : "text"}
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={hasPassword ? "Ihr Passwort" : "LÖSCHEN"}
                aria-label="Bestätigung"
              />
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                loading={isPending}
              >
                Endgültig löschen
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
