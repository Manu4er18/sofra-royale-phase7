"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import {
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    // Password managers are best-effort and browser dependent.
  }
}

export function ResetPasswordForm({
  token,
  email,
}: {
  token: string;
  email?: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const values = {
      token,
      password,
      confirmPassword,
    };

    const parsed = resetPasswordSchema.safeParse(values);
    if (!parsed.success) {
      const firstError =
        parsed.error.flatten().fieldErrors.password?.[0] ??
        parsed.error.flatten().fieldErrors.confirmPassword?.[0] ??
        "Bitte überprüfen Sie Ihre Eingaben.";
      setError(firstError);
      return;
    }

    setIsPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json().catch(() => ({
        ok: false,
        error: "Passwort konnte nicht geändert werden.",
      }))) as {
        ok?: boolean;
        error?: string;
        email?: string | null;
        fieldErrors?: Record<string, string[]>;
      };

      if (!response.ok || !result.ok) {
        const message =
          result.fieldErrors?.password?.[0] ??
          result.fieldErrors?.confirmPassword?.[0] ??
          result.error ??
          "Bitte versuchen Sie es in einem Moment erneut.";
        setError(message);
        toast.error("Passwort nicht geändert", { description: message });
        return;
      }

      if (result.email) {
        await storePasswordCredential(result.email, parsed.data.password);
      }
      toast.success("Passwort geändert", {
        description: "Sie können sich jetzt mit Ihrem neuen Passwort anmelden.",
      });
      router.push("/login");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      autoComplete="on"
      style={{ display: "grid", gap: 14 }}
      noValidate
    >
      {email ? (
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={email}
          readOnly
          hidden
        />
      ) : null}
      <input type="hidden" name="token" value={token} />

      <PasswordField
        label="Neues Passwort"
        name="password"
        value={password}
        show={showPassword}
        autoComplete="new-password"
        onChange={setPassword}
        onToggle={() => setShowPassword((value) => !value)}
      />
      <p style={{ color: "#e7dac8", fontSize: 14, lineHeight: 1.4, margin: 0 }}>
        Mindestens 10 Zeichen mit Groß-, Kleinbuchstaben und Ziffer.
      </p>
      <PasswordField
        label="Passwort bestätigen"
        name="confirmPassword"
        value={confirmPassword}
        show={showConfirmPassword}
        autoComplete="new-password"
        onChange={setConfirmPassword}
        onToggle={() => setShowConfirmPassword((value) => !value)}
      />

      {error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            borderRadius: 8,
            background: "rgba(220, 38, 38, .14)",
            color: "#fecaca",
            padding: "10px 12px",
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        variant="gold"
        loading={isPending}
        style={{
          width: "100%",
          minHeight: 44,
          border: 0,
          borderRadius: 8,
          background: "#d6a83d",
          color: "#17110c",
          fontSize: 15,
          fontWeight: 700,
          boxShadow: "0 14px 32px rgba(214,168,61,.22)",
        }}
      >
        Passwort speichern
      </Button>
    </form>
  );
}

function PasswordField({
  label,
  name,
  value,
  show,
  autoComplete,
  onChange,
  onToggle,
}: {
  label: string;
  name: string;
  value: string;
  show: boolean;
  autoComplete: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <span style={{ color: "#f8efe3", fontSize: 17, fontWeight: 700 }}>
        {label}
      </span>
      <span style={{ position: "relative", display: "block" }}>
        <Input
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={label}
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,.08)",
            background: "rgba(255,255,255,.03)",
            color: "#f8efe3",
            padding: "10px 44px 10px 12px",
            fontSize: 16,
            outline: "none",
          }}
        />
        <button
          type="button"
          aria-label={show ? "Passwort ausblenden" : "Passwort anzeigen"}
          onClick={onToggle}
          style={{
            position: "absolute",
            right: 6,
            top: "50%",
            display: "inline-flex",
            width: 38,
            height: 38,
            transform: "translateY(-50%)",
            alignItems: "center",
            justifyContent: "center",
            border: 0,
            borderRadius: 8,
            background: "transparent",
            color: "#f8efe3",
            cursor: "pointer",
            zIndex: 3,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {show ? (
            <EyeOff aria-hidden style={{ width: 18, height: 18 }} />
          ) : (
            <Eye aria-hidden style={{ width: 18, height: 18 }} />
          )}
        </button>
      </span>
    </label>
  );
}
