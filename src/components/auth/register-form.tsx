"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Path } from "react-hook-form";
import { toast } from "sonner";

import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { registerUser } from "@/actions/auth/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { GoogleButton } from "@/components/auth/google-button";
import { Separator } from "@/components/ui/separator";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      // Checkbox starts unchecked; schema enforces literal(true) on submit.
      acceptTerms: undefined as unknown as true,
    },
  });

  function onSubmit(values: RegisterInput) {
    startTransition(async () => {
      const result = await registerUser(values);

      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            const message = messages?.[0];
            if (message) {
              form.setError(field as Path<RegisterInput>, { message });
            }
          }
        }
        toast.error("Registrierung fehlgeschlagen", {
          description: result.error,
        });
        return;
      }

      toast.success("Konto erstellt!", {
        description:
          "Bitte bestätigen Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden.",
      });

      router.push("/login?registered=check-email");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <GoogleButton label="Mit Google registrieren" callbackUrl="/account" />

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
          noValidate
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => {
              const { name, ...inputProps } = field;
              return (
                <FormItem>
                  <FormLabel>Vollständiger Name</FormLabel>
                  <FormControl>
                    <Input
                      name={name}
                      autoComplete="name"
                      placeholder="Max Mustermann"
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
                  <FormLabel>Passwort</FormLabel>
                  <FormControl>
                    <Input
                      name={name}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mind. 10 Zeichen"
                      {...inputProps}
                    />
                  </FormControl>
                  <FormDescription>
                    Mindestens 10 Zeichen mit Groß-, Kleinbuchstaben und Ziffer.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => {
              const { name, ...inputProps } = field;
              return (
                <FormItem>
                  <FormLabel>Passwort bestätigen</FormLabel>
                  <FormControl>
                    <Input
                      name={name}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Passwort wiederholen"
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
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true ? true : undefined)
                    }
                    className="mt-0.5"
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel className="cursor-pointer font-normal leading-snug">
                    Ich akzeptiere die AGB und die Datenschutzerklärung.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            variant="gold"
            loading={isPending}
          >
            Konto erstellen
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Bereits registriert?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline dark:text-gold"
        >
          Zur Anmeldung
        </Link>
      </p>
    </div>
  );
}
