"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import {
  loginSchema,
  type LoginFormInput,
  type LoginInput,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { GoogleButton } from "@/components/auth/google-button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PasswordCredentialConstructor = new (data: {
  id: string;
  name?: string;
  password: string;
}) => Credential;

async function storePasswordCredential(email: string, password: string) {
  const credentialConstructor = (
    window as Window & { PasswordCredential?: PasswordCredentialConstructor }
  ).PasswordCredential;

  if (!credentialConstructor || !navigator.credentials?.store) return;

  try {
    await navigator.credentials.store(
      new credentialConstructor({ id: email, name: email, password }),
    );
  } catch {
    // Browsers may silently reject credential storage; login should continue.
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/account";
  const verified = searchParams.get("verified");
  const registered = searchParams.get("registered");
  const [isPending, startTransition] = React.useTransition();
  const [showPassword, setShowPassword] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [isResetPending, startResetTransition] = React.useTransition();

  const form = useForm<LoginFormInput, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  function onSubmit(values: LoginInput) {
    startTransition(async () => {
      const verification = await fetch("/api/auth/verification-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      })
        .then((response) => response.json())
        .catch(() => null);

      if (verification?.exists && !verification?.verified) {
        toast.error("Anmeldung nicht möglich", {
          description: "Bitte bestätigen Sie сначала вашу почту",
        });
        return;
      }

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Anmeldung fehlgeschlagen", {
          description:
            "E-Mail oder Passwort ist falsch — oder das Konto ist gesperrt.",
        });
        return;
      }

      await storePasswordCredential(values.email, values.password);
      toast.success("Willkommen zurück!");
      router.push(callbackUrl);
      router.refresh();
    });
  }

  function requestPasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = forgotEmail || form.getValues("email");

    startResetTransition(async () => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        toast.error("E-Mail konnte nicht gesendet werden", {
          description: "Bitte versuchen Sie es in einem Moment erneut.",
        });
        return;
      }

      toast.success("Prüfen Sie Ihr Postfach", {
        description:
          "Falls ein Konto existiert, wurde ein Link zum Zurücksetzen gesendet.",
      });
      setForgotOpen(false);
    });
  }

  return (
    <div className="space-y-6">
      <GoogleButton label="Mit Google anmelden" callbackUrl={callbackUrl} />

      {verified === "1" ? (
        <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success-foreground dark:text-green-200">
          Ihre E-Mail-Adresse wurde bestätigt. Sie können sich jetzt anmelden.
        </p>
      ) : null}
      {verified === "invalid" ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Dieser Bestätigungslink ist ungültig oder abgelaufen. Bitte
          registrieren Sie sich erneut oder fordern Sie einen neuen Link an.
        </p>
      ) : null}
      {registered === "check-email" ? (
        <p className="rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-muted-foreground">
          Konto erstellt. Bitte öffnen Sie den Bestätigungslink in Ihrer
          E-Mail, bevor Sie sich anmelden.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          oder
        </span>
        <Separator className="flex-1" />
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          autoComplete="on"
          noValidate
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => {
              const { name, ...inputProps } = field;
              return (
                <FormItem>
                  <FormLabel>E-Mail-Adresse</FormLabel>
                  <FormControl>
                    <Input
                      name={name}
                      type="email"
                      autoComplete="email"
                      placeholder="ihre@email.de"
                      {...inputProps}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => {
              const { name, ...inputProps } = field;
              return (
                <FormItem>
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel>Passwort</FormLabel>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(form.getValues("email"));
                        setForgotOpen(true);
                      }}
                      className="text-xs font-medium text-primary underline-offset-4 transition hover:text-gold hover:underline dark:text-gold"
                    >
                      Passwort vergessen?
                    </button>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        name={name}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••••"
                        className="pr-11"
                        {...inputProps}
                      />
                      <button
                        type="button"
                        aria-label={
                          showPassword
                            ? "Passwort ausblenden"
                            : "Passwort anzeigen"
                        }
                        onMouseDown={(event) => event.preventDefault()}
                        onTouchStart={(event) => {
                          event.preventDefault();
                          setShowPassword((value) => !value);
                        }}
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-2 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-gold/10 hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/70"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="remember"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="cursor-pointer font-normal">
                  Angemeldet bleiben
                </FormLabel>
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            variant="gold"
            loading={isPending}
          >
            Anmelden
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Noch kein Konto?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline dark:text-gold"
        >
          Jetzt registrieren
        </Link>
      </p>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="border-gold/25">
          <DialogHeader>
            <DialogTitle>Passwort vergessen?</DialogTitle>
            <DialogDescription>
              Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen
              sicheren Link zum Zurücksetzen des Passworts.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={requestPasswordReset}>
            <div className="space-y-2">
              <label
                htmlFor="forgot-email"
                className="text-sm font-medium leading-none"
              >
                E-Mail-Adresse
              </label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                placeholder="ihre@email.de"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" variant="gold" loading={isResetPending}>
                Link senden
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
