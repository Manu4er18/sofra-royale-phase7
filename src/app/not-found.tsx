import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Custom 404 — served for every unknown route. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-gold">
        <UtensilsCrossed className="h-7 w-7" aria-hidden />
      </span>
      <p className="text-sm uppercase tracking-[0.3em] text-gold">Fehler 404</p>
      <h1 className="max-w-md text-balance text-3xl font-semibold">
        Dieses Gericht steht nicht auf unserer Karte
      </h1>
      <p className="max-w-md text-muted-foreground">
        Die gesuchte Seite existiert nicht oder wurde verschoben. Kehren Sie zur
        Startseite zurück — dort wartet die ganze Sofra auf Sie.
      </p>
      <Button variant="gold" asChild>
        <Link href="/">Zurück zur Startseite</Link>
      </Button>
    </div>
  );
}
