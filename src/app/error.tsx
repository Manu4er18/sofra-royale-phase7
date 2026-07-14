"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary (500-style errors inside the app shell).
 * A separate global-error.tsx covers failures in the root layout.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook up Sentry/observability here in Phase 7.
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-gold">Fehler 500</p>
      <h1 className="max-w-md text-balance text-3xl font-semibold">
        In der Küche ist etwas schiefgelaufen
      </h1>
      <p className="max-w-md text-muted-foreground">
        Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut —
        unser Team wurde informiert.
        {error.digest ? (
          <span className="mt-2 block text-xs">Referenz: {error.digest}</span>
        ) : null}
      </p>
      <Button variant="gold" onClick={() => reset()}>
        <RotateCcw /> Erneut versuchen
      </Button>
    </div>
  );
}
