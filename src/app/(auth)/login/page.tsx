import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Melden Sie sich bei Ihrem Sofra-Royale-Konto an.",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/account");

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
        <CardDescription>
          Melden Sie sich an, um zu bestellen und Treuepunkte zu sammeln.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* useSearchParams (callbackUrl) requires a Suspense boundary. */}
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
