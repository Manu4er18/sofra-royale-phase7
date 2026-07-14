import type { Metadata } from "next";
import * as crypto from "node:crypto";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Passwort zurücksetzen",
  description: "Wählen Sie ein neues Passwort für Ihr Sofra-Royale-Konto.",
};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const resetRecord = token
    ? await db.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(token) },
        select: {
          expires: true,
          usedAt: true,
          user: { select: { email: true } },
        },
      })
    : null;
  const canReset =
    Boolean(token) &&
    Boolean(resetRecord) &&
    !resetRecord?.usedAt &&
    (resetRecord?.expires ?? new Date(0)) >= new Date();

  return (
    <Card
      style={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,.06)",
        background: "rgba(17,16,15,.72)",
        color: "#f8efe3",
        boxShadow: "0 24px 70px rgba(0,0,0,.28)",
      }}
    >
      <CardHeader className="text-center" style={{ padding: "22px 22px 12px", textAlign: "center" }}>
        <CardTitle
          className="text-2xl"
          style={{
            margin: 0,
            fontFamily: "Georgia, serif",
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#f8efe3",
          }}
        >
          Passwort zurücksetzen
        </CardTitle>
        <CardDescription
          style={{
            marginTop: 10,
            color: "#e7dac8",
            fontSize: 17,
            lineHeight: 1.5,
          }}
        >
          Wählen Sie ein neues Passwort für Ihr Konto.
        </CardDescription>
      </CardHeader>
      <CardContent style={{ padding: "0 22px 22px" }}>
        {canReset ? (
          <ResetPasswordForm token={token} email={resetRecord?.user.email} />
        ) : (
          <p
            className="text-center text-sm text-muted-foreground"
            style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: 14,
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            Dieser Link ist ungültig.{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline dark:text-gold"
              style={{ color: "hsl(var(--gold))", fontWeight: 600 }}
            >
              Zur Anmeldung
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
