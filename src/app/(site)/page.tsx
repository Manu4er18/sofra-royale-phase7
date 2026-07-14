import Link from "next/link";
import { Sparkles } from "lucide-react";

import {
  CategoriesSection,
  ChefPicksSection,
  DailySpecialsSection,
  FeaturedDubaiSection,
  FeaturedTurkishSection,
  HeroSection,
  PopularSection,
  ReviewsSection,
} from "@/components/home/home-sections";
import { FadeIn } from "@/components/shared/fade-in";
import { JsonLd } from "@/components/shared/json-ld";
import { restaurantJsonLd } from "@/lib/seo";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Live featured/popular data from the database on every request.
export const dynamic = "force-dynamic";

/**
 * Homepage — every product section below is database-driven; curation
 * happens via product flags (featured/popular/chef/special) that the
 * admin dashboard manages in Phase 5.
 */
export default async function HomePage() {
  const contactSetting = await db.siteSetting.findUnique({
    where: { key: "restaurant.contact" },
  });
  const contact =
    contactSetting && typeof contactSetting.value === "object"
      ? (contactSetting.value as Record<string, string>)
      : undefined;

  return (
    <>
      <JsonLd data={restaurantJsonLd(contact)} />
      <HeroSection />
      <CategoriesSection />
      <FeaturedDubaiSection />
      <ChefPicksSection />
      <FeaturedTurkishSection />
      <DailySpecialsSection />
      <PopularSection />
      <ReviewsSection />

      {/* Loyalty CTA */}
      <section className="container py-16">
        <FadeIn>
          <Card className="overflow-hidden border-gold/30 bg-gradient-to-br from-card via-card to-gold-muted/40">
            <CardContent className="flex flex-col items-center gap-6 p-10 text-center sm:p-14">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-premium">
                <Sparkles className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="max-w-xl text-balance font-display text-3xl font-semibold">
                Werden Sie Teil des Sofra-Royale-Kreises
              </h2>
              <p className="max-w-lg text-muted-foreground">
                Konto erstellen, Lieblingsgerichte speichern und mit jeder
                Bestellung Treuepunkte sammeln — die Online-Bestellung mit
                Lieferung startet in Kürze.
              </p>
              <Button size="lg" variant="gold" asChild>
                <Link href="/register">Kostenlos registrieren</Link>
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </section>
    </>
  );
}
