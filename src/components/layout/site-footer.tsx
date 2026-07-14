import Link from "next/link";
import { Clock, Facebook, Instagram, MapPin, Phone } from "lucide-react";

import { siteConfig } from "@/config/site";
import {
  footerCompanyNav,
  footerExploreNav,
  footerLegalNav,
  footerServiceNav,
} from "@/config/nav";
import { Separator } from "@/components/ui/separator";

/**
 * Site footer. Contact details shown here are seed defaults; once the
 * CMS lands (Phase 5) they are read from SiteSetting so the owner can
 * edit them without code changes. Legal-page links join in Phase 4+
 * when those routes exist — we never render dead links.
 */
export function SiteFooter() {
  return (
    <footer className="border-t bg-coffee-deep text-cream dark:bg-card">
      <div className="container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-3">
          <p className="font-display text-xl font-semibold">
            {siteConfig.name}
          </p>
          <p className="text-sm leading-relaxed text-cream/70">
            Die Aromen Dubais trifft die Tradition der türkischen Küche —
            100&nbsp;% halal, mit Liebe zubereitet.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <a
              href={siteConfig.links.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="rounded-full border border-cream/20 p-2 transition-colors hover:border-gold hover:text-gold"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={siteConfig.links.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="rounded-full border border-cream/20 p-2 transition-colors hover:border-gold hover:text-gold"
            >
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold">
            Entdecken
          </p>
          <ul className="space-y-2 text-sm text-cream/80">
            {footerExploreNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-gold"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
          <p className="pt-2 text-sm font-semibold uppercase tracking-wider text-gold">
            Service
          </p>
          <ul className="space-y-2 text-sm text-cream/80">
            {footerServiceNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-gold"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold">
            Kontakt
          </p>
          <address className="space-y-2 text-sm not-italic text-cream/80">
            <p className="flex items-start gap-2">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                aria-hidden
              />
              Königsallee 42, 40212 Düsseldorf
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-gold" aria-hidden />
              <a href="tel:+4921155501234" className="hover:text-gold">
                +49 211 555 012 34
              </a>
            </p>
          </address>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold">
            Öffnungszeiten
          </p>
          <ul className="space-y-2 text-sm text-cream/80">
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-gold" aria-hidden />
              Mo–Do: 11:30 – 22:30 Uhr
            </li>
            <li className="pl-6">Fr–Sa: 11:30 – 23:30 Uhr</li>
            <li className="pl-6">So & Feiertage: 12:00 – 22:00 Uhr</li>
          </ul>
          <p className="pt-1 text-sm text-cream/70">
            <Link
              href="/register"
              className="underline-offset-4 hover:text-gold hover:underline"
            >
              Jetzt Konto erstellen
            </Link>{" "}
            und Treuepunkte sammeln.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold">
            Unternehmen
          </p>
          <ul className="space-y-2 text-sm text-cream/80">
            {footerCompanyNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-gold"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Separator className="bg-cream/10" />
      <div className="container flex flex-col items-center gap-4 py-6 text-xs text-cream/60">
        <nav
          aria-label="Rechtliches"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        >
          {footerLegalNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-gold"
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="flex w-full flex-col items-center justify-between gap-2 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Alle Rechte
            vorbehalten.
          </p>
          <p>Halal-zertifiziert · Lieferung · Abholung · Reservierung</p>
        </div>
      </div>
    </footer>
  );
}
