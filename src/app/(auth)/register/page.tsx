import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Konto erstellen",
  description:
    "Erstellen Sie Ihr Sofra-Royale-Konto — bestellen, reservieren, Treuepunkte sammeln.",
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/account");

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Konto erstellen</CardTitle>
        <CardDescription>
          In weniger als einer Minute registriert — Ihre erste Bestellung wartet
          schon.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
