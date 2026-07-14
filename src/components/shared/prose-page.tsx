import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Shared layout for text-heavy content/legal pages: breadcrumb, title,
 * intro, and a readable prose column. Children use plain semantic HTML.
 */
export function ProsePage({
  title,
  eyebrow,
  intro,
  updated,
  children,
}: {
  title: string;
  eyebrow?: string;
  intro?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container max-w-3xl py-12">
      <nav aria-label="Brotkrumen" className="mb-6">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground">
              Startseite
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <li aria-current="page" className="font-medium text-foreground">
            {title}
          </li>
        </ol>
      </nav>

      <header className="mb-8">
        {eyebrow ? (
          <p className="text-sm uppercase tracking-widest text-gold">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{title}</h1>
        {intro ? (
          <p className="mt-3 text-muted-foreground">{intro}</p>
        ) : null}
        {updated ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Zuletzt aktualisiert: {updated}
          </p>
        ) : null}
      </header>

      <div className="space-y-5 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-gold [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}

/**
 * Notice shown atop template legal pages — these MUST be reviewed by a
 * qualified lawyer before going live in production.
 */
export function LegalTemplateNotice() {
  return (
    <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground dark:text-warning">
      <strong>Hinweis für den Betreiber:</strong> Dies ist eine Vorlage. Vor
      der Veröffentlichung müssen die Angaben durch eine Rechtsberatung
      geprüft und an Ihr Unternehmen angepasst werden.
    </p>
  );
}
